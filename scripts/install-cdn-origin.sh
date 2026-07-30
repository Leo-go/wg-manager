#!/bin/bash
# Origin for Yandex CDN path: CDN → Nginx(:443) → Xray xHTTP packet-up → Exit TLS.
#
# Args:
#   $1 ORIGIN_HOST
#   $2 CDN_HOST
#   $3 RELAY_HOST
#   $4 RELAY_IP
#   $5 UUID
#   $6 EMAIL
#   $7 XHTTP_PATH   (default /api-test)
#   $8 PADDING_KEY  (default dc)
#   $9 EXIT_PORT    (default 11443)

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PATH="/usr/local/bin:$PATH"

ORIGIN_HOST="${1:?ORIGIN_HOST required}"
CDN_HOST="${2:?CDN_HOST required}"
RELAY_HOST="${3:?RELAY_HOST required}"
RELAY_IP="${4:?RELAY_IP required}"
UUID="${5:?UUID required}"
EMAIL="${6:?EMAIL required}"
XHTTP_PATH="${7:-/api-test}"
PADDING_KEY="${8:-dc}"
EXIT_PORT="${9:-11443}"
XRAY_TARGET="26.5.9"

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

echo "=== VLESS Manager CDN Origin Installer ==="
echo "WG_STEP=1"

echo "WG_STEP=2"
timedatectl set-ntp true 2>/dev/null || true
apt-get update -qq
apt-get install -y -qq nginx certbot curl ca-certificates openssl

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
# Nginx (:80/:443) + LE must be reachable before certbot / CDN origin.
open_firewall_tcp 80
open_firewall_tcp 443

install -d -m 755 /var/www/acme
rm -f /etc/nginx/sites-enabled/default

# CDN Origin needs :443 for Nginx. Stop whatever already owns public :443
# (e.g. prior RU Relay Xray Reality) so LE + origin HTTPS can bind.
if command -v xray >/dev/null 2>&1; then
  systemctl stop xray 2>/dev/null || true
fi
systemctl stop caddy 2>/dev/null || true

cat > /etc/nginx/sites-available/xhttp-origin.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${ORIGIN_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/acme;
    }

    location / {
        default_type text/plain;
        return 200 "origin is ready\\n";
    }
}
EOF
ln -sfn /etc/nginx/sites-available/xhttp-origin.conf /etc/nginx/sites-enabled/xhttp-origin.conf
nginx -t
systemctl enable --now nginx
systemctl reload nginx

certbot certonly --webroot -w /var/www/acme --non-interactive --agree-tos \
  --email "$EMAIL" -d "$ORIGIN_HOST" --keep-until-expiring

echo "WG_STEP=5"
cat > /usr/local/etc/xray/config.json <<EOF
{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "tag": "from-yandex-cdn",
      "listen": "127.0.0.1",
      "port": 8003,
      "protocol": "vless",
      "settings": {
        "clients": [ { "id": "${UUID}" } ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "xhttp",
        "security": "none",
        "xhttpSettings": {
          "mode": "packet-up",
          "path": "${XHTTP_PATH}",
          "xPaddingObfsMode": true,
          "xPaddingKey": "${PADDING_KEY}",
          "xPaddingHeader": "X-Cache",
          "xPaddingMethod": "tokenish",
          "xPaddingPlacement": "queryInHeader"
        }
      }
    }
  ],
  "outbounds": [
    {
      "tag": "to-exit",
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "${RELAY_IP}",
            "port": ${EXIT_PORT},
            "users": [
              {
                "id": "${UUID}",
                "encryption": "none",
                "flow": "xtls-rprx-vision"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "tls",
        "tlsSettings": {
          "serverName": "${RELAY_HOST}",
          "alpn": ["h2", "http/1.1"]
        }
      }
    },
    { "tag": "direct", "protocol": "freedom" },
    { "tag": "block", "protocol": "blackhole" }
  ],
  "routing": {
    "domainStrategy": "AsIs",
    "rules": [
      {
        "type": "field",
        "inboundTag": ["from-yandex-cdn"],
        "ip": ["geoip:private", "geoip:ru"],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "inboundTag": ["from-yandex-cdn"],
        "domain": [
          "geosite:category-ru",
          "domain:gosuslugi.ru",
          "domain:esia.gosuslugi.ru",
          "domain:vk.com",
          "domain:vk.ru",
          "domain:vkvideo.ru",
          "domain:mail.ru",
          "domain:ok.ru",
          "domain:rutube.ru",
          "domain:avito.ru",
          "domain:yandex.ru",
          "domain:ya.ru",
          "domain:dzen.ru"
        ],
        "outboundTag": "direct"
      },
      { "type": "field", "inboundTag": ["from-yandex-cdn"], "outboundTag": "to-exit" }
    ]
  }
}
EOF

