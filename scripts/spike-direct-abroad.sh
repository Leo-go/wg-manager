#!/usr/bin/env bash
# Phase 1 spike: temporary DIRECT abroad Reality inbounds on the EXIT VPS.
# Does NOT touch CDN origin path or RU relay. Safe to re-run (idempotent tags).
#
# Usage (on exit as root, or via: ssh root@EXIT 'bash -s' < scripts/spike-direct-abroad.sh):
#   bash scripts/spike-direct-abroad.sh
#   bash scripts/spike-direct-abroad.sh remove
#
# After install, print two test vless:// URLs (TCP :9443 and xHTTP :9444).
# Test from RU Wi-Fi + LTE in Happ/INCY for ≥10 min. Record matrix → go/no-go.
set -euo pipefail

ACTION="${1:-install}"
CONFIG="${XRAY_CONFIG:-/usr/local/etc/xray/config.json}"
TAG_TCP="spike-direct-tcp"
TAG_XHTTP="spike-direct-xhttp"
PORT_TCP="${SPIKE_TCP_PORT:-9443}"
PORT_XHTTP="${SPIKE_XHTTP_PORT:-9444}"
SNI="${SPIKE_SNI:-www.cloudflare.com}"
PATH_XHTTP="${SPIKE_XHTTP_PATH:-/spike-xhttp}"

if [ ! -f "$CONFIG" ]; then
  echo "ERROR: $CONFIG not found" >&2
  exit 1
fi

export ACTION CONFIG TAG_TCP TAG_XHTTP PORT_TCP PORT_XHTTP SNI PATH_XHTTP

python3 - <<'PY'
import json, os, secrets, subprocess, shutil
from pathlib import Path

action = os.environ["ACTION"]
config_path = Path(os.environ["CONFIG"])
tag_tcp = os.environ["TAG_TCP"]
tag_xhttp = os.environ["TAG_XHTTP"]
port_tcp = int(os.environ["PORT_TCP"])
port_xhttp = int(os.environ["PORT_XHTTP"])
sni = os.environ["SNI"]
path_xhttp = os.environ["PATH_XHTTP"]

cfg = json.loads(config_path.read_text(encoding="utf-8"))
inbounds = cfg.setdefault("inbounds", [])

def drop_tags(tags):
    cfg["inbounds"] = [ib for ib in inbounds if ib.get("tag") not in tags]
    return cfg["inbounds"]

if action == "remove":
    cfg["inbounds"] = drop_tags({tag_tcp, tag_xhttp})
    bak = str(config_path) + ".bak-spike"
    shutil.copy2(config_path, bak)
    config_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
    subprocess.run(["xray", "run", "-test", "-c", str(config_path)], check=True)
    subprocess.run(["systemctl", "restart", "xray"], check=True)
    print(f"OK removed {tag_tcp} {tag_xhttp}")
    raise SystemExit(0)

# Reuse Reality keys from existing inbound if present; else generate.
priv = None
short_id = secrets.token_hex(4)
for ib in inbounds:
    rs = (ib.get("streamSettings") or {}).get("realitySettings") or {}
    if rs.get("privateKey"):
        priv = rs["privateKey"]
        sids = [s for s in (rs.get("shortIds") or []) if s]
        if sids:
            short_id = sids[0]
        break

if not priv:
    out = subprocess.check_output(["xray", "x25519"], text=True)
    # formats vary: "Private key: …" / "PrivateKey: …"
    for line in out.splitlines():
        if "rivate" in line and ":" in line:
            priv = line.split(":", 1)[1].strip()
            break
    if not priv:
        raise SystemExit("could not generate x25519 private key")

pub_out = subprocess.check_output(["xray", "x25519", "-i", priv], text=True)
pub = None
for line in pub_out.splitlines():
    low = line.lower()
    if "password" in low or "public" in low:
        pub = line.split(":", 1)[1].strip()
        break
if not pub:
    raise SystemExit(f"could not derive public key from: {pub_out}")

uuid = str(__import__("uuid").uuid4())

def reality_stream(network, extra=None):
    stream = {
        "network": network,
        "security": "reality",
        "realitySettings": {
            "show": False,
            "dest": f"{sni}:443",
            "xver": 0,
            "serverNames": [sni],
            "privateKey": priv,
            "shortIds": ["", short_id],
        },
    }
    if extra:
        stream.update(extra)
    return stream

tcp_ib = {
    "tag": tag_tcp,
    "listen": "0.0.0.0",
    "port": port_tcp,
    "protocol": "vless",
    "settings": {
        "clients": [{"id": uuid, "email": "spike-direct-tcp"}],
        "decryption": "none",
    },
    "streamSettings": reality_stream("tcp"),
    "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"]},
}

xhttp_ib = {
    "tag": tag_xhttp,
    "listen": "0.0.0.0",
    "port": port_xhttp,
    "protocol": "vless",
    "settings": {
        "clients": [{"id": uuid, "email": "spike-direct-xhttp"}],
        "decryption": "none",
    },
    "streamSettings": reality_stream(
        "xhttp",
        {
            "xhttpSettings": {
                "path": path_xhttp,
                "mode": "auto",
            }
        },
    ),
    "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"]},
}

inbounds = drop_tags({tag_tcp, tag_xhttp})
inbounds.extend([tcp_ib, xhttp_ib])
cfg["inbounds"] = inbounds

bak = str(config_path) + ".bak-spike"
shutil.copy2(config_path, bak)
config_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
subprocess.run(["xray", "run", "-test", "-c", str(config_path)], check=True)
subprocess.run(["systemctl", "restart", "xray"], check=True)

# Detect public IP for URL
host = os.environ.get("SPIKE_PUBLIC_HOST", "").strip()
if not host:
    try:
        import urllib.request
        host = urllib.request.urlopen("https://api.ipify.org", timeout=5).read().decode().strip()
    except Exception:
        host = "EXIT_PUBLIC_IP"

tcp_url = (
    f"vless://{uuid}@{host}:{port_tcp}?encryption=none&security=reality"
    f"&sni={sni}&fp=chrome&pbk={pub}&sid={short_id}&type=tcp"
    f"&packetEncoding=xudp#SPIKE-DIRECT-TCP"
)
from urllib.parse import quote
xhttp_url = (
    f"vless://{uuid}@{host}:{port_xhttp}?encryption=none&security=reality"
    f"&sni={sni}&fp=chrome&pbk={pub}&sid={short_id}&type=xhttp"
    f"&path={quote(path_xhttp)}&mode=auto&packetEncoding=xudp#SPIKE-DIRECT-XHTTP"
)

print("OK spike installed")
print(f"backup={bak}")
print(f"pbk={pub}")
print(f"sid={short_id}")
print(f"uuid={uuid}")
print("---")
print("TCP:", tcp_url)
print("XHTTP:", xhttp_url)
print("---")
print("Test matrix: Wi-Fi ISP × LTE × (TCP|XHTTP) for ≥10 min; IP must be exit egress.")
print("Remove: bash scripts/spike-direct-abroad.sh remove")
PY
