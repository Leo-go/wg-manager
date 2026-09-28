#!/bin/bash
# Manage VLESS clients in Xray / 3x-ui.
# Usage: xray-client-manager.sh <add|remove|list> [uuid] [email]
# Optional env:
#   XRAY_CONFIG         explicit config.json
#   XRAY_INBOUND_PORT   only touch this listen port (home Reality 2053)
set -euo pipefail

ACTION="${1:?action required: add|remove|list}"
UUID="${2:-}"
EMAIL="${3:-}"

detect_config() {
  if [ -n "${XRAY_CONFIG:-}" ]; then
    echo "$XRAY_CONFIG"
    return
  fi
  for p in \
    /usr/local/etc/xray/config.json \
    /usr/local/x-ui/bin/config.json
  do
    if [ -f "$p" ]; then
      echo "$p"
      return
    fi
  done
  echo ""
}

detect_xui_db() {
  for p in /etc/x-ui/x-ui.db /usr/local/x-ui/x-ui.db; do
    if [ -f "$p" ]; then
      echo "$p"
      return
    fi
  done
  echo ""
}

CONFIG="$(detect_config)"
XUI_DB="$(detect_xui_db)"

if [ -z "$CONFIG" ] && [ -z "$XUI_DB" ]; then
  echo "ERROR: no Xray config.json and no 3x-ui database found" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  apt-get update -qq 2>/dev/null || true
  apt-get install -y -qq python3 2>/dev/null || {
    echo "ERROR: python3 is required on the VPN server" >&2
    exit 1
  }
fi

export ACTION UUID EMAIL
export CONFIG="${CONFIG:-}"
export XUI_DB="${XUI_DB:-}"
export XRAY_INBOUND_PORT="${XRAY_INBOUND_PORT:-}"

python3 - << 'PY'
import copy
import json
import os
import secrets
import sqlite3
import string
import subprocess
import sys
from pathlib import Path

action = os.environ["ACTION"]
uuid = os.environ.get("UUID", "")
email = os.environ.get("EMAIL", "")
config_path = os.environ.get("CONFIG", "").strip()
xui_db = os.environ.get("XUI_DB", "").strip()
port_raw = os.environ.get("XRAY_INBOUND_PORT", "").strip()
inbound_port = int(port_raw) if port_raw.isdigit() else None

def vless_inbounds(cfg):
    rows = [ib for ib in cfg.get("inbounds", []) if ib.get("protocol") == "vless"]
    if inbound_port is not None:
        rows = [ib for ib in rows if ib.get("port") == inbound_port]
    return rows

def build_client(existing):
    """Clone 3x-ui/Xray client shape so the panel does not drop the row on restart."""
    if existing:
        client = copy.deepcopy(existing[0])
    else:
        client = {
            "flow": "",
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True,
            "tgId": "",
            "subId": "",
            "reset": 0,
        }
    client["id"] = uuid
    client["enable"] = True
    if email:
        client["email"] = email
    elif not client.get("email"):
        client["email"] = f"tg-{uuid[:8]}"
    client["expiryTime"] = 0
    if not client.get("subId"):
        alphabet = string.ascii_lowercase + string.digits
        client["subId"] = "".join(secrets.choice(alphabet) for _ in range(16))
    return client

def mutate_clients(clients):
    others = [c for c in clients if c.get("id") != uuid]
    if action == "add":
        others.append(build_client(others))
        return others
    return others

def restart_standalone(cfg_path):
    xray = "/usr/local/bin/xray"
    if not Path(xray).is_file():
        xray = "xray"
    subprocess.run([xray, "run", "-test", "-c", cfg_path], check=True)
    subprocess.run(["systemctl", "restart", "xray"], check=True)

