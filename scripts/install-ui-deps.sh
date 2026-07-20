#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm add @radix-ui/react-label @radix-ui/react-select
echo "Installed Radix UI deps for Select and Label"
