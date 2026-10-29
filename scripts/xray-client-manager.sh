#!/bin/bash
# Manage VLESS clients in Xray / 3x-ui.
# Usage: xray-client-manager.sh <add|remove|list> [uuid] [email]
# Optional env:
#   XRAY_CONFIG         explicit config.json
#   XRAY_INBOUND_PORT   only touch this listen port (RU relay :443 / legacy :2053)
# add is idempotent: if UUID already enabled, prints "OK skip" and does NOT
# restart xray/x-ui (avoids dropping every online user on each Connect).
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
export XRAY_API="${XRAY_API:-1}"
export XRAY_API_ADDR="${XRAY_API_ADDR:-127.0.0.1:10085}"
export XRAY_API_INBOUND_TAGS="${XRAY_API_INBOUND_TAGS:-}"

python3 - << 'PY'
import copy
import json
import os
import secrets
import shutil
import sqlite3
import string
import subprocess
import sys
import time
from pathlib import Path

action = os.environ["ACTION"]
uuid = os.environ.get("UUID", "")
email_raw = os.environ.get("EMAIL", "")
# Comma-separated aliases: primary first, then legacy labels for cleanup.
emails = [e.strip() for e in email_raw.split(",") if e.strip()]
primary_email = emails[0] if emails else ""
config_path = os.environ.get("CONFIG", "").strip()
xui_db = os.environ.get("XUI_DB", "").strip()
port_raw = os.environ.get("XRAY_INBOUND_PORT", "").strip()
inbound_port = int(port_raw) if port_raw.isdigit() else None

def vless_inbounds(cfg):
    rows = [ib for ib in cfg.get("inbounds", []) if ib.get("protocol") == "vless"]
    if inbound_port is not None:
        rows = [ib for ib in rows if ib.get("port") == inbound_port]
    return rows

def client_matches(c):
    if uuid and c.get("id") == uuid:
        return True
    em = c.get("email")
    if em and em in emails:
        return True
    return False

def dedupe_clients(clients):
    """Keep last occurrence of each uuid and each non-empty email.
    Broken configs with duplicate emails make *any* later restart fail —
    the error names the stale user, not the person clicking Connect."""
    by_uuid = {}
    no_id = []
    for c in clients:
        cid = c.get("id")
        if not cid:
            no_id.append(c)
            continue
        by_uuid[cid] = c
    ordered = list(by_uuid.values()) + no_id
    seen_emails = set()
    out = []
    for c in reversed(ordered):
        em = c.get("email")
        if em:
            if em in seen_emails:
                continue
            seen_emails.add(em)
        out.append(c)
    out.reverse()
    return out

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
    if primary_email:
        client["email"] = primary_email
    elif not client.get("email"):
        client["email"] = f"tg-{uuid[:8]}"
    client["expiryTime"] = 0
    if not client.get("subId"):
        alphabet = string.ascii_lowercase + string.digits
        client["subId"] = "".join(secrets.choice(alphabet) for _ in range(16))
    return client

def uuid_enabled(clients):
    for c in clients:
        if c.get("id") == uuid and c.get("enable", True) is not False:
            return True
    return False

def mutate_clients(clients):
    """Idempotent upsert/remove. Prefer in-place update when UUID already exists."""
    if action == "add":
        if any(c.get("id") == uuid for c in clients):
            out = []
            for c in clients:
                if c.get("id") == uuid:
                    c = copy.deepcopy(c)
                    c["enable"] = True
                    if primary_email:
                        c["email"] = primary_email
                    c["expiryTime"] = 0
                    out.append(c)
                elif primary_email and c.get("email") == primary_email:
                    # Drop stale row that stole the email under another uuid.
                    continue
                elif client_matches(c):
                    continue
                else:
                    out.append(c)
            return dedupe_clients(out)
        matched = [c for c in clients if client_matches(c)]
        others = [c for c in clients if not client_matches(c)]
        others.append(build_client(matched))
        return dedupe_clients(others)
    if action == "remove":
        return dedupe_clients([c for c in clients if not client_matches(c)])
    return clients

def runtime_reload_needed(before_clients, after_clients):
    """Restart Xray only when the live auth set changes (new/removed/re-enabled UUID)."""
    if action == "add":
        return not uuid_enabled(before_clients) and uuid_enabled(after_clients)
    if action == "remove":
        before_ids = {c.get("id") for c in before_clients if c.get("id")}
        after_ids = {c.get("id") for c in after_clients if c.get("id")}
        return uuid in before_ids and uuid not in after_ids
    return before_clients != after_clients

