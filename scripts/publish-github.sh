#!/usr/bin/env bash
# Run once from WSL project root to verify CI locally and publish to GitHub.
#
# Preferred:
#   bash scripts/publish-github.sh
# Also OK (piped) if you already `cd` into the project:
#   sed 's/\r$//' scripts/publish-github.sh | bash
set -euo pipefail

resolve_root() {
  # When executed as a file, BASH_SOURCE points at this script.
  local src="${BASH_SOURCE[0]:-}"
  if [[ -n "$src" && "$src" != "bash" && "$src" != "-bash" && "$src" != "/dev/fd/"* && -f "$src" ]]; then
    local dir
    dir="$(cd "$(dirname "$src")" && pwd)"
    if [[ -f "$dir/../package.json" && -f "$dir/../scripts/install-vless-reality.sh" ]]; then
      cd "$dir/.."
      return 0
    fi
  fi

  # Piped via stdin: stay in cwd if it looks like the project, else try common path.
  if [[ -f package.json && -d scripts && -f scripts/install-vless-reality.sh ]]; then
    return 0
  fi
  if [[ -f "$HOME/vpn-saas-mvp-wsl/package.json" ]]; then
    cd "$HOME/vpn-saas-mvp-wsl"
    return 0
  fi

  echo "ERROR: Could not find project root."
  echo "Run:  cd ~/vpn-saas-mvp-wsl && bash scripts/publish-github.sh"
  exit 1
}

resolve_root
ROOT="$(pwd)"
echo "Project root: $ROOT"

if [[ ! -f "$ROOT/package.json" || ! -f "$ROOT/scripts/install-vless-reality.sh" ]]; then
  echo "ERROR: Refusing to run outside VLESS Manager project (found wrong root: $ROOT)"
  exit 1
fi

# Do NOT use ~/ as workspace — a parent pnpm-lock.yaml breaks installs
if [[ "$ROOT" == "$HOME" ]]; then
  echo "ERROR: Project root resolved to HOME. Aborting to avoid touching ~/node_modules."
  exit 1
fi

export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://example.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-demo-anon-key}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-demo-service-key}"
export CI=true

corepack enable
corepack prepare pnpm@9.15.9 --activate

echo "=== pnpm install ==="
pnpm install --dir "$ROOT"

echo "=== lint ==="
pnpm --dir "$ROOT" run lint

echo "=== typecheck ==="
pnpm --dir "$ROOT" exec tsc --noEmit

echo "=== build ==="
pnpm --dir "$ROOT" run build

echo "=== Local CI checks passed ==="

if [ ! -d .git ]; then
  git init
fi

git add -A
git reset HEAD -- .env.local 2>/dev/null || true
git status

if git diff --cached --quiet; then
  echo "Nothing staged to commit."
else
  git commit -m "feat: MVP ready for production - WG Manager with VLESS Reality automation" || true
fi

git branch -M main

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    if git remote get-url origin >/dev/null 2>&1; then
      git push -u origin main
    else
      gh repo create wg-manager --public --source=. --remote=origin --push \
        || gh repo create wg-manager-vpn --public --source=. --remote=origin --push
    fi
    git remote -v
    git log -1 --oneline
  else
    echo "gh is installed but not logged in. Run: gh auth login"
    echo "Then: gh repo create wg-manager --public --source=. --remote=origin --push"
  fi
else
  cat <<'EOF'
gh CLI not found. Create the repo manually:

1. https://github.com/new  → name: wg-manager → Public → Create (no README)
2. Then run:

   git remote add origin https://github.com/YOUR_USER/wg-manager.git
   git push -u origin main

Or install GitHub CLI: https://cli.github.com/
EOF
fi
