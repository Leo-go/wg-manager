#!/bin/bash

# VLESS Reality Installation Script (Non-interactive)
# Proven recipe (2026-07): Xray 26.3.27, port 443, dest TLS-probed from VPS,
# no flow, shortIds include "", pbk from Password/PublicKey (never Hash32).

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export TERM=xterm
export PATH="/usr/local/bin:$PATH"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== VLESS Reality Auto-Installer ===${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

echo -e "${YELLOW}Stopping any existing Xray process...${NC}"
systemctl stop xray 2>/dev/null || true
pkill -f xray || true
sleep 2

echo -e "${YELLOW}[0/6] Syncing system time (critical for Reality)...${NC}"
timedatectl set-ntp true 2>/dev/null || true
apt-get install -y -qq chrony 2>/dev/null || apt-get install -y -qq ntpsec-ntpdate 2>/dev/null || true
chronyc -a makestep 2>/dev/null || ntpdate -u pool.ntp.org 2>/dev/null || true
date -u
echo ""

echo -e "${YELLOW}[1/6] Updating apt index...${NC}"
apt-get update -qq 2>/dev/null || true

echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"
apt-get install -y -qq curl unzip openssl ca-certificates 2>/dev/null

# Pin known-good core (26.7.x broke Reality). Skip reinstall if already present.
echo -e "${YELLOW}[3/6] Ensuring Xray-core v26.3.27...${NC}"
XRAY_TARGET="26.3.27"
NEED_INSTALL=1
if command -v xray >/dev/null 2>&1; then
  CURRENT="$(xray version 2>/dev/null | awk 'NR==1{print $2; exit}' || true)"
  echo "Installed xray version: ${CURRENT:-unknown}"
  if [ "$CURRENT" = "$XRAY_TARGET" ] || [ "$CURRENT" = "v${XRAY_TARGET}" ]; then
    NEED_INSTALL=0
    echo "Xray ${XRAY_TARGET} already installed — skipping download"
  fi
fi
if [ "$NEED_INSTALL" = "1" ]; then
  curl -fsSL https://github.com/XTLS/Xray-install/raw/main/install-release.sh -o /tmp/xray-install.sh
  bash /tmp/xray-install.sh install --version "$XRAY_TARGET"
fi
export PATH="/usr/local/bin:$PATH"
xray version 2>/dev/null | awk 'NR==1{print; exit}' || true

echo -e "${YELLOW}[4/6] Generating UUID...${NC}"
VLESS_UUID=$(xray uuid)
echo "VLESS_UUID=$VLESS_UUID"

echo -e "${YELLOW}[5/6] Generating Reality keys...${NC}"
X25519_OUTPUT=$(xray x25519 2>&1)
echo "Raw x25519 output:"
echo "$X25519_OUTPUT"

PRIVATE_KEY=$(printf '%s\n' "$X25519_OUTPUT" | grep -iE 'Private' | head -n 1 | awk '{print $NF}' | tr -d '\r')
PUBLIC_KEY=$(printf '%s\n' "$X25519_OUTPUT" | grep -iE '^Password' | head -n 1 | awk '{print $NF}' | tr -d '\r')
if [ -z "$PUBLIC_KEY" ]; then
  PUBLIC_KEY=$(printf '%s\n' "$X25519_OUTPUT" | grep -iE 'Public' | head -n 1 | awk '{print $NF}' | tr -d '\r')
fi
if [ -n "$PRIVATE_KEY" ]; then
  DERIVED_OUTPUT=$(xray x25519 -i "$PRIVATE_KEY" 2>&1 || true)
  DERIVED_PUB=$(printf '%s\n' "$DERIVED_OUTPUT" | grep -iE '^(Password|Public)' | head -n 1 | awk '{print $NF}' | tr -d '\r')
  if [ -n "$DERIVED_PUB" ]; then
    PUBLIC_KEY="$DERIVED_PUB"
    echo "Derived PUBLIC_KEY via xray x25519 -i"
  fi
fi
HASH32=$(printf '%s\n' "$X25519_OUTPUT" | grep -iE '^Hash32' | awk '{print $NF}' | tr -d '\r' || true)

if [ -z "$PRIVATE_KEY" ] || [ -z "$PUBLIC_KEY" ]; then
  echo "ERROR: Failed to extract valid X25519 keys." >&2
  echo "Raw: $X25519_OUTPUT" >&2
  exit 1
fi
if [ -n "$HASH32" ] && [ "$PUBLIC_KEY" = "$HASH32" ]; then
  echo "ERROR: PUBLIC_KEY equals Hash32 — invalid pbk." >&2
  exit 1
fi
echo "PUBLIC_KEY=$PUBLIC_KEY (client pbk=)"

# Args: SNI, port, control-panel IP
REQUESTED_SNI=${1:-""}
VLESS_PORT=${2:-443}
SHORT_ID=$(openssl rand -hex 8)

pick_reachable_sni() {
  local preferred="$1"
  local candidates=()
  if [ -n "$preferred" ]; then
    candidates+=("$preferred")
  fi
  candidates+=(
    www.cloudflare.com
    www.apple.com
    gateway.icloud.com
    www.microsoft.com
    dl.google.com
    www.yahoo.com
    www.samsung.com
  )
  local d
  for d in "${candidates[@]}"; do
    echo -e "${YELLOW}Probing Reality dest ${d}:443...${NC}" >&2
    # Avoid pipefail death: run openssl without piping to another openssl
    if timeout 10 openssl s_client -connect "${d}:443" -servername "${d}" </dev/null >/tmp/wg-ossl-dest.txt 2>&1; then
      if grep -qE 'BEGIN CERTIFICATE|Verify return code|CONNECTION ESTABLISHED' /tmp/wg-ossl-dest.txt; then
        echo "DEST_OK $d" >&2
        printf '%s\n' "$d"
        return 0
      fi
    fi
    echo "DEST_FAIL $d" >&2
  done
  return 1
}

SNI_DOMAIN="$(pick_reachable_sni "$REQUESTED_SNI" || true)"
if [ -z "$SNI_DOMAIN" ]; then
  echo "ERROR: No reachable TLS dest for Reality from this VPS." >&2
  exit 1
fi

echo "SNI_DOMAIN=$SNI_DOMAIN (requested=${REQUESTED_SNI:-none})"
echo "VLESS_PORT=$VLESS_PORT"
echo "SHORT_ID=$SHORT_ID"

if ss -tulpn | grep -q ":${VLESS_PORT} "; then
  if ! ss -tulpn | grep ":${VLESS_PORT} " | grep -qi "xray"; then
    echo "ERROR: Port ${VLESS_PORT} is already in use." >&2
    ss -tulpn | grep ":${VLESS_PORT} " >&2 || true
    exit 1
  fi
fi

echo -e "${YELLOW}[6/6] Writing Xray config...${NC}"
mkdir -p /usr/local/etc/xray
cat > /usr/local/etc/xray/config.json << EOF
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "listen": "0.0.0.0",
      "port": $VLESS_PORT,
      "protocol": "vless",
      "settings": {
        "clients": [ { "id": "$VLESS_UUID" } ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "show": false,
          "dest": "$SNI_DOMAIN:443",
          "serverNames": [ "$SNI_DOMAIN" ],
          "privateKey": "$PRIVATE_KEY",
          "shortIds": [ "", "$SHORT_ID" ]
        }
      }
    }
  ],
  "outbounds": [ { "protocol": "freedom", "tag": "direct" } ]
}
EOF

