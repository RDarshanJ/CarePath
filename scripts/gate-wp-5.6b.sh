#!/usr/bin/env bash
# WP 5.6b gate (checkpoint C3 fixes B1 to B8) on this package's own port: API 4056, database
# carepath_wp56b_<pid>. Migrates (phase5_c3_fixes), checks the migrations against schema.prisma,
# runs the database tests for the note rules (entered-in-error check and freeze trigger, the
# note.mark_entered_in_error grant, one signed note per encounter) and the role matrix, seeds and
# checks the seed (including "at most one signed note per encounter"), runs the API tests
# (Scenario F, the C3 fixes, FHIR, M8, the role matrix), the @carepath/fhir tests, exports every
# seeded patient through the three FHIR layers, lints, format-checks and type-checks the paths
# this package owns, checks openapi.json, then `pnpm verify`, and ends with a clean `git status`.
# Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-5.6b.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp56b 4056 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  packages/db/test/phase5-c3-fixes.test.ts
  packages/db/seed/integrity.ts
  packages/fhir
  packages/shared/src/contracts/ai.ts
  packages/shared/src/contracts/permissions.ts
  packages/shared/src/contracts/errors.ts
  packages/shared/src/labels/ai.ts
  packages/shared/src/labels/note.ts
  packages/shared/src/copy.ts
  packages/shared/src/copy.test.ts
  apps/api/src/core/authz/permissions.ts
  apps/api/src/modules/ai
  apps/api/src/modules/notes
  apps/api/src/modules/fhir
  apps/api/test/phase5
  apps/api/test/support/fixtures/ai.ts
  apps/api/test/phase3/m8-enumeration.test.ts
)

run pnpm db:migrate
run pnpm --filter @carepath/db migrate:check
run pnpm --filter @carepath/db exec vitest run --reporter=verbose test/phase5-c3-fixes.test.ts test/phase5-ai-review.test.ts
run pnpm db:seed
run pnpm db:seed --check
run pnpm --filter @carepath/api exec vitest run --reporter=verbose test/phase5/c3-fixes.test.ts test/phase5/ai.test.ts test/phase5/fhir.test.ts test/core/authz.test.ts
run pnpm --filter @carepath/api exec vitest run test/phase3/m8-enumeration.test.ts
run pnpm --filter @carepath/shared exec vitest run
run pnpm --filter @carepath/fhir exec vitest run
echo; echo "==> seeded database: every patient exported through the three layers"
run pnpm --silent db:seed --profile small
run pnpm --filter @carepath/api exec tsx scripts/fhir-export-check.ts
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/shared typecheck
run pnpm --filter @carepath/db typecheck
run pnpm --filter @carepath/fhir typecheck
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
echo; echo "WP 5.6b gate: PASSED"
