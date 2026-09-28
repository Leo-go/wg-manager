#!/usr/bin/env bash
# Run this FROM the failing ISP (phone hotspot / that Wi-Fi), not from a foreign VPS.
# Distinguishes: DNS/IP block vs TCP/443 vs TLS vs xHTTP fingerprint.
# Does not print VLESS keys.
set -u

CDN_HOST="${CDN_HOST:-www.wg-manager.online}"
CDN_PATH="${CDN_PATH:-/cdn-check}"
HOME_HOST="${HOME_HOST:-94.103.15.20}"
HOME_PORT="${HOME_PORT:-2053}"
TIMEOUT="${TIMEOUT:-8}"

ok() { printf '  OK    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; }
info() { printf '  ..    %s\n' "$1"; }

echo "=== CDN / home path probe  (run on the broken network) ==="
echo "host=${CDN_HOST}  home=${HOME_HOST}:${HOME_PORT}"
echo

echo "[1] DNS"
if command -v getent >/dev/null 2>&1; then
  dns_out="$(getent ahostsv4 "$CDN_HOST" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')"
elif command -v dig >/dev/null 2>&1; then
  dns_out="$(dig +short +time=3 +tries=1 A "$CDN_HOST" 2>/dev/null | tr '\n' ' ')"
else
  dns_out="$(python3 - <<PY 2>/dev/null
import socket
print(" ".join(sorted({ai[4][0] for ai in socket.getaddrinfo("$CDN_HOST", 443, socket.AF_INET)})))
PY
)"
fi
if [ -n "${dns_out:-}" ]; then
  ok "A ${CDN_HOST} -> ${dns_out}"
else
  fail "no A record (DNS hijack/block or no resolver)"
fi
echo

echo "[2] TCP 443"
if python3 - "$CDN_HOST" "$TIMEOUT" <<'PY'
import socket, sys
host, timeout = sys.argv[1], float(sys.argv[2])
s = socket.socket()
s.settimeout(timeout)
try:
    s.connect((host, 443))
    print("open")
except Exception as e:
    print(f"error:{e}")
    sys.exit(1)
finally:
    s.close()
PY
then
  ok "TCP ${CDN_HOST}:443"
else
  fail "TCP ${CDN_HOST}:443 (IP/port filtered)"
fi
echo

echo "[3] TLS (SNI=${CDN_HOST})"
tls_out="$(echo | openssl s_client -connect "${CDN_HOST}:443" -servername "$CDN_HOST" -brief 2>&1 || true)"
if echo "$tls_out" | grep -qiE 'Protocol version:|CONNECTION ESTABLISHED|Verify return code'; then
  ok "TLS handshake"
  echo "$tls_out" | grep -iE 'Protocol version:|Ciphersuite:|Verify return code:|subject=|issuer=' | sed 's/^/        /'
else
  fail "TLS handshake (DPI reset or MITM)"
  echo "$tls_out" | tail -n 8 | sed 's/^/        /'
fi
echo

echo "[4] HTTPS GET/OPTIONS ${CDN_PATH}  (origin probe, not xHTTP tunnel)"
if command -v curl >/dev/null 2>&1; then
  code_get="$(curl -sS -o /tmp/cdn-check-body -w '%{http_code}' --connect-timeout "$TIMEOUT" --max-time 15 "https://${CDN_HOST}${CDN_PATH}" || echo "000")"
  code_opt="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout "$TIMEOUT" --max-time 15 -X OPTIONS "https://${CDN_HOST}${CDN_PATH}" || echo "000")"
  info "GET ${CDN_PATH} HTTP ${code_get}   OPTIONS HTTP ${code_opt}"
  if [ "$code_get" = "000" ] && [ "$code_opt" = "000" ]; then
    fail "no HTTP after TLS — middlebox or origin down"
  else
    ok "HTTP reached origin/CDN (codes are not a VPN success; xHTTP may still be fingerprinted)"
  fi
else
  fail "curl not installed"
fi
echo

echo "[5] Home Reality TCP ${HOME_HOST}:${HOME_PORT} (no TLS client hello parse)"
if python3 - "$HOME_HOST" "$HOME_PORT" "$TIMEOUT" <<'PY'
import socket, sys
host, port, timeout = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
s = socket.socket()
s.settimeout(timeout)
try:
    s.connect((host, port))
    print("open")
except Exception as e:
    print(f"error:{e}")
    sys.exit(1)
finally:
    s.close()
PY
then
  ok "TCP ${HOME_HOST}:${HOME_PORT} — try the 🏠 home key on this network"
else
  fail "TCP ${HOME_HOST}:${HOME_PORT} — home IP/port filtered here"
fi
echo

cat <<'EOF'
How to read this
- DNS fail / wrong private IP     → CDN domain listed; try a new CNAME on the same Origin.
- TCP 443 fail, DNS ok            → CDN IP listed; new CNAME may still land on the same anycast IP.
- TLS fail, TCP ok                → DPI on TLS/SNI; new domain or different CDN.
- HTTP ok but VPN client fails    → likely xHTTP fingerprint; need another inbound (not this probe).
- Home :2053 open, CDN fails      → use 🏠 home profile on this network.
- Both fail                       → report operator + screenshot; do not wait on kill switch.

Do not paste vless:// URLs or pbk into group chat.
EOF
