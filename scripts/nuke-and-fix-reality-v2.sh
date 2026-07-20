#!/bin/bash
# Rebuild Reality on known-good Xray 26.3.27 + local self-test.
# Usage (from WSL project dir):
#   sed 's/\r$//' scripts/nuke-and-fix-reality-v2.sh | ssh root@IP 'bash -s'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/usr/local/bin:$PATH"

echo "=== nuke-and-fix-reality-v2 ==="
echo "Current: $(xray version 2>&1 | head -1 || true)"

systemctl stop xray 2>/dev/null || true
pkill -f xray || true
sleep 1

echo "=== Installing Xray v26.3.27 (stable for Reality) ==="
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install --version 26.3.27
export PATH="/usr/local/bin:$PATH"
echo "Now: $(xray version 2>&1 | head -1)"

UUID=$(xray uuid)
KEYS=$(xray x25519 2>&1)
echo "Raw x25519:"
echo "$KEYS"
PRIV=$(printf '%s\n' "$KEYS" | grep -iE 'Private' | head -1 | awk '{print $NF}' | tr -d '\r')
PBK=$(xray x25519 -i "$PRIV" 2>&1 | grep -iE '^Password|^Public' | head -1 | awk '{print $NF}' | tr -d '\r')
SID=$(openssl rand -hex 8)
IP=$(curl -s --max-time 10 https://api.ipify.org)

echo "UUID=$UUID"
echo "PRIV(len)=${#PRIV} PBK=$PBK SID=$SID IP=$IP"

# Primary: microsoft on 443 only (simplify — one inbound first)
mkdir -p /usr/local/etc/xray
cat > /usr/local/etc/xray/config.json << EOF
{
  "log": { "loglevel": "debug" },
  "dns": {
    "servers": ["1.1.1.1", "8.8.8.8"],
    "queryStrategy": "UseIPv4"
  },
  "inbounds": [
    {
      "listen": "0.0.0.0",
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "$UUID",
            "flow": "xtls-rprx-vision"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": true,
          "dest": "www.microsoft.com:443",
          "serverNames": ["www.microsoft.com"],
          "privateKey": "$PRIV",
          "shortIds": ["", "$SID"]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"]
      }
    }
  ],
  "outbounds": [
    { "protocol": "freedom", "tag": "direct" }
  ]
}
EOF

xray run -test -c /usr/local/etc/xray/config.json
systemctl restart xray
sleep 1
systemctl is-active xray
ss -tlnp | grep ':443 ' || { journalctl -u xray -n 40 --no-pager; exit 1; }

# Client test — Xray 26 uses password (= server public key) in outbound Reality
make_client() {
  local keyfield="$1"
  cat > /tmp/xray-client-test.json << EOF
{
  "log": { "loglevel": "debug" },
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
        "vnext": [{
          "address": "127.0.0.1",
          "port": 443,
          "users": [{
            "id": "$UUID",
            "encryption": "none",
            "flow": "xtls-rprx-vision"
          }]
        }]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "serverName": "www.microsoft.com",
          "fingerprint": "chrome",
          "$keyfield": "$PBK",
          "shortId": "$SID",
          "spiderX": "/"
        }
      }
    }
  ]
}
EOF
}

SELFTEST=FAIL
for keyfield in password publicKey; do
  echo "=== Trying client key field: $keyfield ==="
  pkill -f 'xray.*xray-client-test' 2>/dev/null || true
  sleep 1
  make_client "$keyfield"
  if ! xray run -test -c /tmp/xray-client-test.json; then
    echo "client config invalid for $keyfield"
    continue
  fi
  xray run -c /tmp/xray-client-test.json >/tmp/xray-client-test.log 2>&1 &
  CPID=$!
  sleep 2
  if curl -sS --max-time 20 -x socks5h://127.0.0.1:11080 https://www.cloudflare.com/cdn-cgi/trace | tee /tmp/curl-trace.txt | grep -q '^ip='; then
    SELFTEST=OK
    echo "LOCAL_SELFTEST=OK keyfield=$keyfield"
    kill "$CPID" 2>/dev/null || true
    break
  fi
  echo "curl failed for $keyfield:"
  cat /tmp/curl-trace.txt 2>/dev/null || true
  echo "--- client log ---"
  tail -n 40 /tmp/xray-client-test.log || true
  echo "--- server journal ---"
  journalctl -u xray -n 40 --no-pager || true
  kill "$CPID" 2>/dev/null || true
