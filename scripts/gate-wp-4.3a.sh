#!/usr/bin/env bash
# WP 4.3a gate (patient appointments and messages) on this package's own ports: API 4043, web 3043,
# database carepath_wp43a_<pid> (checkpoint C2, section 6.3). Lints, type-checks and formats only the paths
# the package owns, builds the web app, then runs two end-to-end stages with screenshots into
# docs/screenshots/4.3a:
#   1. Scenario E at 390 and 1440, the two-browser "That time was just taken" test, the keyboard pass,
#      message send, and the existing patient and auth specs (their navigation assertions changed);
#   2. the forced-failure messaging spec, with the API started with MESSAGE_FORCE_FAILURE=true.
# Then `pnpm verify` (which also runs every spec, without screenshots and without the failure flag) and
# a clean `git status`. Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-4.3a.sh   skip the final `pnpm verify` (development loops only)
#   GATE_E2E_ARGS="patient-scheduling"            narrow stage 1 (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp43a 4043 3043 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  "apps/web/app/(patient)"
  apps/web/e2e/patient-scheduling.spec.ts apps/web/e2e/patient-messaging-failure.spec.ts
  apps/web/e2e/patient.spec.ts apps/web/e2e/auth.spec.ts
)
run pnpm db:migrate
run pnpm db:seed --profile small
run pnpm db:seed --profile small --check
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/web test
run scripts/with-web-lock.sh pnpm --filter @carepath/web build
export SCREENSHOT_DIR="$PWD/docs/screenshots/4.3a"
mkdir -p "$SCREENSHOT_DIR"
export E2E_ARGS="${GATE_E2E_ARGS:-patient-scheduling patient.spec auth.spec}"
run scripts/with-web-lock.sh scripts/e2e.sh
if [ -z "${GATE_E2E_ARGS:-}" ]; then
  echo; echo "==> forced delivery failure stage (API started with MESSAGE_FORCE_FAILURE=true)"
  export E2E_ARGS="patient-messaging-failure"
  MESSAGE_FORCE_FAILURE=true run scripts/with-web-lock.sh scripts/e2e.sh
fi
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  unset E2E_ARGS SCREENSHOT_DIR
  run pnpm verify
fi
echo; echo "==> git status"
test -z "$(git status --porcelain)" || { git status --porcelain; echo "FAILED: working tree not clean" >&2; exit 1; }
echo "(clean)"
echo; echo "WP 4.3a gate: PASSED"
