#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

pnpm remove @supabase/auth-helpers-nextjs || true
pnpm add @supabase/ssr
pnpm install

echo "Installed @supabase/ssr successfully"
ls node_modules/@supabase/ssr/package.json
