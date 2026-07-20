#!/bin/bash
set -euo pipefail
echo CONNECTED
echo ==== STATUS ====
systemctl status xray --no-pager -l | head -35 || true
echo ==== SS ====
ss -tlnp | grep -E '2053|443' || true
echo ==== VERSION ====
xray version 2>&1 | head -5 || true
echo ==== CONFIG ====
cat /usr/local/etc/xray/config.json
echo ==== DEST ====
curl -sI --connect-timeout 5 https://www.apple.com 2>&1 | head -12 || true
timeout 5 openssl s_client -connect www.apple.com:443 -servername www.apple.com </dev/null 2>&1 | head -25 || true
echo ==== UFW ====
ufw status 2>&1 | head -20 || true
echo ==== IPTABLES ====
iptables -L INPUT -n 2>&1 | head -30 || true
echo ==== JOURNAL ====
journalctl -u xray -n 50 --no-pager 2>&1 || true
echo ==== TIME ====
timedatectl 2>&1 | head -10 || true
date -u
timeout 2 bash -c 'echo >/dev/tcp/127.0.0.1/2053' && echo 2053_OPEN || echo 2053_CLOSED
echo DIAG_DONE