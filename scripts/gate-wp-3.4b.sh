#!/usr/bin/env bash
# WP 3.4b gate (web: admin assignment, patient and public fixes, slice test, illustrations) on this package's
# own ports: API 4035, web 3035, database carepath_wp34b_<pid> (checkpoint C2, section 6.3).
# Lints, type-checks and tests only the paths this package owns, checks the seed, builds the web app, runs the
# slice, patient and auth Playwright specs at both widths with screenshots into docs/screenshots/3.4b, then
# `pnpm verify`. Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-3.4b.sh   skip the final `pnpm verify` (development loops only)
#   GATE_E2E_ARGS="slice"                         narrow the Playwright run (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp34b 4035 3035 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  apps/web/lib apps/web/components "apps/web/app/(public)" "apps/web/app/(patient)" "apps/web/app/(admin)"
  apps/web/e2e/auth.spec.ts apps/web/e2e/patient.spec.ts apps/web/e2e/patient-helpers.ts
  apps/web/e2e/slice.spec.ts apps/web/e2e/fixtures.ts apps/web/e2e/clinician-helpers.ts
  packages/db/seed/careplans.ts packages/db/seed/data/exercise-media.ts
)
run pnpm db:migrate
run pnpm db:seed --profile small
run pnpm db:seed --profile small --check
run pnpm --filter @carepath/web typecheck
run pnpm --filter @carepath/db typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/db test
run scripts/with-web-lock.sh pnpm --filter @carepath/web build
export SCREENSHOT_DIR="$PWD/docs/screenshots/3.4b"
mkdir -p "$SCREENSHOT_DIR"
export E2E_ARGS="${GATE_E2E_ARGS:-slice patient auth}"
run scripts/with-web-lock.sh scripts/e2e.sh
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  unset E2E_ARGS SCREENSHOT_DIR
  run pnpm verify
fi
echo; echo "WP 3.4b gate: PASSED"
