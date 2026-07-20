#!/usr/bin/env bash
set -euo pipefail
TARGET="/home/user/vpn-saas-mvp-wsl/src/app/dashboard/servers/[id]/setup/page.tsx"
cat > "$TARGET" <<'EOF'
export { default } from "@/components/servers/server-setup-page";
EOF
echo "Updated $TARGET to re-export server-setup-page with diagnostics support"
