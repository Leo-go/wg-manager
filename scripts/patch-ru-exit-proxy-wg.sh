#!/bin/bash
# Point RU xray outbound "exit-proxy" at WireGuard peer 10.66.66.1:EXIT_PORT
# without reinstalling the relay or wiping clients.
#
# Requires: wg-home0 up (see setup-wg-home0.sh), exit Reality inbound on :10443.
# Usage (on RU as root):
#   EXIT_PORT=10443 bash patch-ru-exit-proxy-wg.sh
set -euo pipefail

CFG="${XRAY_CONFIG:-/usr/local/etc/xray/config.json}"
PROXY_ADDR="${PROXY_ADDR:-10.66.66.1}"
EXIT_PORT="${EXIT_PORT:-10443}"
XRAY_BIN="${XRAY_BIN:-/usr/local/bin/xray}"
[ -x "$XRAY_BIN" ] || XRAY_BIN="$(command -v xray)"

if [ ! -f "$CFG" ]; then
  echo "ERROR: $CFG not found" >&2
  exit 1
fi

if ! ip link show wg-home0 >/dev/null 2>&1; then
  echo "ERROR: wg-home0 is down — run setup-wg-home0.sh first" >&2
  exit 1
fi

python3 - <<PY
import json, shutil, time
from pathlib import Path

cfg_path = Path("${CFG}")
addr = "${PROXY_ADDR}"
port = int("${EXIT_PORT}")
cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
found = False
for ob in cfg.get("outbounds", []):
    if ob.get("tag") != "exit-proxy":
        continue
    found = True
    settings = ob.setdefault("settings", {})
    vnext = settings.get("vnext")
    if isinstance(vnext, list) and vnext:
        vnext[0]["address"] = addr
        vnext[0]["port"] = port
    else:
        raise SystemExit("ERROR: exit-proxy has no settings.vnext[0]")
    break
if not found:
    raise SystemExit("ERROR: outbound tag exit-proxy not found")

bak = f"{cfg_path}.pre-wg-proxy.{int(time.time())}"
shutil.copy2(cfg_path, bak)
print(f"Backed up → {bak}")
cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
print(f"exit-proxy → {addr}:{port}")
PY

"$XRAY_BIN" run -test -c "$CFG"
systemctl restart xray
echo "OK: exit-proxy now dials ${PROXY_ADDR}:${EXIT_PORT} over wg-home0"
