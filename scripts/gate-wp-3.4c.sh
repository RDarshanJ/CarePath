#!/usr/bin/env bash
# WP 3.4c gate (clinician UI) on this package's own ports: API 4036, web 3036, database carepath_wp34c_<pid>.
# Lints, type-checks and tests only the paths this package owns, builds the web app, runs the clinician
# Playwright specs at 1440 by 900 (Scenarios B and D, queue table, intake, the cross-role test, axe, keyboard pass, screenshots at
# 1440 and 1024 into docs/screenshots/3.4c), then `pnpm verify`. Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-3.4c.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp34c 4036 3036 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=("apps/web/app/(clinician)" apps/web/e2e/clinician-helpers.ts apps/web/e2e/clinician-screens.spec.ts apps/web/e2e/clinician-scenario-b.spec.ts apps/web/e2e/clinician-scenario-d.spec.ts apps/web/e2e/clinician-cross-role.spec.ts apps/web/e2e/clinician-keyboard.spec.ts scripts/e2e.sh)
run pnpm db:migrate
run pnpm db:seed --profile small
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]:0:7}"
run pnpm exec prettier --check "${OWNED[@]:0:7}"
run scripts/with-web-lock.sh pnpm --filter @carepath/web build
export SCREENSHOT_DIR="$PWD/docs/screenshots/3.4c"
mkdir -p "$SCREENSHOT_DIR"
export E2E_ARGS="clinician- --project=desktop-1440"
run scripts/with-web-lock.sh scripts/e2e.sh
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  unset E2E_ARGS
  run pnpm verify
fi
echo; echo "WP 3.4c gate: PASSED"
