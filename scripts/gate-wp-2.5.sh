#!/usr/bin/env bash
# WP 2.5 gate: tokens, UI primitives, /design-system gallery. Starts and stops its own server. Exit code is the truth.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pnpm install
pnpm --filter ui test
pnpm --filter @carepath/ui typecheck
pnpm --filter @carepath/web typecheck
pnpm exec eslint packages/ui apps/web
pnpm exec prettier --check packages/ui apps/web docs/design-system
pnpm --filter @carepath/web build
pnpm --filter @carepath/web screenshots
echo "WP 2.5 gate: PASSED"
