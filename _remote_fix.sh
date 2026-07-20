#!/bin/bash
set -euo pipefail
CFG=/usr/local/etc/xray/config.json
cp -a "$CFG" "/usr/local/etc/xray/config.json.bak.$(date +%s)"

# Extract + verify pbk
PRIV=$(python3 -c 'import json;c=json.load(open("/usr/local/etc/xray/config.json"));print(c["inbounds"][0]["streamSettings"]["realitySettings"]["privateKey"])')
UUID=$(python3 -c 'import json;c=json.load(open("/usr/local/etc/xray/config.json"));print(c["inbounds"][0]["settings"]["clients"][0]["id"])')
SID=$(python3 -c 'import json;c=json.load(open("/usr/local/etc/xray/config.json"));s=c["inbounds"][0]["streamSettings"]["realitySettings"]["shortIds"];print(next((x for x in s if x),""))')
echo "PRIV_LEN=${#PRIV} UUID=$UUID SID=$SID"
PBK_OUT=$(xray x25519 -i "$PRIV" 2>&1 || true)
echo "X25519_OUT=$PBK_OUT"
PBK=$(echo "$PBK_OUT" | awk '/^[Pp]assword/{print $NF; exit}')
if [ -z "$PBK" ]; then PBK=$(echo "$PBK_OUT" | awk '/[Pp]ublic/{print $NF; exit}'); fi
echo "PBK=$PBK"

SID443=$(openssl rand -hex 8)
echo "SID443=$SID443"

python3 - <<PY
import json
cfg_path="/usr/local/etc/xray/config.json"
priv="$PRIV"
uuid="$UUID"
sid="$SID"
sid443="$SID443"
c={
  "log": {"loglevel": "warning"},
  "dns": {
    "servers": ["1.1.1.1", "8.8.8.8"],
    "queryStrategy": "UseIPv4"
  },
  "inbounds": [
    {
      "tag": "vless-reality-2053",
      "listen": "0.0.0.0",
      "port": 2053,
      "protocol": "vless",
      "settings": {
        "clients": [{"id": uuid}],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": False,
          "dest": "www.apple.com:443",
          "xver": 0,
          "serverNames": ["www.apple.com"],
          "privateKey": priv,
          "shortIds": ["", sid]
        }
      },
      "sniffing": {
        "enabled": True,
        "destOverride": ["http", "tls", "quic"]
      }
    },
    {
      "tag": "vless-reality-443",
      "listen": "0.0.0.0",
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [{"id": uuid}],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": False,
          "dest": "www.apple.com:443",
          "xver": 0,
          "serverNames": ["www.apple.com"],
          "privateKey": priv,
          "shortIds": ["", sid443]
        }
      },
      "sniffing": {
        "enabled": True,
        "destOverride": ["http", "tls", "quic"]
      }
    }
  ],
  "outbounds": [
    {"protocol": "freedom", "tag": "direct"},
    {"protocol": "blackhole", "tag": "block"}
  ]
}
open(cfg_path,"w").write(json.dumps(c, indent=2)+"\n")
print("CONFIG_WRITTEN")
PY

# BBR
if ! sysctl net.ipv4.tcp_congestion_control 2>/dev/null | grep -q bbr; then
  printf '%s\n' 'net.core.default_qdisc=fq' 'net.ipv4.tcp_congestion_control=bbr' > /etc/sysctl.d/99-bbr.conf
  sysctl -p /etc/sysctl.d/99-bbr.conf || true
fi
sysctl net.ipv4.tcp_congestion_control || true

echo ==== VALIDATE ====
xray run -test -c "$CFG"
systemctl restart xray
sleep 2
echo "XRAY=$(systemctl is-active xray)"
ss -tlnp | grep -E '2053|443' || true
timeout 2 bash -c 'echo >/dev/tcp/127.0.0.1/2053' && echo 2053_OK || echo 2053_FAIL
timeout 2 bash -c 'echo >/dev/tcp/127.0.0.1/443' && echo 443_OK || echo 443_FAIL

echo ==== OPENSSL ====
timeout 5 openssl s_client -connect 127.0.0.1:2053 -servername www.apple.com </dev/null 2>&1 | head -20 || true
echo ---
timeout 5 openssl s_client -connect 127.0.0.1:443 -servername www.apple.com </dev/null 2>&1 | head -20 || true
echo ---
timeout 5 openssl s_client -connect 92.51.45.35:2053 -servername www.apple.com </dev/null 2>&1 | head -20 || true
echo ---
timeout 5 openssl s_client -connect 92.51.45.35:443 -servername www.apple.com </dev/null 2>&1 | head -20 || true

echo ==== CONFIG_AFTER ====
cat "$CFG"

PRIV_REDACT="${PRIV:0:4}...${PRIV: -4}"
echo ==== REPORT_FOR_PARENT ====
echo "PRIVATE_KEY_REDACTED=$PRIV_REDACT"
echo "UUID=$UUID"
echo "PBK=$PBK"
echo "SID_2053=$SID"
echo "SID_443=$SID443"
echo "URL_2053=vless://${UUID}@92.51.45.35:2053?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=${PBK}&sid=${SID}&type=tcp&packetEncoding=xudp#WG-fixed-2053"
echo "URL_443=vless://${UUID}@92.51.45.35:443?encryption=none&security=reality&sni=www.apple.com&fp=chrome&pbk=${PBK}&sid=${SID443}&type=tcp&packetEncoding=xudp#WG-fixed-443"
echo "XRAY_ACTIVE=$(systemctl is-active xray)"
echo ALL_DONE