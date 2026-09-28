#!/bin/bash
# On CDN Origin: accept packet-up GET + X-Data headers (Yandex POST is 405).
# Keeps padding/path so existing OPTIONS-body clients on other POPs still match.
# Usage (root on Origin): bash patch-cdn-origin-get-uplink.sh
set -euo pipefail
export PATH="/usr/local/bin:$PATH"

CONFIG="${XRAY_CONFIG:-/usr/local/etc/xray/config.json}"

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: run as root" >&2
  exit 1
fi
if [ ! -f "$CONFIG" ]; then
  echo "ERROR: config not found: $CONFIG" >&2
  exit 1
fi

BACKUP="${CONFIG}.bak.$(date +%Y%m%d%H%M%S)"
cp -a "$CONFIG" "$BACKUP"
echo "Backup: $BACKUP"

python3 - "$CONFIG" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    cfg = json.load(f)

changed = False
for inbound in cfg.get("inbounds") or []:
    if not isinstance(inbound, dict):
        continue
    stream = inbound.get("streamSettings") or {}
    xhttp = stream.get("xhttpSettings")
    if not isinstance(xhttp, dict):
        continue
    xhttp["mode"] = "packet-up"
    xhttp["uplinkDataPlacement"] = "auto"
    xhttp["uplinkDataKey"] = xhttp.get("uplinkDataKey") or "X-Data"
    xhttp["serverMaxHeaderBytes"] = 262144
    inbound["streamSettings"] = stream
    stream["xhttpSettings"] = xhttp
    changed = True
    print("patched inbound tag:", inbound.get("tag"))

if not changed:
    raise SystemExit("ERROR: no xhttpSettings inbound found")

with open(path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
PY

if ! xray run -test -c "$CONFIG"; then
  echo "ERROR: xray -test failed, restoring $BACKUP" >&2
  cp -a "$BACKUP" "$CONFIG"
  exit 1
fi
systemctl restart xray
sleep 1
if ! systemctl is-active --quiet xray; then
  echo "ERROR: xray failed, restore $BACKUP" >&2
  journalctl -u xray -n 40 --no-pager >&2
  exit 1
fi
echo "OK: origin accepts GET header/cookie/body packet-up"
