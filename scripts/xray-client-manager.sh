#!/bin/bash
# Manage VLESS clients in Xray config.json on the VPN server.
# Usage: xray-client-manager.sh <add|remove|list> [uuid] [email]
# Adds/removes UUID from ALL vless inbounds (exit + relay xhttp/tcp).

set -euo pipefail

ACTION="${1:?action required: add|remove|list}"
UUID="${2:-}"
EMAIL="${3:-}"
CONFIG="/usr/local/etc/xray/config.json"

if [ ! -f "$CONFIG" ]; then
  echo "ERROR: $CONFIG not found" >&2
  exit 1
fi

export ACTION UUID EMAIL CONFIG

python3 - << 'PY'
import json
import os
import subprocess
import sys

action = os.environ["ACTION"]
uuid = os.environ.get("UUID", "")
email = os.environ.get("EMAIL", "")
config_path = os.environ["CONFIG"]

with open(config_path, encoding="utf-8") as f:
    cfg = json.load(f)

def vless_inbounds(cfg):
    return [ib for ib in cfg.get("inbounds", []) if ib.get("protocol") == "vless"]

if action == "list":
    seen = []
    for ib in vless_inbounds(cfg):
        for c in ib.get("settings", {}).get("clients", []):
            cid = c.get("id")
            if cid and cid not in seen:
                seen.append(cid)
                print(cid)
    sys.exit(0)

if action not in ("add", "remove"):
    print(f"ERROR: unknown action {action}", file=sys.stderr)
    sys.exit(1)

if not uuid:
    print("ERROR: uuid required", file=sys.stderr)
    sys.exit(1)

if action == "add":
    client = {"id": uuid}
    if email:
        client["email"] = email
    for ib in vless_inbounds(cfg):
        settings = ib.setdefault("settings", {})
        clients = settings.setdefault("clients", [])
        if not any(c.get("id") == uuid for c in clients):
            clients.append(dict(client))
elif action == "remove":
    for ib in vless_inbounds(cfg):
        settings = ib.get("settings", {})
        clients = settings.get("clients", [])
        settings["clients"] = [c for c in clients if c.get("id") != uuid]

with open(config_path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")

subprocess.run(["xray", "run", "-test", "-c", config_path], check=True)
subprocess.run(["systemctl", "restart", "xray"], check=True)
print(f"OK {action} {uuid}")
PY
