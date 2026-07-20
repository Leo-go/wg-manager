#!/bin/bash
# Safe diagnostic: dump Reality inbound settings WITHOUT private keys.
# Run on BOTH working and broken VPS, then compare outputs.
set -euo pipefail

echo "=== Host ==="
hostname -I | awk '{print $1}'
date -u
timedatectl 2>/dev/null | head -5 || true
echo ""

echo "=== Xray version ==="
/usr/local/bin/xray version 2>/dev/null || xray version 2>/dev/null || true
echo ""

echo "=== Listening ==="
ss -tlnp | grep -E ':(443|2053|8443)\s' || true
echo ""

echo "=== Config (secrets redacted) ==="
CFG=""
for p in /usr/local/etc/xray/config.json /usr/local/x-ui/bin/config.json; do
  if [ -f "$p" ]; then CFG="$p"; break; fi
done

if [ -z "$CFG" ]; then
  echo "No config found"
  exit 1
fi

echo "Config path: $CFG"
python3 - <<'PY' "$CFG"
import json,sys
cfg=json.load(open(sys.argv[1]))
for ib in cfg.get("inbounds",[]):
    if ib.get("protocol")!="vless":
        continue
    ss=ib.get("streamSettings",{})
    rs=ss.get("realitySettings",{}) or {}
    clients=ib.get("settings",{}).get("clients",[])
    print({
      "port": ib.get("port"),
      "listen": ib.get("listen"),
      "network": ss.get("network"),
      "security": ss.get("security"),
      "dest": rs.get("dest") or rs.get("target"),
      "serverNames": rs.get("serverNames"),
      "shortIds": rs.get("shortIds"),
      "hasPrivateKey": bool(rs.get("privateKey")),
      "clientCount": len(clients),
      "flow": (clients[0].get("flow") if clients else None),
      "sniffing": ib.get("sniffing"),
    })
PY

echo ""
echo "=== x25519 sample (new keys, for format only) ==="
/usr/local/bin/xray x25519 2>&1 | sed 's/: .*/: <redacted>/' || true
echo ""
echo "Done. Paste this output into chat (no passwords/private keys included)."
