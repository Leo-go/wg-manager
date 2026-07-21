#!/bin/bash
# Add (or refresh) VLESS Reality + xHTTP inbound on an EXIT VPS for RU relays.
# Does NOT wipe the main :443 Reality inbound.
# Emits machine-readable:
#   RELAY_EXIT_UUID=...
#   RELAY_EXIT_PBK=...
#   RELAY_EXIT_SID=...
#   RELAY_EXIT_PORT=...
#   RELAY_EXIT_PATH=...
#   RELAY_EXIT_SNI=...

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/usr/local/bin:$PATH"

RELAY_PORT="${1:-10443}"
RELAY_SNI="${2:-www.microsoft.com}"
RELAY_PATH="${3:-/wg-relay}"
CONFIG="/usr/local/etc/xray/config.json"

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

if ! command -v xray >/dev/null 2>&1; then
  echo "ERROR: xray not installed — run main WG Manager setup first" >&2
  exit 1
fi

if [ ! -f "$CONFIG" ]; then
  echo "ERROR: missing $CONFIG" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq python3
fi

UUID=$(xray uuid)
X25519_OUTPUT=$(xray x25519 2>&1)
PRIVATE_KEY=$(printf '%s\n' "$X25519_OUTPUT" | grep -iE 'Private' | head -n 1 | awk '{print $NF}' | tr -d '\r')
PUBLIC_KEY=$(printf '%s\n' "$X25519_OUTPUT" | grep -iE '^Password' | head -n 1 | awk '{print $NF}' | tr -d '\r')
if [ -z "$PUBLIC_KEY" ]; then
  PUBLIC_KEY=$(printf '%s\n' "$X25519_OUTPUT" | grep -iE 'Public' | head -n 1 | awk '{print $NF}' | tr -d '\r')
fi
if [ -n "$PRIVATE_KEY" ]; then
  DERIVED=$(xray x25519 -i "$PRIVATE_KEY" 2>&1 || true)
  DERIVED_PUB=$(printf '%s\n' "$DERIVED" | grep -iE '^(Password|Public)' | head -n 1 | awk '{print $NF}' | tr -d '\r')
  if [ -n "$DERIVED_PUB" ]; then PUBLIC_KEY="$DERIVED_PUB"; fi
fi
SHORT_ID=$(openssl rand -hex 4)

python3 - "$CONFIG" "$RELAY_PORT" "$UUID" "$PRIVATE_KEY" "$RELAY_SNI" "$SHORT_ID" "$RELAY_PATH" <<'PY'
import json, sys
path, port, uuid, priv, sni, sid, xpath = sys.argv[1:8]
port = int(port)
with open(path, "r", encoding="utf-8") as f:
    cfg = json.load(f)
inbounds = cfg.get("inbounds") or []
# drop previous wg-relay inbound(s)
inbounds = [
    ib for ib in inbounds
    if ib.get("tag") != "wg-relay-exit"
    and not (ib.get("port") == port and ib.get("protocol") == "vless"
             and (ib.get("streamSettings") or {}).get("network") in ("xhttp", "splithttp"))
]
inbound = {
    "tag": "wg-relay-exit",
    "listen": "0.0.0.0",
    "port": port,
    "protocol": "vless",
    "settings": {
        "clients": [{"id": uuid}],
        "decryption": "none"
    },
    "streamSettings": {
        "network": "xhttp",
        "security": "reality",
        "realitySettings": {
            "show": False,
            "dest": f"{sni}:443",
            "serverNames": [sni],
            "privateKey": priv,
            "shortIds": ["", sid]
        },
        "xhttpSettings": {
            "path": xpath,
            "mode": "auto"
        }
    }
}
inbounds.append(inbound)
cfg["inbounds"] = inbounds
if not cfg.get("outbounds"):
    cfg["outbounds"] = [{"protocol": "freedom", "tag": "direct"}]
with open(path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print("Merged relay exit inbound into", path)
PY

xray run -test -c "$CONFIG"

if command -v ufw >/dev/null 2>&1; then
  ufw allow "${RELAY_PORT}"/tcp || true
fi

systemctl restart xray
sleep 1
if ! systemctl is-active --quiet xray; then
  echo "ERROR: xray failed to start after adding relay inbound" >&2
  journalctl -u xray -n 30 --no-pager >&2
  exit 1
fi

echo "RELAY_EXIT_UUID=${UUID}"
echo "RELAY_EXIT_PBK=${PUBLIC_KEY}"
echo "RELAY_EXIT_SID=${SHORT_ID}"
echo "RELAY_EXIT_PORT=${RELAY_PORT}"
echo "RELAY_EXIT_PATH=${RELAY_PATH}"
echo "RELAY_EXIT_SNI=${RELAY_SNI}"
echo "RELAY_EXIT_READY=1"