echo "Wrote config dest=${SNI_DOMAIN}:443 port=${VLESS_PORT}"
cat /usr/local/etc/xray/config.json
xray run -test -c /usr/local/etc/xray/config.json

systemctl restart xray
systemctl enable xray

if ! systemctl is-active --quiet xray; then
  echo "ERROR: Xray failed to start. Logs:" >&2
  journalctl -u xray -n 20 --no-pager >&2
  exit 1
fi
echo -e "${GREEN}✓ Xray is running${NC}"

sleep 1
if ! ss -tulpn | grep -q ":${VLESS_PORT} "; then
  echo "ERROR: Xray failed to bind to port ${VLESS_PORT}." >&2
  journalctl -u xray -n 20 --no-pager >&2
  exit 1
fi

echo -e "${YELLOW}Applying BBR / TCP tuning...${NC}"
cat > /etc/sysctl.d/99-wg-manager.conf << 'SYSCTL'
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_slow_start_after_idle = 0
SYSCTL
sysctl -p /etc/sysctl.d/99-wg-manager.conf >/dev/null 2>&1 || true

echo -e "${YELLOW}Opening firewall port ${VLESS_PORT}/tcp...${NC}"
if command -v ufw >/dev/null 2>&1; then
  ufw allow "${VLESS_PORT}"/tcp || true
fi
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port="${VLESS_PORT}"/tcp && firewall-cmd --reload || true
fi

DETECTED_IP=$(curl -s --max-time 10 https://api.ipify.org || true)
CONTROL_PANEL_IP=${3:-""}
if [ -n "$CONTROL_PANEL_IP" ] && [ "$CONTROL_PANEL_IP" != "127.0.0.1" ]; then
  PUBLIC_IP="$CONTROL_PANEL_IP"
  PUBLIC_IP_SOURCE="control_panel"
else
  PUBLIC_IP="${DETECTED_IP:-$(hostname -I | awk '{print $1}')}"
  PUBLIC_IP_SOURCE="detected"
fi

echo ""
echo "=== DIAGNOSTICS ==="
systemctl status xray --no-pager || true
ss -tlnp | grep ":${VLESS_PORT}" || true
echo "PUBLIC_IP=$PUBLIC_IP ($PUBLIC_IP_SOURCE)"
echo "SNI_DOMAIN=$SNI_DOMAIN"
echo "=== END DIAGNOSTICS ==="

VLESS_URL="vless://${VLESS_UUID}@${PUBLIC_IP}:${VLESS_PORT}?encryption=none&security=reality&sni=${SNI_DOMAIN}&fp=chrome&pbk=${PUBLIC_KEY}&sid=${SHORT_ID}&type=tcp&packetEncoding=xudp#WG-Manager"

echo ""
echo -e "${GREEN}=== Installation Complete! ===${NC}"
# Machine-readable marker for the API parser (no ANSI on this line)
echo "VLESS_CONFIG_URL=${VLESS_URL}"
echo -e "${YELLOW}VLESS Config URL:${NC}"
echo "$VLESS_URL"
echo -e "${YELLOW}Public IP:${NC} $PUBLIC_IP"
echo -e "${YELLOW}Port:${NC} $VLESS_PORT"
echo -e "${YELLOW}SNI:${NC} $SNI_DOMAIN"
echo -e "${YELLOW}Short ID:${NC} $SHORT_ID"
echo -e "${YELLOW}Public Key (pbk):${NC} $PUBLIC_KEY"
echo -e "${GREEN}SUCCESS: Xray on port ${VLESS_PORT} with SNI ${SNI_DOMAIN}${NC}"
