#!/usr/bin/env bash
# Compare TELEGRAM_BOT_HOME_VLESS_TEMPLATE (env or arg) to live RU Reality.
# Usage:
#   TELEGRAM_BOT_HOME_VLESS_TEMPLATE='vless://…' bash scripts/smoke-home-template.sh
#   bash scripts/smoke-home-template.sh 'vless://…'
set -euo pipefail
HOST="${HOME_SSH_HOST:-5.129.215.254}"
TEMPLATE="${1:-${TELEGRAM_BOT_HOME_VLESS_TEMPLATE:-}}"
if [ -z "$TEMPLATE" ]; then
  echo "ERROR: pass template as arg or TELEGRAM_BOT_HOME_VLESS_TEMPLATE" >&2
  exit 1
fi

LIVE=$(ssh -o BatchMode=yes -o ConnectTimeout=12 "root@${HOST}" 'bash -s' <<'EOS'
python3 - <<'PY'
import json, subprocess
c=json.load(open("/usr/local/etc/xray/config.json"))
ib=next(i for i in c["inbounds"] if i.get("tag")=="ru-relay-in-xhttp")
rs=ib["streamSettings"]["realitySettings"]
xs=ib["streamSettings"].get("xhttpSettings") or {}
priv=rs["privateKey"]
out=subprocess.check_output(["xray","x25519","-i",priv], text=True)
pub=""
for line in out.splitlines():
  if "assword" in line or "ublic" in line.lower():
    pub=line.split(":",1)[1].strip(); break
sid=next((s for s in (rs.get("shortIds") or []) if s), "")
sni=(rs.get("serverNames") or ["eh.vk.com"])[0]
path=xs.get("path") or "/ru-xhttp"
print(f"pbk={pub}")
print(f"sid={sid}")
print(f"sni={sni}")
print(f"path={path}")
PY
EOS
)

echo "=== live ==="
echo "$LIVE"
echo "=== template ==="
python3 - <<PY
import os, re, sys
tmpl = """$TEMPLATE"""
live = """$LIVE"""
live_map = dict(line.split("=",1) for line in live.strip().splitlines() if "=" in line)

def param(url, key):
  m = re.search(rf"[?&]{key}=([^&]+)", url, re.I)
  if not m: return None
  from urllib.parse import unquote
  return unquote(m.group(1))

host = re.search(r"@([^:?/]+)", tmpl)
print("host", host.group(1) if host else None)
ok = True
for key in ("pbk", "sid", "sni", "path"):
  t = param(tmpl, key)
  l = live_map.get(key)
  match = (t or "").lower() == (l or "").lower()
  print(f"{key}: template={t!r} live={l!r} {'OK' if match else 'MISMATCH'}")
  ok = ok and match
sys.exit(0 if ok else 2)
PY
