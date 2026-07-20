#!/bin/bash
# One-shot: rebuild VLESS Reality + local self-test + print Hiddify URLs.
# Run on the VPS as root:
#   bash nuke-and-fix-reality.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/usr/local/bin:$PATH"

echo "=== nuke-and-fix-reality ==="
systemctl stop xray 2>/dev/null || true
pkill -f xray || true
sleep 1

# Ensure xray exists
if ! command -v xray >/dev/null 2>&1; then
  bash <(curl -Ls https://raw.githubusercontent.com/XTLS/Xray-install/main/install-release.sh)
fi

UUID=$(xray uuid)
KEYS=$(xray x25519 2>&1)
PRIV=$(printf '%s\n' "$KEYS" | grep -iE 'Private' | head -1 | awk '{print $NF}' | tr -d '\r')
PBK=$(printf '%s\n' "$KEYS" | grep -iE '^Password' | head -1 | awk '{print $NF}' | tr -d '\r')
if [ -z "$PBK" ]; then
  PBK=$(printf '%s\n' "$KEYS" | grep -iE 'Public' | head -1 | awk '{print $NF}' | tr -d '\r')
fi
# Prefer derive
DER=$(xray x25519 -i "$PRIV" 2>&1 || true)
DER_PBK=$(printf '%s\n' "$DER" | grep -iE '^Password' | head -1 | awk '{print $NF}' | tr -d '\r')
[ -n "$DER_PBK" ] && PBK="$DER_PBK"

SID443=$(openssl rand -hex 8)
SID2053=$(openssl rand -hex 2)
IP=$(curl -s --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')

echo "UUID=$UUID"
echo "PBK=$PBK"
echo "SID443=$SID443 SID2053=$SID2053"
echo "IP=$IP"

# Dest reachability
for d in www.microsoft.com dl.google.com www.apple.com; do
  if timeout 5 bash -c "echo >/dev/tcp/${d}/443" 2>/dev/null; then
    echo "DEST_OK $d"
  else
    echo "DEST_FAIL $d"
  fi
done

mkdir -p /usr/local/etc/xray
cat > /usr/local/etc/xray/config.json << EOF
{
  "log": { "loglevel": "warning" },
  "dns": {
    "servers": ["1.1.1.1", "8.8.8.8"],
    "queryStrategy": "UseIPv4"
  },
  "inbounds": [
    {
      "tag": "vless-reality-443",
      "listen": "0.0.0.0",
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [ { "id": "$UUID" } ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "www.microsoft.com:443",
          "xver": 0,
          "serverNames": ["www.microsoft.com", "microsoft.com"],
          "privateKey": "$PRIV",
          "shortIds": ["", "$SID443"]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    },
    {
      "tag": "vless-reality-2053",
      "listen": "0.0.0.0",
      "port": 2053,
      "protocol": "vless",
      "settings": {
        "clients": [ { "id": "$UUID" } ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "www.apple.com:443",
          "xver": 0,
          "serverNames": ["www.apple.com"],
          "privateKey": "$PRIV",
          "shortIds": ["", "$SID2053"]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    }
  ],
  "outbounds": [
    { "protocol": "freedom", "tag": "direct" },
    { "protocol": "blackhole", "tag": "block" }
  ]
}
EOF

# BBR
cat > /etc/sysctl.d/99-wg-manager.conf << 'SYSCTL'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_slow_start_after_idle = 0
SYSCTL
sysctl -p /etc/sysctl.d/99-wg-manager.conf >/dev/null 2>&1 || true

xray run -test -c /usr/local/etc/xray/config.json
systemctl restart xray
systemctl enable xray
sleep 1
systemctl is-active xray
ss -tlnp | grep -E ':(443|2053)\s' || (echo "BIND FAIL"; journalctl -u xray -n 30 --no-pager; exit 1)

# --- Local Reality self-test via temporary client ---
cat > /tmp/xray-client-test.json << EOF
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 11080,
      "protocol": "socks",
      "settings": { "udp": true }
    }
  ],
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "127.0.0.1",
            "port": 443,
            "users": [
              {
                "id": "$UUID",
                "encryption": "none"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "serverName": "www.microsoft.com",
          "fingerprint": "chrome",
          "password": "$PBK",
          "shortId": "$SID443",
          "spiderX": "/"
        }
      }
    }
  ]
}
EOF

# Newer xray may use publicKey instead of password in client — try both fields via publicKey alias
# Xray 26 client Reality uses "password" for the server public key in JSON.

pkill -f 'xray run -c /tmp/xray-client-test.json' 2>/dev/null || true
xray run -c /tmp/xray-client-test.json >/tmp/xray-client-test.log 2>&1 &
CLIENT_PID=$!
sleep 2

SELFTEST="FAIL"
if curl -sS --max-time 15 -x socks5h://127.0.0.1:11080 https://1.1.1.1/cdn-cgi/trace | head -5; then
  SELFTEST="OK"
  echo "=== LOCAL_SELFTEST=OK (Reality works on this VPS loopback) ==="
else
  echo "=== LOCAL_SELFTEST=FAIL ==="
  cat /tmp/xray-client-test.log || true
  # retry with publicKey field name if needed
  python3 - <<'PY'
import json
from pathlib import Path
p=Path('/tmp/xray-client-test.json')
c=json.loads(p.read_text())
rs=c['outbounds'][0]['streamSettings']['realitySettings']
if 'password' in rs:
    rs['publicKey']=rs.pop('password')
p.write_text(json.dumps(c, indent=2))
print('rewrote client to use publicKey')
PY
  kill "$CLIENT_PID" 2>/dev/null || true
  sleep 1
  xray run -c /tmp/xray-client-test.json >/tmp/xray-client-test.log 2>&1 &
  CLIENT_PID=$!
  sleep 2
  if curl -sS --max-time 15 -x socks5h://127.0.0.1:11080 https://1.1.1.1/cdn-cgi/trace | head -5; then
    SELFTEST="OK"
    echo "=== LOCAL_SELFTEST=OK (publicKey field) ==="
  else
    echo "=== LOCAL_SELFTEST=FAIL again ==="
    cat /tmp/xray-client-test.log || true
  fi
fi
kill "$CLIENT_PID" 2>/dev/null || true

URL443="vless://${UUID}@${IP}:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&pbk=${PBK}&sid=${SID443}&type=tcp&packetEncoding=xudp#WG-443-ms"
URL2053="vless://${UUID}@${IP}:2053?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=${PBK}&sid=${SID2053}&type=tcp&packetEncoding=xudp#WG-2053-apple"

echo ""
echo "========== IMPORT INTO HIDDIFY (delete old profiles first) =========="
echo "$URL443"
echo "$URL2053"
echo "========== LOCAL_SELFTEST=${SELFTEST} =========="
echo "If LOCAL_SELFTEST=OK but Hiddify still times out → this IP is blocked/filtered by DPI (need new VPS IP or RU relay)."
echo "If LOCAL_SELFTEST=FAIL → server Reality is broken; paste this full output back."
echo "xray version: $(xray version 2>&1 | head -1)"
