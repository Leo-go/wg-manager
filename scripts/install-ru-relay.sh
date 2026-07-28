#!/bin/bash
# Install RU relay hop: client → this VPS (Reality/gosuslugi) → exit VPS (xHTTP Reality).
# Args:
#   $1 EXIT_IP
#   $2 EXIT_PORT (default 10443)
#   $3 EXIT_UUID
#   $4 EXIT_PBK
#   $5 EXIT_SID
#   $6 EXIT_SNI (default www.microsoft.com)
#   $7 EXIT_PATH (default /wg-relay)
#   $8 RELAY_PUBLIC_IP (optional, for VLESS URL)
#   $9 RELAY_SNI (default www.gosuslugi.ru)

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/usr/local/bin:$PATH"

EXIT_IP="${1:?EXIT_IP required}"
EXIT_PORT="${2:-10443}"
EXIT_UUID="${3:?EXIT_UUID required}"
EXIT_PBK="${4:?EXIT_PBK required}"
EXIT_SID="${5:?EXIT_SID required}"
EXIT_SNI="${6:-www.microsoft.com}"
EXIT_PATH="${7:-/wg-relay}"
RELAY_PUBLIC_IP="${8:-}"
RELAY_SNI="${9:-www.gosuslugi.ru}"
LISTEN_PORT=443

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

echo "=== VLESS Manager RU Relay Installer ==="

systemctl stop xray 2>/dev/null || true
pkill -f xray 2>/dev/null || true
sleep 1

timedatectl set-ntp true 2>/dev/null || true
apt-get update -qq 2>/dev/null || true
apt-get install -y -qq curl unzip openssl ca-certificates 2>/dev/null

XRAY_TARGET="26.3.27"
NEED_INSTALL=1
if command -v xray >/dev/null 2>&1; then
  CURRENT="$(xray version 2>/dev/null | awk 'NR==1{print $2; exit}' || true)"
  if [ "$CURRENT" = "$XRAY_TARGET" ] || [ "$CURRENT" = "v${XRAY_TARGET}" ]; then
    NEED_INSTALL=0
  fi
fi
if [ "$NEED_INSTALL" = "1" ]; then
  curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh -o /tmp/xray-install.sh
  bash /tmp/xray-install.sh install --version "$XRAY_TARGET"
fi
export PATH="/usr/local/bin:$PATH"

CLIENT_UUID=$(xray uuid)
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

mkdir -p /usr/local/etc/xray
cat > /usr/local/etc/xray/config.json << EOF
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "tag": "ru-relay-in",
      "listen": "0.0.0.0",
      "port": ${LISTEN_PORT},
      "protocol": "vless",
      "settings": {
        "clients": [ { "id": "${CLIENT_UUID}" } ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "${RELAY_SNI}:443",
          "serverNames": [ "${RELAY_SNI}" ],
          "privateKey": "${PRIVATE_KEY}",
          "shortIds": [ "", "${SHORT_ID}" ]
        }
      },
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls", "quic"]
      }
    }
  ],
  "outbounds": [
    {
      "tag": "exit-proxy",
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "${EXIT_IP}",
            "port": ${EXIT_PORT},
            "users": [
              {
                "id": "${EXIT_UUID}",
                "encryption": "none"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "xhttp",
        "security": "reality",
        "realitySettings": {
          "serverName": "${EXIT_SNI}",
          "fingerprint": "chrome",
          "publicKey": "${EXIT_PBK}",
          "shortId": "${EXIT_SID}",
          "spiderX": ""
        },
        "xhttpSettings": {
          "path": "${EXIT_PATH}",
          "mode": "auto"
        }
      }
    },
    { "protocol": "freedom", "tag": "direct" },
    { "protocol": "blackhole", "tag": "block" }
  ],
  "routing": {
    "domainStrategy": "AsIs",
    "rules": [
      { "type": "field", "inboundTag": ["ru-relay-in"], "outboundTag": "exit-proxy" }
    ]
  }
}
EOF

xray run -test -c /usr/local/etc/xray/config.json
systemctl restart xray
systemctl enable xray
sleep 1

if ! systemctl is-active --quiet xray; then
  echo "ERROR: xray failed to start on relay" >&2
  journalctl -u xray -n 30 --no-pager >&2
  exit 1
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow "${LISTEN_PORT}"/tcp || true
fi

# light BBR
cat > /etc/sysctl.d/99-wg-manager-relay.conf << 'SYSCTL'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
SYSCTL
sysctl -p /etc/sysctl.d/99-wg-manager-relay.conf >/dev/null 2>&1 || true

DETECTED_IP=$(curl -s --max-time 10 https://api.ipify.org || true)
if [ -n "$RELAY_PUBLIC_IP" ] && [ "$RELAY_PUBLIC_IP" != "127.0.0.1" ]; then
  PUBLIC_IP="$RELAY_PUBLIC_IP"
else
  PUBLIC_IP="${DETECTED_IP:-$(hostname -I | awk '{print $1}')}"
fi

VLESS_URL="vless://${CLIENT_UUID}@${PUBLIC_IP}:${LISTEN_PORT}?encryption=none&security=reality&sni=${RELAY_SNI}&fp=chrome&pbk=${PUBLIC_KEY}&sid=${SHORT_ID}&type=tcp&packetEncoding=xudp#WG-RU-Relay"

echo "RELAY_CLIENT_UUID=${CLIENT_UUID}"
echo "RELAY_CLIENT_PBK=${PUBLIC_KEY}"
echo "RELAY_CLIENT_SID=${SHORT_ID}"
echo "RELAY_CLIENT_SNI=${RELAY_SNI}"
echo "RELAY_CLIENT_PORT=${LISTEN_PORT}"
echo "VLESS_CONFIG_URL=${VLESS_URL}"
echo "RELAY_READY=1"
