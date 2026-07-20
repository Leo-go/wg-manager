#!/bin/bash
# Diagnose + fix Reality when LOCAL_SELFTEST fails.
# sed 's/\r$//' scripts/diagnose-fix-reality.sh | ssh root@IP 'bash -s'
set -euo pipefail
export PATH="/usr/local/bin:$PATH"
export DEBIAN_FRONTEND=noninteractive

echo "=== diagnose-fix-reality ==="
echo "xray: $(xray version 2>&1 | head -1)"
echo "date: $(date -u)"
IP=$(curl -s --max-time 10 https://api.ipify.org)
echo "IP=$IP"

pick_dest() {
  local candidates=(
    "www.cloudflare.com"
    "www.apple.com"
    "gateway.icloud.com"
    "www.microsoft.com"
    "dl.google.com"
    "www.yahoo.com"
    "www.samsung.com"
  )
  for d in "${candidates[@]}"; do
    echo -n "TLS probe $d:443 ... "
    if timeout 8 openssl s_client -connect "${d}:443" -servername "${d}" -brief </dev/null 2>/tmp/ossl-"$d".txt; then
      if grep -qiE 'CONNECTION ESTABLISHED|Protocol version' /tmp/ossl-"$d".txt 2>/dev/null \
        || grep -qi 'Verify return code' /tmp/ossl-"$d".txt 2>/dev/null; then
        # Prefer TLS1.3
        if grep -qiE 'TLSv1\.3|TLS 1\.3' /tmp/ossl-"$d".txt || true; then
          echo "OK"
          echo "$d"
          return 0
        fi
        echo "OK (tls)"
        echo "$d"
        return 0
      fi
    fi
    # fallback: any successful tcp+ssl handshake exit 0 already handled
    if timeout 5 bash -c "echo >/dev/tcp/${d}/443" 2>/dev/null; then
      echo "TCP_OK_TRY $d"
      echo "$d"
      return 0
    fi
    echo "FAIL"
  done
  return 1
}

echo "=== Probing Reality dest candidates ==="
DEST=""
for d in www.cloudflare.com www.apple.com gateway.icloud.com www.microsoft.com dl.google.com www.yahoo.com www.samsung.com; do
  echo "--- $d ---"
  if timeout 10 openssl s_client -connect "${d}:443" -servername "${d}" </dev/null 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null; then
    echo "DEST_CANDIDATE_OK $d"
    if [ -z "$DEST" ]; then DEST="$d"; fi
  else
    echo "DEST_CANDIDATE_FAIL $d"
  fi
done

if [ -z "$DEST" ]; then
  echo "FATAL: no TLS dest reachable from this VPS — Reality cannot work"
  exit 1
fi
echo "SELECTED_DEST=$DEST"

UUID=$(xray uuid)
PRIV=$(xray x25519 2>&1 | tee /tmp/x25519.txt | grep -iE 'Private' | head -1 | awk '{print $NF}' | tr -d '\r')
PBK=$(xray x25519 -i "$PRIV" 2>&1 | tee /tmp/x25519-i.txt | grep -iE '^Password|^Public' | head -1 | awk '{print $NF}' | tr -d '\r')
SID=$(openssl rand -hex 8)
echo "UUID=$UUID PBK=$PBK SID=$SID"
cat /tmp/x25519.txt

systemctl stop xray 2>/dev/null || true
pkill -f xray || true
sleep 1

# Minimal server config — no sniffing, no flow, dest=SELECTED
cat > /usr/local/etc/xray/config.json << EOF
{
  "log": { "loglevel": "debug" },
  "inbounds": [
    {
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
          "show": true,
          "dest": "${DEST}:443",
          "serverNames": [ "${DEST}" ],
          "privateKey": "${PRIV}",
          "shortIds": [ "", "${SID}" ]
        }
      }
    }
  ],
  "outbounds": [ { "protocol": "freedom", "tag": "direct" } ]
}
EOF

