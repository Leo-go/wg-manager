#!/usr/bin/env bash
# Run once from WSL project root to verify CI locally and publish to GitHub.
set -euo pipefail
cd "$(dirname "$0")/.."

export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://example.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-demo-anon-key}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-demo-service-key}"

corepack enable
# pnpm 11+ needs Node >= 22.13; pin 9.x for Node 20 local/dev compatibility
corepack prepare pnpm@9.15.9 --activate
pnpm install
pnpm lint
pnpm exec tsc --noEmit
pnpm build

echo "=== Local CI checks passed ==="

if [ ! -d .git ]; then
  git init
fi

git add -A
# Never commit secrets
git reset HEAD -- .env.local 2>/dev/null || true
git status

if git diff --cached --quiet && git diff --quiet; then
  echo "Nothing to commit (working tree clean or only ignored files)."
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
