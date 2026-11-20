#!/usr/bin/env bash
# WP 4.2 gate: messaging API (checkpoint C2, sections 6.3 and 6.4). API port 4042, database
# carepath_wp42_<pid> (own database through scripts/gate-env.sh; never stops the shared cluster).
# Stages: migrate, seed check, scoped type check, lint and format of the paths this package owns,
# messaging tests (unread counts, failure and retry, participant-only access, audited coordinator
# read), the M8 enumeration test, the whole API test suite, openapi:check, then `pnpm verify`.
#
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-4.2.sh   skip the final `pnpm verify` (development loops only)
#   GATE_ONLY=test GATE_FILTER=messaging scripts/gate-wp-4.2.sh   migrate, then only matching API tests
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp42 4042 || { echo "FAILED: gate environment" >&2; exit 1; }
stage() { local name="$1"; shift; echo; echo "==> $name"; "$@" || { echo "FAILED: $name" >&2; exit 1; }; }

OWNED=(
  packages/shared/src/contracts/messaging.ts
  packages/shared/src/contracts/today.ts
  packages/shared/src/contracts/overview.ts
  packages/shared/src/contracts/index.ts
  apps/api/src/modules/messaging
  apps/api/src/modules/today/routes.ts
  apps/api/src/modules/overview/routes.ts
  apps/api/src/jobs/handlers.ts
  apps/api/src/core/jobs
  apps/api/src/config.ts
  apps/api/src/server.ts
  apps/api/src/app.ts
  apps/api/test/phase4
  apps/api/test/phase3/m8-enumeration.test.ts
  apps/api/test/support/fixtures/messaging.ts
)

stage "migrate" pnpm db:migrate
if [ "${GATE_ONLY:-}" = "test" ]; then
  stage "API tests (${GATE_FILTER:-all})" pnpm --filter @carepath/api exec vitest run ${GATE_FILTER:-}
  echo; echo "WP 4.2 gate: partial run (GATE_ONLY=test), not a gate result"; exit 0
fi
stage "seed (small profile)" pnpm db:seed --profile small
stage "seed integrity check" pnpm db:seed --profile small --check
stage "typecheck (shared, db, api)" pnpm --filter @carepath/shared --filter @carepath/db --filter @carepath/api typecheck
stage "lint (paths owned by WP 4.2)" pnpm exec eslint "${OWNED[@]}"
stage "format (paths owned by WP 4.2)" pnpm exec prettier --check "${OWNED[@]}"
stage "messaging tests: unread, failure and retry, participant-only access, coordinator audit" \
  pnpm --filter @carepath/api exec vitest run test/phase4/messaging.test.ts
stage "M8 enumeration" pnpm --filter @carepath/api exec vitest run test/phase3/m8-enumeration.test.ts
stage "API tests (all)" pnpm --filter @carepath/api test
stage "OpenAPI check" pnpm openapi:check
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  stage "pnpm verify" pnpm verify
fi
stage "git status clean" bash -c 'test -z "$(git status --porcelain)" || { git status --porcelain; exit 1; }'
echo; echo "WP 4.2 gate: PASSED"
