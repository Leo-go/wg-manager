#!/usr/bin/env bash
# Inspect Xray on the home Reality host without dumping client UUIDs / Reality pbk.
# RU Wi-Fi often blocks :22; jump through the foreign exit (default 216.57.107.94).
set -u

HOME_HOST="${HOME_HOST:-94.103.15.20}"
HOME_PORT="${HOME_SSH_PORT:-22}"
HOME_USER="${HOME_SSH_USER:-root}"
JUMP_HOST="${JUMP_HOST:-216.57.107.94}"
JUMP_USER="${JUMP_SSH_USER:-root}"
INBOUND_PORT="${HOME_REALITY_PORT:-2053}"

echo "=== Home host ${HOME_USER}@${HOME_HOST}:${HOME_PORT}  Reality :${INBOUND_PORT} ==="
echo "Direct SSH from RU is often filtered; jump=${JUMP_USER}@${JUMP_HOST}"
echo

probe_tcp() {
  python3 - "$1" "$2" <<'PY'
import socket, sys
host, port = sys.argv[1], int(sys.argv[2])
s = socket.socket()
s.settimeout(6)
try:
    s.connect((host, port))
    print("open")
except Exception as e:
    print(f"closed:{e}")
    sys.exit(1)
finally:
    s.close()
PY
}

echo "[1] TCP ${HOME_HOST}:22"
if probe_tcp "$HOME_HOST" 22; then
  echo "  OK    SSH port reachable from this network"
  DIRECT_OK=1
else
  echo "  FAIL  :22 filtered — use ProxyJump or hoster VNC/serial"
  DIRECT_OK=0
fi

echo "[2] TCP ${HOME_HOST}:${INBOUND_PORT}"
if probe_tcp "$HOME_HOST" "$INBOUND_PORT"; then
  echo "  OK    Reality port reachable"
else
  echo "  FAIL  :${INBOUND_PORT} not reachable from here"
fi
echo

REMOTE='
set -e
echo "--- xray unit ---"
systemctl is-active xray 2>/dev/null || service xray status 2>/dev/null | head -n 2 || echo "xray status unknown"
echo "--- listen ---"
ss -lntup 2>/dev/null | grep -E ":2053|:443|:22" || netstat -lntup 2>/dev/null | grep -E ":2053|:443|:22" || true
echo "--- inbound summary (no clients, no pbk) ---"
python3 - <<'"'"'PY'"'"'
import json
p = "/usr/local/etc/xray/config.json"
try:
    cfg = json.load(open(p, encoding="utf-8"))
except Exception as e:
    print("cannot read", p, e)
    raise SystemExit(0)
for ib in cfg.get("inbounds", []):
    proto = ib.get("protocol")
    port = ib.get("port")
    listen = ib.get("listen", "0.0.0.0")
    tag = ib.get("tag", "")
    stream = ib.get("streamSettings") or {}
    net = stream.get("network")
    sec = stream.get("security")
    clients = (ib.get("settings") or {}).get("clients") or []
    print(f"port={port} listen={listen} proto={proto} net={net} sec={sec} tag={tag} clients={len(clients)}")
PY
'

run_ssh() {
  local extra=("$@")
  ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new \
    "${extra[@]}" "${HOME_USER}@${HOME_HOST}" "$REMOTE"
}

echo "[3] SSH inspect (no UUID dump)"
if [ "${DIRECT_OK}" = "1" ]; then
  if run_ssh; then
    echo "  OK    inspected over direct SSH"
    exit 0
  fi
  echo "  FAIL  direct SSH auth/session failed"
fi

echo "[4] SSH via ProxyJump ${JUMP_USER}@${JUMP_HOST}"
if run_ssh -J "${JUMP_USER}@${JUMP_HOST}"; then
  echo "  OK    inspected over jump"
  exit 0
fi

cat <<EOF

Could not SSH. Next:
- ssh -J ${JUMP_USER}@${JUMP_HOST} ${HOME_USER}@${HOME_HOST}
- or hoster VNC/serial
- then: systemctl status xray
- confirm inbound :${INBOUND_PORT} reality tcp
- add per-user UUIDs with scripts/xray-client-manager.sh add <uuid> <email>
  (do not share the old Hiddify JSON UUID)

Do not paste pbk / private keys / client UUIDs into Telegram.
EOF
exit 1