def restart_xui():
    for cmd in (
        ["systemctl", "restart", "x-ui"],
        ["x-ui", "restart"],
        ["/usr/bin/x-ui", "restart"],
        ["/usr/local/x-ui/x-ui", "restart"],
    ):
        try:
            result = subprocess.run(cmd, check=False)
        except FileNotFoundError:
            continue
        if result.returncode == 0:
            return
    print("ERROR: could not restart x-ui", file=sys.stderr)
    sys.exit(1)

def run_file_backend():
    if not config_path or not Path(config_path).is_file():
        print("ERROR: config.json not found", file=sys.stderr)
        sys.exit(1)
    with open(config_path, encoding="utf-8") as f:
        cfg = json.load(f)
    inbounds = vless_inbounds(cfg)
    if action != "list" and not inbounds:
        hint = f" port {inbound_port}" if inbound_port else ""
        print(f"ERROR: no vless inbound{hint} in {config_path}", file=sys.stderr)
        sys.exit(1)
    if action == "list":
        seen = []
        for ib in inbounds:
            for c in ib.get("settings", {}).get("clients", []):
                cid = c.get("id")
                if cid and cid not in seen:
                    seen.append(cid)
                    print(cid)
        return
    if action not in ("add", "remove"):
        print(f"ERROR: unknown action {action}", file=sys.stderr)
        sys.exit(1)
    if not uuid:
        print("ERROR: uuid required", file=sys.stderr)
        sys.exit(1)
    for ib in inbounds:
        settings = ib.setdefault("settings", {})
        settings["clients"] = mutate_clients(list(settings.get("clients") or []))
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
        f.write("\n")
    restart_standalone(config_path)
    print(f"OK {action} {uuid}")

def run_xui_backend():
    conn = sqlite3.connect(xui_db)
    conn.row_factory = sqlite3.Row
    rows = list(
        conn.execute(
            "SELECT id, port, protocol, settings FROM inbounds WHERE protocol = 'vless'"
        )
    )
    if inbound_port is not None:
        matching = [row for row in rows if row["port"] == inbound_port]
        # If port 2053 exists, prefer it; still include other vless rows that
        # already have clients (Hiddify/3x-ui sometimes split listen vs port).
        with_clients = []
        for row in rows:
            settings = json.loads(row["settings"] or "{}")
            if settings.get("clients"):
                with_clients.append(row)
        chosen = matching or with_clients or rows
    else:
        chosen = rows
    rows = chosen
    if action == "list":
        seen = []
        for row in rows:
            settings = json.loads(row["settings"] or "{}")
            for c in settings.get("clients") or []:
                cid = c.get("id")
                if cid and cid not in seen:
                    seen.append(cid)
                    print(cid)
        conn.close()
        return
    if action not in ("add", "remove"):
        print(f"ERROR: unknown action {action}", file=sys.stderr)
        sys.exit(1)
    if not uuid:
        print("ERROR: uuid required", file=sys.stderr)
        sys.exit(1)
    if not rows:
        hint = f" port {inbound_port}" if inbound_port else ""
        print(f"ERROR: no vless inbound{hint} in 3x-ui db", file=sys.stderr)
        sys.exit(1)
    for row in rows:
        settings = json.loads(row["settings"] or "{}")
        settings["clients"] = mutate_clients(list(settings.get("clients") or []))
        conn.execute(
            "UPDATE inbounds SET settings = ? WHERE id = ?",
            (json.dumps(settings, ensure_ascii=False), row["id"]),
        )
    conn.commit()
    conn.close()
    restart_xui()
    print(f"OK {action} {uuid} x-ui")

# Standalone Xray (CDN Origin) vs 3x-ui (home Hiddify box).
standalone = Path("/usr/local/etc/xray/config.json")
if standalone.is_file():
    config_path = str(standalone)
    run_file_backend()
elif xui_db:
    run_xui_backend()
elif config_path:
    run_file_backend()
else:
    print("ERROR: no Xray config.json and no 3x-ui database found", file=sys.stderr)
    sys.exit(1)
PY