xray run -test -c /usr/local/etc/xray/config.json
systemctl enable xray
systemctl restart xray
sleep 1
if ! systemctl is-active --quiet xray; then
  echo "ERROR: xray failed on origin" >&2
  journalctl -u xray -n 40 --no-pager >&2
  exit 1
fi

cat > /etc/nginx/conf.d/xhttp-method.conf <<'EOF'
map $request_method $xhttp_proxy_method {
    default  $request_method;
    OPTIONS  POST;
}
EOF

cat > /etc/nginx/sites-available/xhttp-origin.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${ORIGIN_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/acme;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${ORIGIN_HOST};

    ssl_certificate     /etc/letsencrypt/live/${ORIGIN_HOST}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${ORIGIN_HOST}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Yandex CDN + xHTTP padding needs large header buffers (default nginx is too small → 400).
    underscores_in_headers on;
    client_max_body_size 0;
    client_header_buffer_size 512k;
    large_client_header_buffers 16 512k;
    http2_max_field_size 256k;
    http2_max_header_size 512k;

    location = /cdn-check {
        add_header X-CDN-Origin "ok" always;
        add_header X-Origin-Method \$request_method always;
        add_header X-Origin-Content-Length \$http_content_length always;
        return 204;
    }

    location ${XHTTP_PATH} {
        proxy_pass http://127.0.0.1:8003;
        proxy_method \$xhttp_proxy_method;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_pass_request_headers on;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        add_header Cache-Control "no-store" always;
        add_header X-Accel-Buffering "no" always;
    }
}
EOF

nginx -t
systemctl reload nginx

install -d /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
systemctl reload nginx || true
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

open_firewall_tcp 80
open_firewall_tcp 443

# Client VLESS URL (user still must finish Yandex CDN + DNS CNAME)
PATH_ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${XHTTP_PATH}', safe=''))")
EXTRA_JSON=$(cat <<EXTRA
{"mode":"packet-up","scMaxEachPostBytes":1000000,"scMinPostsIntervalMs":30,"scMaxBufferedPosts":30,"xPaddingObfsMode":true,"xPaddingKey":"${PADDING_KEY}","xPaddingHeader":"X-Cache","xPaddingMethod":"tokenish","xPaddingPlacement":"queryInHeader","uplinkHTTPMethod":"OPTIONS"}
EXTRA
)
EXTRA_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$EXTRA_JSON")

VLESS_URL="vless://${UUID}@${CDN_HOST}:443?encryption=none&security=tls&sni=${CDN_HOST}&host=${CDN_HOST}&type=xhttp&path=${PATH_ENC}&mode=packet-up&extra=${EXTRA_ENC}#WG-Yandex-CDN"

echo "CDN_ORIGIN_HOST=${ORIGIN_HOST}"
echo "CDN_HOST=${CDN_HOST}"
echo "CDN_PATH=${XHTTP_PATH}"
echo "CDN_PADDING_KEY=${PADDING_KEY}"
echo "VLESS_CONFIG_URL=${VLESS_URL}"
echo "CDN_ORIGIN_READY=1"
echo "WG_STEP=5"