echo "=== server config ==="
cat /usr/local/etc/xray/config.json
xray run -test -c /usr/local/etc/xray/config.json
systemctl start xray
sleep 1
systemctl is-active xray
ss -tlnp | grep ':443 '

# Build client — try address 127.0.0.1 AND public IP; key fields password/publicKey
run_selftest() {
  local addr="$1"
  local keyfield="$2"
  local tag="$3"
  pkill -f 'xray.*client-test' 2>/dev/null || true
  sleep 1

  cat > /tmp/client-test.json << EOF
{
  "log": { "loglevel": "debug" },
  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 11080,
      "protocol": "http",
      "settings": {}
    }
  ],
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "vnext": [{
          "address": "${addr}",
          "port": 443,
          "users": [{
            "id": "${UUID}",
            "encryption": "none"
          }]
        }]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "serverName": "${DEST}",
          "fingerprint": "chrome",
          "${keyfield}": "${PBK}",
          "shortId": "${SID}",
          "spiderX": "/"
        }
      },
      "tag": "proxy"
    }
  ]
}
EOF

  echo "=== selftest tag=$tag addr=$addr key=$keyfield ==="
  if ! xray run -test -c /tmp/client-test.json 2>/tmp/client-test-validate.txt; then
    echo "INVALID client json:"
    cat /tmp/client-test-validate.txt
    return 1
  fi

  journalctl -u xray --since "1 min ago" --no-pager >/tmp/srv-before.txt 2>/dev/null || true
  xray run -c /tmp/client-test.json >/tmp/client-test.log 2>&1 &
  local CPID=$!
  sleep 2

  local ok=0
  # HTTP proxy test (simpler than socks+https)
  if curl -sS --max-time 20 -x http://127.0.0.1:11080 https://www.cloudflare.com/cdn-cgi/trace 2>/tmp/curl.err | tee /tmp/curl.out | grep -q '^ip='; then
    ok=1
  elif curl -sS --max-time 20 -x http://127.0.0.1:11080 http://neverssl.com/ 2>>/tmp/curl.err | tee -a /tmp/curl.out | grep -qiE 'neverssl|html'; then
    ok=1
  fi

  if [ "$ok" = "1" ]; then
    echo "SELFTEST_OK tag=$tag"
    kill "$CPID" 2>/dev/null || true
    return 0
  fi

  echo "SELFTEST_FAIL tag=$tag"
  echo "--- curl.err ---"; cat /tmp/curl.err 2>/dev/null || true
  echo "--- curl.out ---"; cat /tmp/curl.out 2>/dev/null || true
  echo "--- client log ---"; tail -n 60 /tmp/client-test.log || true
  echo "--- server journal ---"; journalctl -u xray -n 50 --no-pager || true
  kill "$CPID" 2>/dev/null || true
  return 1
}

SELFTEST=FAIL
WINNER=""
for addr in 127.0.0.1 "$IP"; do
  for key in password publicKey; do
    if run_selftest "$addr" "$key" "${addr}-${key}"; then
      SELFTEST=OK
      WINNER="${addr}/${key}"
      break 2
    fi
  done
done

# Production: turn down debug
python3 - <<'PY'
import json
from pathlib import Path
p=Path('/usr/local/etc/xray/config.json')
c=json.loads(p.read_text())
c['log']={'loglevel':'warning'}
c['inbounds'][0]['streamSettings']['realitySettings']['show']=False
p.write_text(json.dumps(c, indent=2))
PY
systemctl restart xray

URL="vless://${UUID}@${IP}:443?encryption=none&security=reality&sni=${DEST}&fp=chrome&pbk=${PBK}&sid=${SID}&type=tcp&packetEncoding=xudp#WG-${DEST}"

echo ""
echo "SELECTED_DEST=$DEST"
echo "LOCAL_SELFTEST=${SELFTEST} winner=${WINNER}"
echo "========== IMPORT INTO HIDDIFY =========="
echo "$URL"
echo "========================================"
if [ "$SELFTEST" != "OK" ]; then
  echo "Still FAIL. Full diagnostics printed above — send to chat."
  exit 1
fi