done

# If vision failed, retry WITHOUT flow (guide says empty flow is more stable)
if [ "$SELFTEST" != "OK" ]; then
  echo "=== Retry WITHOUT flow (empty) ==="
  python3 - <<'PY'
import json
from pathlib import Path
p=Path('/usr/local/etc/xray/config.json')
c=json.loads(p.read_text())
for ib in c['inbounds']:
  for cl in ib['settings']['clients']:
    cl.pop('flow', None)
p.write_text(json.dumps(c, indent=2))
print('removed flow from server')
PY
  systemctl restart xray
  sleep 1
  for keyfield in password publicKey; do
    pkill -f 'xray.*xray-client-test' 2>/dev/null || true
    sleep 1
    make_client "$keyfield"
    python3 - <<PY
import json
from pathlib import Path
p=Path('/tmp/xray-client-test.json')
c=json.loads(p.read_text())
for u in c['outbounds'][0]['settings']['vnext'][0]['users']:
  u.pop('flow', None)
# ensure only one key field
rs=c['outbounds'][0]['streamSettings']['realitySettings']
pbk=rs.get('password') or rs.get('publicKey')
rs.clear()
rs.update({
  'serverName': 'www.microsoft.com',
  'fingerprint': 'chrome',
  '$keyfield': pbk,
  'shortId': '''$SID''',
  'spiderX': '/',
})
p.write_text(json.dumps(c, indent=2))
PY
    xray run -c /tmp/xray-client-test.json >/tmp/xray-client-test.log 2>&1 &
    CPID=$!
    sleep 2
    if curl -sS --max-time 20 -x socks5h://127.0.0.1:11080 https://www.cloudflare.com/cdn-cgi/trace | tee /tmp/curl-trace.txt | grep -q '^ip='; then
      SELFTEST=OK
      echo "LOCAL_SELFTEST=OK no-flow keyfield=$keyfield"
      kill "$CPID" 2>/dev/null || true
      break
    fi
    echo "no-flow curl failed $keyfield"
    tail -n 30 /tmp/xray-client-test.log || true
    journalctl -u xray -n 30 --no-pager || true
    kill "$CPID" 2>/dev/null || true
  done
fi

# Set production log level
python3 - <<'PY'
import json
from pathlib import Path
p=Path('/usr/local/etc/xray/config.json')
c=json.loads(p.read_text())
c['log']={'loglevel':'warning'}
rs=c['inbounds'][0]['streamSettings']['realitySettings']
rs['show']=False
p.write_text(json.dumps(c, indent=2))
PY
systemctl restart xray

# Detect if flow present for URL
FLOW_Q=""
if python3 -c "import json;c=json.load(open('/usr/local/etc/xray/config.json'));print(c['inbounds'][0]['settings']['clients'][0].get('flow',''))" | grep -q vision; then
  FLOW_Q="&flow=xtls-rprx-vision"
fi

URL="vless://${UUID}@${IP}:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&pbk=${PBK}&sid=${SID}&type=tcp${FLOW_Q}&packetEncoding=xudp#WG-443"

echo ""
echo "========== LOCAL_SELFTEST=${SELFTEST} =========="
echo "========== IMPORT INTO HIDDIFY =========="
echo "$URL"
echo "=========================================="
echo "xray: $(xray version 2>&1 | head -1)"
if [ "$SELFTEST" != "OK" ]; then
  echo "SELFTEST still FAIL — paste full output above back to chat."
  exit 1
fi
