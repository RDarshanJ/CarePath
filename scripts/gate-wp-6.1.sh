#!/usr/bin/env bash
# WP 6.1 gate (admin API: metrics CR-13, availability writes CR-14, audit query CR-15, eligibility
# codes) on this package's own port: API 4061, database carepath_wp61_<pid>. Migrates
# (wp61_admin_api), checks the migrations against schema.prisma, runs the database tests for the
# revoked-code check, the shared tests (label maps exhaustive), the admin API tests (metric
# reconciliation: every drill-down list has as many rows as its number; availability conflicts;
# audit paging and filters; eligibility codes; permission denials), the M8 enumeration test and the
# scheduling, authz and onboarding tests that the changes touch, seeds and checks the seed, then
# reconciles the six metrics on the seeded database against independent SQL counts and walks every
# drill-down list. Lints, format-checks and type-checks the paths this package owns, checks
# openapi.json, then `pnpm verify`, and ends with a clean `git status`. Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-6.1.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp61 4061 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  packages/db/test/wp61-admin-api.test.ts
  packages/shared/src/contracts/admin.ts
  packages/shared/src/contracts/errors.ts
  packages/shared/src/contracts/index.ts
  packages/shared/src/contracts/scheduling.ts
  packages/shared/src/labels
  apps/api/src/app.ts
  apps/api/src/core/audit
  apps/api/src/core/time.ts
  apps/api/src/modules/admin
  apps/api/src/modules/scheduling
  apps/api/src/modules/onboarding
  apps/api/scripts/admin-metrics-check.ts
  apps/api/test/phase6
  apps/api/test/support/admin
  apps/api/test/phase3/m8-enumeration.test.ts
)

run pnpm db:migrate
run pnpm --filter @carepath/db migrate:check
run pnpm --filter @carepath/db exec vitest run --reporter=verbose test/wp61-admin-api.test.ts
run pnpm --filter @carepath/shared exec vitest run
run pnpm --filter @carepath/api exec vitest run --reporter=verbose test/phase6
run pnpm --filter @carepath/api exec vitest run test/phase3/m8-enumeration.test.ts test/phase3/onboarding.test.ts test/phase4 test/core/authz.test.ts test/core/contracts.test.ts
run pnpm db:seed
run pnpm db:seed --check
echo; echo "==> seeded database: metrics against independent SQL, every drill-down list walked"
run pnpm --filter @carepath/api exec tsx scripts/admin-metrics-check.ts
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/shared typecheck
run pnpm --filter @carepath/db typecheck
run pnpm --filter @carepath/api typecheck
run pnpm --filter @carepath/web typecheck
run pnpm openapi:check
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "WP 6.1 gate: PASSED"
