#!/bin/bash
# Merge Xray HandlerService API (127.0.0.1:10085) into an existing RU relay config
# so xray-client-manager.sh can hot-add/remove clients without restarting.
#
# Safe: backs up config, runs `xray run -test`, then restarts once.
# Usage (on RU as root): bash patch-ru-xray-api.sh
set -euo pipefail

CFG="${XRAY_CONFIG:-/usr/local/etc/xray/config.json}"
API_PORT="${XRAY_API_PORT:-10085}"
XRAY_BIN="${XRAY_BIN:-/usr/local/bin/xray}"
[ -x "$XRAY_BIN" ] || XRAY_BIN="$(command -v xray)"

if [ ! -f "$CFG" ]; then
  echo "ERROR: $CFG not found" >&2
  exit 1
fi

python3 - <<PY
import json, shutil, time
from pathlib import Path

cfg_path = Path("${CFG}")
api_port = int("${API_PORT}")
cfg = json.loads(cfg_path.read_text(encoding="utf-8"))

changed = False
api = cfg.get("api")
if not isinstance(api, dict) or api.get("tag") != "api":
    cfg["api"] = {
        "tag": "api",
        "services": ["HandlerService", "StatsService"],
    }
    changed = True

inbounds = cfg.setdefault("inbounds", [])
has_api_ib = any(
    ib.get("tag") == "api" or (
        ib.get("protocol") == "dokodemo-door"
        and ib.get("port") == api_port
    )
    for ib in inbounds
)
if not has_api_ib:
    inbounds.insert(
        0,
        {
            "tag": "api",
            "listen": "127.0.0.1",
            "port": api_port,
            "protocol": "dokodemo-door",
            "settings": {"address": "127.0.0.1"},
        },
    )
    changed = True

# routing rule so API traffic hits the api outbound (optional but recommended)
routing = cfg.setdefault("routing", {})
rules = routing.setdefault("rules", [])
has_api_rule = any(
    r.get("inboundTag") == ["api"] or r.get("inboundTag") == "api"
    for r in rules
    if isinstance(r, dict)
)
if not has_api_rule:
    rules.insert(
        0,
        {
            "type": "field",
            "inboundTag": ["api"],
            "outboundTag": "api",
        },
    )
    changed = True

outbounds = cfg.setdefault("outbounds", [])
has_api_out = any(o.get("tag") == "api" for o in outbounds)
if not has_api_out:
    outbounds.append({"tag": "api", "protocol": "freedom", "settings": {}})
    changed = True

if not changed:
    print("OK: API already present — no changes")
    raise SystemExit(0)

bak = f"{cfg_path}.pre-api.{int(time.time())}"
shutil.copy2(cfg_path, bak)
print(f"Backed up → {bak}")
cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {cfg_path}")
PY

"$XRAY_BIN" run -test -c "$CFG"
systemctl restart xray
echo "OK: Xray API listening on 127.0.0.1:${API_PORT} (one restart applied)"
