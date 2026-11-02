#!/usr/bin/env bash
# Phase 0 helper: SSH to RU relay and print WG + Reality summary.
# Usage: bash scripts/diag-home-baseline.sh [host]
set -euo pipefail
HOST="${1:-5.129.215.254}"

ssh -o BatchMode=yes -o ConnectTimeout=12 "root@${HOST}" 'bash -s' <<'EOS'
set -euo pipefail
echo "=== wg-home0 ==="
wg show wg-home0 2>&1 | head -20
echo "=== exit-proxy ==="
python3 - <<'PY'
import json
c=json.load(open("/usr/local/etc/xray/config.json"))
for ob in c.get("outbounds", []):
  if ob.get("tag") == "exit-proxy":
    v = (ob.get("settings") or {}).get("vnext") or [{}]
    print(v[0].get("address"), v[0].get("port"))
PY
echo "=== Reality xHTTP :443 ==="
python3 - <<'PY'
import json, subprocess
c=json.load(open("/usr/local/etc/xray/config.json"))
ib=next(i for i in c["inbounds"] if i.get("tag")=="ru-relay-in-xhttp")
rs=ib["streamSettings"]["realitySettings"]
xs=ib["streamSettings"].get("xhttpSettings") or {}
priv=rs["privateKey"]
out=subprocess.check_output(["xray","x25519","-i",priv], text=True)
pub=None
for line in out.splitlines():
  if "assword" in line or "ublic" in line.lower():
    pub=line.split(":",1)[1].strip(); break
print("path", xs.get("path"))
print("sni", rs.get("serverNames"))
print("sid", [s for s in (rs.get("shortIds") or []) if s])
print("pbk", pub)
print("clients", len(ib["settings"].get("clients") or []))
PY
EOS
