#!/bin/bash
# Prepare Exit for Yandex CDN path: Origin → this server (VLESS TCP+TLS Vision).
# Does NOT replace the main Reality :443 inbound.
#
# Args:
#   $1 RELAY_HOST   (e.g. relay.example.com) — must resolve to this server for LE
#   $2 UUID
#   $3 EMAIL        (Let's Encrypt)
#   $4 LISTEN_PORT  (default 11443)

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/usr/local/bin:$PATH"

RELAY_HOST="${1:?RELAY_HOST required}"
UUID="${2:?UUID required}"
EMAIL="${3:?EMAIL required}"
LISTEN_PORT="${4:-11443}"
XRAY_TARGET="26.5.9"

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

echo "=== VLESS Manager CDN Exit Installer ==="
echo "WG_STEP=1"
echo "RELAY_HOST=${RELAY_HOST}"
echo "LISTEN_PORT=${LISTEN_PORT}"

echo "WG_STEP=2"
timedatectl set-ntp true 2>/dev/null || true
apt-get update -qq
apt-get install -y -qq curl certbot ca-certificates openssl python3

echo "WG_STEP=3"
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

open_firewall_tcp() {
  local port="$1"
  if command -v ufw >/dev/null 2>&1; then
    ufw allow "${port}"/tcp || true
  fi
  if command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --permanent --add-port="${port}"/tcp || true
    firewall-cmd --reload || true
  fi
}

echo "WG_STEP=4"
# LE + Origin→Exit inbound need these open before certbot / xray.
open_firewall_tcp 80
open_firewall_tcp "$LISTEN_PORT"

# Free :80 briefly for standalone LE if something else holds it (nginx/caddy).
systemctl stop nginx 2>/dev/null || true
systemctl stop caddy 2>/dev/null || true
certbot certonly --standalone --non-interactive --agree-tos --email "$EMAIL" \
  -d "$RELAY_HOST" --keep-until-expiring

install -d -m 750 -o root -g nogroup /usr/local/etc/xray/tls
install -m 640 -o root -g nogroup "/etc/letsencrypt/live/${RELAY_HOST}/fullchain.pem" \
  /usr/local/etc/xray/tls/cdn-fullchain.pem
install -m 640 -o root -g nogroup "/etc/letsencrypt/live/${RELAY_HOST}/privkey.pem" \
  /usr/local/etc/xray/tls/cdn-privkey.pem

echo "WG_STEP=5"
CFG="/usr/local/etc/xray/config.json"
if [ ! -f "$CFG" ]; then
  echo "ERROR: $CFG not found — finish main VPN setup on this exit first" >&2
  exit 1
fi

python3 - "$CFG" "$LISTEN_PORT" "$UUID" <<'PY'
import json, sys
cfg_path, port_s, uuid = sys.argv[1:4]
port = int(port_s)
with open(cfg_path, "r", encoding="utf-8") as f:
    cfg = json.load(f)
inbounds = cfg.get("inbounds") or []
inbounds = [i for i in inbounds if i.get("tag") != "cdn-from-origin"]
inbound = {
    "tag": "cdn-from-origin",
    "listen": "0.0.0.0",
    "port": port,
    "protocol": "vless",
    "settings": {
        "clients": [{"id": uuid, "flow": "xtls-rprx-vision"}],
        "decryption": "none",
    },
    "streamSettings": {
        "network": "tcp",
        "security": "tls",
        "tlsSettings": {
            "alpn": ["h2", "http/1.1"],
            "certificates": [
                {
                    "certificateFile": "/usr/local/etc/xray/tls/cdn-fullchain.pem",
                    "keyFile": "/usr/local/etc/xray/tls/cdn-privkey.pem",
                }
            ],
        },
    },
}
inbounds.append(inbound)
cfg["inbounds"] = inbounds
with open(cfg_path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
print("CDN_EXIT_INBOUND_OK=1")
PY

install -d /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/restart-xray-cdn-tls.sh <<'EOF'
#!/bin/sh
set -eu
HOST_DIR="${RENEWED_LINEAGE:-}"
if [ -z "$HOST_DIR" ]; then exit 0; fi
install -m 640 -o root -g nogroup "${HOST_DIR}/fullchain.pem" /usr/local/etc/xray/tls/cdn-fullchain.pem
install -m 640 -o root -g nogroup "${HOST_DIR}/privkey.pem" /usr/local/etc/xray/tls/cdn-privkey.pem
systemctl restart xray || true
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/restart-xray-cdn-tls.sh

xray run -test -c "$CFG"
systemctl enable xray
systemctl restart xray
sleep 1
if ! systemctl is-active --quiet xray; then
  echo "ERROR: xray failed to start" >&2
  journalctl -u xray -n 40 --no-pager >&2
  exit 1
fi

open_firewall_tcp 80
open_firewall_tcp "$LISTEN_PORT"

echo "CDN_EXIT_PORT=${LISTEN_PORT}"
echo "CDN_EXIT_HOST=${RELAY_HOST}"
echo "CDN_EXIT_UUID=${UUID}"
echo "CDN_EXIT_READY=1"
echo "WG_STEP=5"
