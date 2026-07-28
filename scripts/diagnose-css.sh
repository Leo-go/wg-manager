#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-/tmp/css-diagnose.txt}"
{
  echo "=== 1. www.wg-manager.online headers ==="
  curl -sI https://www.wg-manager.online || true
  echo
  echo "=== 2. wg-manager.online headers ==="
  curl -sI https://wg-manager.online || true
  echo
  echo "=== 3. wg-manager.ru headers ==="
  curl -sI https://wg-manager.ru || true
  echo
  echo "=== 4. www.wg-manager.ru headers ==="
  curl -sI https://www.wg-manager.ru || true
  echo
  echo "=== 5. wg-manager-pi.vercel.app headers ==="
  curl -sI https://wg-manager-pi.vercel.app || true
  echo
  echo "=== 6. www HTML head (first 120 lines) ==="
  curl -s https://www.wg-manager.online | head -120 || true
  echo
  echo "=== link/script extraction ==="
  curl -s https://www.wg-manager.online | grep -EOi '<(link|script)[^>]+>' || true
  echo
  CSS_PATH=$(curl -s https://www.wg-manager.online | grep -oE '/_next/static/[^"'\'' ]+\.css' | head -1 || true)
  echo "CSS_PATH=$CSS_PATH"
  if [[ -n "${CSS_PATH:-}" ]]; then
    echo
    echo "=== 7a. CSS on custom domain ==="
    curl -sI "https://www.wg-manager.online${CSS_PATH}" || true
    echo
    echo "=== 7b. CSS on vercel.app ==="
    curl -sI "https://wg-manager-pi.vercel.app${CSS_PATH}" || true
    echo
    echo "=== 7c. CSS body custom (5 lines) ==="
    curl -s "https://www.wg-manager.online${CSS_PATH}" | head -5 || true
    echo
    echo "=== 7d. CSS body vercel (5 lines) ==="
    curl -s "https://wg-manager-pi.vercel.app${CSS_PATH}" | head -5 || true
  fi
  JS_PATH=$(curl -s https://www.wg-manager.online | grep -oE '/_next/static/[^"'\'' ]+\.js' | head -1 || true)
  echo
  echo "JS_PATH=$JS_PATH"
  if [[ -n "${JS_PATH:-}" ]]; then
    echo "=== 8a. JS on custom domain ==="
    curl -sI "https://www.wg-manager.online${JS_PATH}" || true
    echo
    echo "=== 8b. JS on vercel.app ==="
    curl -sI "https://wg-manager-pi.vercel.app${JS_PATH}" || true
    echo
    echo "=== 8c. JS body custom (3 lines) ==="
    curl -s "https://www.wg-manager.online${JS_PATH}" | head -3 || true
    echo
    echo "=== 8d. JS body vercel (3 lines) ==="
    curl -s "https://wg-manager-pi.vercel.app${JS_PATH}" | head -3 || true
  fi
  echo
  echo "=== 9. dig ==="
  for h in www.wg-manager.online wg-manager.online wg-manager.ru www.wg-manager.ru wg-manager-pi.vercel.app; do
    echo "--- $h A ---"
    dig +short "$h" A || true
    echo "--- $h CNAME ---"
    dig +short "$h" CNAME || true
  done
} | tee "$OUT"
echo "WROTE $OUT"
