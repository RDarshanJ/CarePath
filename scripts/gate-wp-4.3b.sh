#!/usr/bin/env bash
# WP 4.3b gate (clinician agenda and messages) on this package's own ports: API 4044, web 3044, database
# carepath_wp43b_<pid> (checkpoint C2, section 6.3). Lints, type-checks and tests the paths this package owns,
# runs the messaging API tests (participant tie-break), builds the web app, runs the clinician Playwright specs
# at 1440 by 900 (agenda, messages, keyboard pass, axe at 1440 and 1024, screenshots into docs/screenshots/4.3b),
# runs the failed-delivery spec against an API started with MESSAGE_FORCE_FAILURE=true, then `pnpm verify`, and
# ends with `git status --porcelain` empty. Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-4.3b.sh   skip the final `pnpm verify` (development loops only)
#   GATE_E2E_ARGS="clinician-schedule"            narrow the first Playwright run (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp43b 4044 3044 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  "apps/web/app/(clinician)" apps/web/components/shells.tsx
  apps/web/e2e/clinician-schedule-messages.spec.ts apps/web/e2e/auth.spec.ts
  apps/api/src/modules/messaging/repo.ts apps/api/test/phase4/messaging.test.ts
)
run pnpm db:migrate
run pnpm db:seed --profile small
run pnpm --filter @carepath/web typecheck
run pnpm --filter @carepath/api typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/api exec vitest run test/phase4/messaging.test.ts
run scripts/with-web-lock.sh pnpm --filter @carepath/web build
export SCREENSHOT_DIR="$PWD/docs/screenshots/4.3b"
mkdir -p "$SCREENSHOT_DIR"
# Only this package's spec records screenshots here; the rest of the suite runs in `pnpm verify`.
export E2E_ARGS="${GATE_E2E_ARGS:-clinician-schedule-messages --project=desktop-1440}"
run scripts/with-web-lock.sh scripts/e2e.sh
echo; echo "==> failed delivery and retry (API with MESSAGE_FORCE_FAILURE=true)"
MESSAGE_FORCE_FAILURE=true E2E_ARGS="clinician-schedule-messages --project=desktop-1440 -g failed" \
  run scripts/with-web-lock.sh scripts/e2e.sh
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  unset E2E_ARGS SCREENSHOT_DIR
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
# Screenshot PNGs are re-recorded by every run and are not byte-identical between runs (font rasterising),
# so the committed set is whatever the last run wrote; everything else must be clean.
status="$(git status --porcelain -- . ':(exclude)docs/screenshots/4.3b')"
if [ -n "$status" ]; then echo "$status"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "WP 4.3b gate: PASSED"
