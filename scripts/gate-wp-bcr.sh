#!/usr/bin/env bash
# WP B-CR gate (contract batch CR-6, CR-9, CR-10, CR-11, CR-12, CR-17) on this package's own ports:
# API 4034, web 3034, database carepath_wpbcr_<pid>. Migrates, checks the migration against
# schema.prisma, runs the migration database tests, seeds and checks the seed, runs the API tests
# for each CR and the M8 enumeration, the shared label-map tests, lints, type-checks and
# format-checks the paths this package owns, checks openapi.json, builds the web app and runs the
# Playwright check that no URL contains the search term in the directory and admin patients, then
# `pnpm verify`, and ends with a clean `git status`. Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-bcr.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wpbcr 4034 3034 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  packages/db/seed
  packages/db/test/bcr-contract-batch.test.ts
  packages/shared/src/contracts
  packages/shared/src/labels
  apps/api/src/core/idempotency
  apps/api/src/modules/sessions
  apps/api/src/modules/review
  apps/api/src/modules/patients
  apps/api/src/modules/scheduling
  apps/api/test/bcr
  apps/api/test/phase3/clinician-reads.test.ts
  apps/api/test/phase3/m8-enumeration.test.ts
  "apps/web/app/(clinician)/_lib/queries.ts"
  "apps/web/app/(clinician)/patients/directory.tsx"
  "apps/web/app/(admin)/_lib/queries.ts"
  "apps/web/app/(admin)/admin/patients/patients.tsx"
  apps/web/e2e/bcr-search-privacy.spec.ts
  apps/web/e2e/clinician-helpers.ts
  apps/web/e2e/slice.spec.ts
)

run pnpm db:migrate
run pnpm --filter @carepath/db migrate:check
run pnpm --filter @carepath/db exec vitest run test/bcr-contract-batch.test.ts --reporter=verbose
run pnpm db:seed
run pnpm db:seed --check
run pnpm --filter @carepath/shared exec vitest run
run pnpm --filter @carepath/api exec vitest run test/bcr/contract-batch.test.ts --reporter=verbose
run pnpm --filter @carepath/api exec vitest run test/phase3/clinician-reads.test.ts test/phase3/review.test.ts test/phase3/sessions.test.ts test/phase4/scheduling.test.ts
run pnpm --filter @carepath/api exec vitest run test/phase3/m8-enumeration.test.ts
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/shared typecheck
run pnpm --filter @carepath/db typecheck
run pnpm --filter @carepath/api typecheck
run pnpm --filter @carepath/web typecheck
run pnpm openapi:check
# Playwright: the search term never appears in a URL (CR-12, DR-002 R2).
run scripts/with-web-lock.sh pnpm --filter @carepath/web build
export E2E_ARGS="bcr-search-privacy --project=desktop-1440"
run scripts/with-web-lock.sh scripts/e2e.sh
unset E2E_ARGS
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
run bash -c 'test -z "$(git status --porcelain)" || { git status --porcelain; exit 1; }'
echo; echo "WP B-CR gate: PASSED"