def _token(n=16):
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))

def _table_exists(conn, name):
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return bool(row)

def _table_columns(conn, name):
    return {r[1] for r in conn.execute(f"PRAGMA table_info({name})")}

def _delete_xui_client_row(conn, row, cols):
    cid = row["id"]
    old_email = row["email"] if "email" in row.keys() else None
    if _table_exists(conn, "client_inbounds"):
        conn.execute("DELETE FROM client_inbounds WHERE client_id = ?", (cid,))
    if _table_exists(conn, "client_traffics") and old_email:
        conn.execute("DELETE FROM client_traffics WHERE email = ?", (old_email,))
    conn.execute("DELETE FROM clients WHERE id = ?", (cid,))

def sync_xui_clients_table(conn, inbound_ids):
    """3x-ui 3.3+ generates live Xray clients from `clients` + `client_inbounds`,
    not from inbounds.settings. Writing only the JSON leaves the UUID dead."""
    if not inbound_ids or not _table_exists(conn, "clients"):
        return
    cols = _table_columns(conn, "clients")
    if "uuid" not in cols:
        return
    now = int(time.time() * 1000)
    resolved_email = primary_email or f"tg-{uuid[:8]}"
    row = conn.execute("SELECT * FROM clients WHERE uuid = ?", (uuid,)).fetchone()
    if action == "remove":
        targets = []
        if row:
            targets.append(row)
        if emails and "email" in cols:
            for em in emails:
                for r in conn.execute(
                    "SELECT * FROM clients WHERE email = ?", (em,)
                ).fetchall():
                    if all(t["id"] != r["id"] for t in targets):
                        targets.append(r)
        for target in targets:
            _delete_xui_client_row(conn, target, cols)
        return
    if action != "add":
        return
    # Drop stale rows that share a legacy/primary email but a different uuid.
    if emails and "email" in cols:
        for em in emails:
            for stale in conn.execute(
                "SELECT * FROM clients WHERE email = ? AND uuid != ?",
                (em, uuid),
            ).fetchall():
                _delete_xui_client_row(conn, stale, cols)
        row = conn.execute(
            "SELECT * FROM clients WHERE uuid = ?", (uuid,)
        ).fetchone()
    if row:
        cid = row["id"]
        if "email" in cols and primary_email:
            if "updated_at" in cols:
                conn.execute(
                    "UPDATE clients SET email = ?, enable = 1, expiry_time = 0, updated_at = ? WHERE id = ?",
                    (primary_email, now, cid),
                )
            else:
                conn.execute(
                    "UPDATE clients SET email = ?, enable = 1 WHERE id = ?",
                    (primary_email, cid),
                )
            resolved_email = primary_email
        elif "enable" in cols and "updated_at" in cols:
            conn.execute(
                "UPDATE clients SET enable = 1, expiry_time = 0, updated_at = ? WHERE id = ?",
                (now, cid),
            )
        elif "enable" in cols:
            conn.execute("UPDATE clients SET enable = 1 WHERE id = ?", (cid,))
    else:
        insert_cols = []
        values = []
        wanted = [
            ("email", resolved_email),
            ("sub_id", _token()),
            ("uuid", uuid),
            ("password", _token()),
            ("auth", _token()),
            ("flow", ""),
            ("security", "auto"),
            ("reverse", ""),
            ("limit_ip", 0),
            ("total_gb", 0),
            ("expiry_time", 0),
            ("enable", 1),
            ("tg_id", 0),
            ("comment", ""),
            ("reset", 0),
            ("created_at", now),
            ("updated_at", now),
            ("group_name", ""),
        ]
        for name, value in wanted:
            if name in cols:
                insert_cols.append(name)
                values.append(value)
        placeholders = ", ".join("?" for _ in insert_cols)
        conn.execute(
            f"INSERT INTO clients ({', '.join(insert_cols)}) VALUES ({placeholders})",
            values,
        )
        cid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    if _table_exists(conn, "client_inbounds"):
        for iid in inbound_ids:
            exists = conn.execute(
                "SELECT 1 FROM client_inbounds WHERE client_id = ? AND inbound_id = ?",
                (cid, iid),
            ).fetchone()
            if not exists:
                ib_cols = _table_columns(conn, "client_inbounds")
                ib_insert = ["client_id", "inbound_id"]
                ib_values = [cid, iid]
                if "flow_override" in ib_cols:
                    ib_insert.append("flow_override")
                    ib_values.append("")
                if "created_at" in ib_cols:
                    ib_insert.append("created_at")
                    ib_values.append(now)
                conn.execute(
                    f"INSERT INTO client_inbounds ({', '.join(ib_insert)}) VALUES ({', '.join('?' for _ in ib_insert)})",
                    ib_values,
                )
    if _table_exists(conn, "client_traffics"):
        traf_cols = _table_columns(conn, "client_traffics")
        for iid in inbound_ids:
            exists = conn.execute(
                "SELECT 1 FROM client_traffics WHERE inbound_id = ? AND email = ?",
                (iid, resolved_email),
            ).fetchone()
            if exists:
                continue
            t_insert = []
            t_values = []
            wanted_t = [
                ("inbound_id", iid),
                ("enable", 1),
                ("email", resolved_email),
                ("up", 0),
                ("down", 0),
                ("expiry_time", 0),
                ("total", 0),
                ("reset", 0),
                ("last_online", 0),
            ]
            for name, value in wanted_t:
                if name in traf_cols:
                    t_insert.append(name)
                    t_values.append(value)
            conn.execute(
                f"INSERT INTO client_traffics ({', '.join(t_insert)}) VALUES ({', '.join('?' for _ in t_insert)})",
                t_values,
            )

