#!/bin/bash
# Apply 3X-UI-aligned Reality fixes on a LIVE server WITHOUT regenerating keys.
# Keeps existing UUID / privateKey / shortId / port / SNI.
set -euo pipefail

CFG=/usr/local/etc/xray/config.json
[ -f "$CFG" ] || { echo "ERROR: $CFG missing"; exit 1; }

python3 - <<'PY'
import json
from pathlib import Path
p = Path("/usr/local/etc/xray/config.json")
cfg = json.loads(p.read_text())
ib = next(i for i in cfg["inbounds"] if i.get("protocol") == "vless")
rs = ib["streamSettings"]["realitySettings"]
clients = ib["settings"]["clients"]
for c in clients:
    c.pop("flow", None)
ib["settings"]["decryption"] = "none"
ib["listen"] = "0.0.0.0"
ib["streamSettings"]["network"] = "tcp"
ib["streamSettings"]["security"] = "reality"
rs["show"] = False
rs["xver"] = 0
# keep dest / serverNames / privateKey
sids = rs.get("shortIds") or []
# ensure empty shortId allowed + keep existing non-empty ids
norm = []
seen = set()
for s in [""] + list(sids):
    if s not in seen:
        norm.append(s)
        seen.add(s)
rs["shortIds"] = norm
# sniffing like 3X-UI (routeOnly can break some clients)
ib["sniffing"] = {
    "enabled": True,
    "destOverride": ["http", "tls", "quic"],
}
cfg["dns"] = {
    "servers": ["1.1.1.1", "8.8.8.8"],
    "queryStrategy": "UseIPv4",
}
if not any(o.get("tag") == "direct" for o in cfg.get("outbounds", [])):
    cfg["outbounds"] = [{"protocol": "freedom", "tag": "direct"}, {"protocol": "blackhole", "tag": "block"}]
p.write_text(json.dumps(cfg, indent=2) + "\n")
print("Updated config in place")
print("dest=", rs.get("dest"))
print("serverNames=", rs.get("serverNames"))
print("shortIds=", rs.get("shortIds"))
PY

echo "=== dest reachability ==="
SNI=$(python3 -c "import json;print(json.load(open('/usr/local/etc/xray/config.json'))['inbounds'][0]['streamSettings']['realitySettings']['serverNames'][0])")
timeout 8 bash -c "echo >/dev/tcp/${SNI}/443" && echo "TCP ${SNI}:443 OK" || echo "TCP ${SNI}:443 FAIL"
timeout 10 openssl s_client -connect "${SNI}:443" -servername "${SNI}" </dev/null 2>/dev/null | openssl x509 -noout -subject || echo "TLS probe failed"

systemctl restart xray
sleep 1
systemctl is-active xray
ss -tlnp | grep -E ':(2053|443)\s' || true

echo ""
echo "=== Rebuild client URL ==="
eval "$(python3 - <<'PY'
import json
cfg=json.load(open("/usr/local/etc/xray/config.json"))
ib=next(i for i in cfg["inbounds"] if i.get("protocol")=="vless")
rs=ib["streamSettings"]["realitySettings"]
c=ib["settings"]["clients"][0]
sid=next((s for s in rs["shortIds"] if s), "")
print(f"UUID={c['id']!r}")
print(f"PORT={ib['port']}")
print(f"SNI={rs['serverNames'][0]!r}")
print(f"SID={sid!r}")
print(f"PRIV={rs['privateKey']!r}")
PY
)"
IP=$(curl -s --max-time 10 https://api.ipify.org)
PBK=$(xray x25519 -i "$PRIV" 2>&1 | grep -i '^Password' | awk '{print $NF}')
echo "vless://${UUID}@${IP}:${PORT}?encryption=none&security=reality&sni=${SNI}&fp=chrome&pbk=${PBK}&sid=${SID}&type=tcp&packetEncoding=xudp#WG-fixed"
echo ""
echo "Also test from your Windows PC (PowerShell):"
echo "  Test-NetConnection ${IP} -Port ${PORT}"
echo "  # TcpTestSucceeded=True only proves SYN — also run TLS probe:"
echo "  openssl s_client -connect ${IP}:${PORT} -servername ${SNI} -brief"
echo "If openssl hangs → DPI drops TLS (not a bad pbk). If cert appears quickly → try Hiddify again after this fix."
