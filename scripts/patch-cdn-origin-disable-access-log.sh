#!/usr/bin/env bash
# One-shot on CDN Origin (e.g. 185.247.185.3): stop nginx access logs filling the disk.
# Usage: bash scripts/patch-cdn-origin-disable-access-log.sh
# Or paste the body over SSH.
set -euo pipefail

CONF="${1:-/etc/nginx/sites-available/xhttp-origin.conf}"

if [[ ! -f "$CONF" ]]; then
  echo "ERROR: nginx site not found: $CONF" >&2
  exit 1
fi

echo "=== disk before ==="
df -h / | tail -1
du -sh /var/log/nginx 2>/dev/null || true
ls -lah /var/log/nginx 2>/dev/null || true

# Ensure access_log off in every server { } block (idempotent-ish)
if grep -qE '^\s*access_log\s+off;' "$CONF"; then
  echo "access_log off already present in $CONF"
else
  # Insert after each "server {" line once
  tmp="$(mktemp)"
  awk '
    /^[[:space:]]*server[[:space:]]*\{/ {
      print
      print "    access_log off;"
      print "    error_log /var/log/nginx/origin-error.log warn;"
      next
    }
    { print }
  ' "$CONF" > "$tmp"
  cp "$CONF" "${CONF}.bak.$(date +%Y%m%d%H%M%S)"
  mv "$tmp" "$CONF"
  echo "Patched $CONF"
fi

nginx -t
systemctl reload nginx

# Free space from existing access logs
for f in /var/log/nginx/access.log /var/log/nginx/access.log.*; do
  [[ -e "$f" ]] || continue
  echo "Truncating $f"
  truncate -s 0 "$f" 2>/dev/null || : > "$f"
done
# Remove rotated bulky copies if present
find /var/log/nginx -type f \( -name 'access.log.*.gz' -o -name 'access.log.[0-9]*' \) -delete 2>/dev/null || true

journalctl --vacuum-size=200M >/dev/null 2>&1 || true

echo "=== disk after ==="
df -h / | tail -1
du -sh /var/log/nginx 2>/dev/null || true
echo "OK: nginx access logging disabled on Origin"
