#!/usr/bin/env bash
# WP 3.2a gate (web foundation) on this package's own ports: API 4032, web 3032, database carepath_wp32_<pid>.
# Lints, type-checks and tests only the paths this package owns, then builds and runs the end-to-end stage.
# Set SCREENSHOT_DIR to save the sign-in and shell screenshots. Never stops the shared cluster.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp32 4032 3032 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
run pnpm db:migrate
run pnpm db:seed --profile small
run pnpm --filter @carepath/web typecheck
run pnpm --filter @carepath/web test
run pnpm exec eslint apps/web eslint.config.mjs
run pnpm exec prettier --check apps/web eslint.config.mjs
run scripts/with-web-lock.sh pnpm --filter @carepath/web build
run scripts/with-web-lock.sh scripts/e2e.sh
echo; echo "WP 3.2a gate: PASSED"