def xray_bin():
    p = "/usr/local/bin/xray"
    return p if Path(p).is_file() else "xray"

def restart_standalone(cfg_path):
    subprocess.run([xray_bin(), "run", "-test", "-c", cfg_path], check=True)
    subprocess.run(["systemctl", "restart", "xray"], check=True)

def api_enabled(cfg):
    if os.environ.get("XRAY_API", "1").strip() in ("0", "false", "no"):
        return False
    api = cfg.get("api") or {}
    if not api:
        return False
    for ib in cfg.get("inbounds", []):
        if ib.get("tag") == "api" or ib.get("protocol") == "dokodemo-door":
            listen = str(ib.get("listen") or "")
            if listen in ("127.0.0.1", "localhost", "0.0.0.0", ""):
                return True
    return False

def api_addr():
    return os.environ.get("XRAY_API_ADDR", "127.0.0.1:10085").strip() or "127.0.0.1:10085"

def api_inbound_tags(cfg, mutated_tags):
    raw = os.environ.get("XRAY_API_INBOUND_TAGS", "").strip()
    if raw:
        return [t.strip() for t in raw.split(",") if t.strip()]
    tags = [t for t in mutated_tags if t]
    if tags:
        return tags
    # Prefer client-facing RU tags when present.
    prefer = []
    for ib in cfg.get("inbounds", []):
        tag = str(ib.get("tag") or "")
        if tag.startswith("ru-relay-in") or tag in ("vless-in", "inbound-vless"):
            prefer.append(tag)
    return prefer or [
        str(ib.get("tag"))
        for ib in vless_inbounds(cfg)
        if ib.get("tag")
    ]

