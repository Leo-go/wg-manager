#!/bin/bash
# Rebuild a correct VLESS Reality URL from the live Xray config on this VPS.
# Run as root on the VPN server. Prints one vless:// line — import into Hiddify.
set -euo pipefail

CFG=/usr/local/etc/xray/config.json
if [ ! -f "$CFG" ]; then
  echo "ERROR: $CFG not found" >&2
  exit 1
fi

eval "$(python3 - <<'PY'
import json, urllib.parse
cfg = json.load(open("/usr/local/etc/xray/config.json"))
ib = next(i for i in cfg["inbounds"] if i.get("protocol") == "vless")
rs = ib["streamSettings"]["realitySettings"]
client = ib["settings"]["clients"][0]
sni = (rs.get("serverNames") or [""])[0]
sid = (rs.get("shortIds") or [""])[0]
print(f"UUID={client['id']!r}")
print(f"PORT={ib['port']}")
print(f"SNI={sni!r}")
print(f"SID={sid!r}")
print(f"PRIV={rs['privateKey']!r}")
PY
)"

PUBLIC_IP=$(curl -s --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')
PBK=$(xray x25519 -i "$PRIV" 2>&1 | grep -iE '^Password' | awk '{print $NF}' | tr -d '\r')
if [ -z "$PBK" ]; then
  PBK=$(xray x25519 -i "$PRIV" 2>&1 | grep -iE 'Public' | awk '{print $NF}' | tr -d '\r')
fi

if [ -z "$PBK" ] || [ -z "$UUID" ] || [ -z "$SID" ]; then
  echo "ERROR: missing UUID/SID/PBK" >&2
  exit 1
fi

# Do NOT use Hash32 as pbk
echo "Verified pbk (Password/PublicKey): $PBK" >&2
echo "IP=$PUBLIC_IP port=$PORT sni=$SNI sid=$SID" >&2
echo "vless://${UUID}@${PUBLIC_IP}:${PORT}?encryption=none&security=reality&sni=${SNI}&fp=chrome&pbk=${PBK}&sid=${SID}&type=tcp&packetEncoding=xudp#WG-Manager-fixed"
