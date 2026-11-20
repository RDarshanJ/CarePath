#!/usr/bin/env bash
# WP 5.2 gate (AI summaries, SOAP drafts, review and notes) on this package's own port: API 4052,
# database carepath_wp52_<pid>. Migrates, checks the migration against schema.prisma, runs the
# phase5_ai_review database tests, seeds and checks the seed, runs the Scenario F API tests (generate,
# inspect source, edit, approve; audit; note signed only by its author; consent refusal; cross-patient
# evidence; failed and timed-out generations; rate limit; CR-7, CR-8, CR-16), the M8 enumeration
# test, lints, type-checks and format-checks the paths this package owns, checks openapi.json, then
# `pnpm verify`, and ends with a clean `git status`. Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-5.2.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp52 4052 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  packages/db/test/phase5-ai-review.test.ts
  packages/db/seed/ai.ts
  packages/db/seed/documentation.ts
  packages/db/seed/integrity.ts
  packages/db/seed/build.ts
  packages/shared/src/contracts/ai.ts
  packages/shared/src/contracts/errors.ts
  packages/shared/src/contracts/overview.ts
  apps/api/src/modules/ai
  apps/api/src/modules/notes
  apps/api/src/modules/overview
  apps/api/src/config.ts
  apps/api/src/app.ts
  apps/api/src/core/audit
  apps/api/test/phase5
  apps/api/test/support/fixtures/ai.ts
  apps/api/test/phase3/m8-enumeration.test.ts
)

run pnpm db:migrate
run pnpm --filter @carepath/db migrate:check
run pnpm --filter @carepath/db exec vitest run test/phase5-ai-review.test.ts --reporter=verbose
run pnpm db:seed
run pnpm db:seed --check
run pnpm --filter @carepath/api exec vitest run test/phase5/ai.test.ts --reporter=verbose
run pnpm --filter @carepath/api exec vitest run test/phase3/m8-enumeration.test.ts
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/shared typecheck
run pnpm --filter @carepath/db typecheck
run pnpm --filter @carepath/api typecheck
run pnpm openapi:check
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
run bash -c 'test -z "$(git status --porcelain)" || { git status --porcelain; exit 1; }'
echo; echo "WP 5.2 gate: PASSED"