def try_api_hot_reload(cfg, action_name, client_obj, mutated_tags):
    """Apply add/remove via Xray HandlerService without restarting the process."""
    if not api_enabled(cfg):
        return False
    tags = api_inbound_tags(cfg, mutated_tags)
    if not tags:
        return False
    server = api_addr()
    xb = xray_bin()
    try:
        if action_name == "add":
            payload = json.dumps([client_obj], ensure_ascii=False)
            for tag in tags:
                cmd = [
                    xb,
                    "api",
                    "adu",
                    f"-s={server}",
                    f"-inbound={tag}",
                ]
                proc = subprocess.run(
                    cmd,
                    input=payload.encode("utf-8"),
                    capture_output=True,
                    check=False,
                )
                if proc.returncode != 0:
                    # Older CLI uses --server=
                    cmd2 = [
                        xb,
                        "api",
                        "adu",
                        f"--server={server}",
                        f"--inbound={tag}",
                    ]
                    proc = subprocess.run(
                        cmd2,
                        input=payload.encode("utf-8"),
                        capture_output=True,
                        check=False,
                    )
                if proc.returncode != 0:
                    err = (proc.stderr or proc.stdout or b"").decode(
                        errors="replace"
                    )[:300]
                    print(f"WARN api adu {tag}: {err}", file=sys.stderr)
                    return False
            return True
        if action_name == "remove":
            emails_to_rm = []
            if primary_email:
                emails_to_rm.append(primary_email)
            emails_to_rm.extend(e for e in emails if e not in emails_to_rm)
            if not emails_to_rm and client_obj.get("email"):
                emails_to_rm.append(client_obj["email"])
            for tag in tags:
                for em in emails_to_rm:
                    cmd = [xb, "api", "rmu", f"-s={server}", f"-inbound={tag}", em]
                    proc = subprocess.run(cmd, capture_output=True, check=False)
                    if proc.returncode != 0:
                        cmd2 = [
                            xb,
                            "api",
                            "rmu",
                            f"--server={server}",
                            f"--inbound={tag}",
                            em,
                        ]
                        proc = subprocess.run(
                            cmd2, capture_output=True, check=False
                        )
                    # Missing user is OK on remove.
                    if proc.returncode not in (0,):
                        err = (proc.stderr or proc.stdout or b"").decode(
                            errors="replace"
                        )
                        if "not found" not in err.lower() and "UserNotFound" not in err:
                            print(f"WARN api rmu {tag} {em}: {err[:200]}", file=sys.stderr)
                            return False
            return True
    except FileNotFoundError:
        return False
    except Exception as e:
        print(f"WARN api hot reload failed: {e}", file=sys.stderr)
        return False
    return False

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
    need_reload = False
    mutated_tags = []
    client_for_api = None
    for ib in inbounds:
        settings = ib.setdefault("settings", {})
        before = list(settings.get("clients") or [])
        after = mutate_clients(before)
        if after != before:
            settings["clients"] = after
            tag = str(ib.get("tag") or "")
            if tag:
                mutated_tags.append(tag)
            if action == "add":
                for c in after:
                    if c.get("id") == uuid:
                        client_for_api = c
                        break
        if runtime_reload_needed(before, after):
            need_reload = True
    # Heal duplicate emails in every vless inbound (port filter may skip some).
    for ib in cfg.get("inbounds", []):
        if ib.get("protocol") != "vless":
            continue
        settings = ib.setdefault("settings", {})
        before = list(settings.get("clients") or [])
        after = dedupe_clients(before)
        if after != before:
            settings["clients"] = after
            # Dedupe removed a live uuid duplicate — reload to drop the stale peer.
            before_ids = [c.get("id") for c in before if c.get("id")]
            after_ids = [c.get("id") for c in after if c.get("id")]
            if len(before_ids) != len(after_ids) or sorted(before_ids) != sorted(set(after_ids)):
                need_reload = True
    if not need_reload:
        # Persist email/enable tweaks without bouncing every online user.
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
            f.write("\n")
        print(f"OK skip {action} {uuid} (already present, no xray restart)")
        return
    backup_path = config_path + ".bak"
    shutil.copy2(config_path, backup_path)
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
        f.write("\n")
    if client_for_api is None and action == "add":
        client_for_api = build_client([])
    if try_api_hot_reload(cfg, action, client_for_api or {"id": uuid, "email": primary_email or f"tg-{uuid[:8]}"}, mutated_tags):
        print(f"OK api {action} {uuid}")
        return
    try:
        restart_standalone(config_path)
    except Exception:
        shutil.copy2(backup_path, config_path)
        raise
    print(f"OK {action} {uuid} (restart fallback)")

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
    inbound_ids = [row["id"] for row in rows]
    need_reload = False
    for row in rows:
        settings = json.loads(row["settings"] or "{}")
        before = list(settings.get("clients") or [])
        after = mutate_clients(before)
        if after != before:
            settings["clients"] = after
            conn.execute(
                "UPDATE inbounds SET settings = ? WHERE id = ?",
                (json.dumps(settings, ensure_ascii=False), row["id"]),
            )
        if runtime_reload_needed(before, after):
            need_reload = True
    # clients table may lack the uuid even when inbound JSON already has it
    if action == "add" and _table_exists(conn, "clients"):
        cols = _table_columns(conn, "clients")
        if "uuid" in cols:
            row = conn.execute(
                "SELECT enable FROM clients WHERE uuid = ?", (uuid,)
            ).fetchone()
            if row is None:
                need_reload = True
            elif "enable" in cols and not row["enable"]:
                need_reload = True
    elif action == "remove" and _table_exists(conn, "clients"):
        cols = _table_columns(conn, "clients")
        if "uuid" in cols:
            row = conn.execute(
                "SELECT 1 FROM clients WHERE uuid = ?", (uuid,)
            ).fetchone()
            if row is not None:
                need_reload = True
    sync_xui_clients_table(conn, inbound_ids)
    conn.commit()
    conn.close()
    if not need_reload:
        print(f"OK skip {action} {uuid} x-ui (already present, no restart)")
        return
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
