#!/usr/bin/env bash
# WP 4.1 gate (scheduling) on this package's own port: API 4041, database carepath_wp41_<pid>.
# Migrates, runs the phase4_scheduling trigger tests (one rejection per condition), the booking
# concurrency test (50 parallel requests for one slot, 20 repetitions, over real HTTP on
# API_PORT), the scheduling API tests and M8, lints and type-checks the paths this package owns,
# checks openapi.json, then `pnpm verify`, and ends with a clean `git status`.
# Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-4.1.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp41 4041 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
# TypeScript paths this package owns or touched (the migration is SQL and is checked by migrate:check).
OWNED=(
  packages/db/test/phase4-scheduling.test.ts
  packages/db/seed/scheduling.ts
  packages/db/seed/integrity.ts
  packages/shared/src/contracts/scheduling.ts
  packages/shared/src/contracts/today.ts
  packages/shared/src/contracts/errors.ts
  apps/api/src/modules/scheduling
  apps/api/src/modules/today
  apps/api/src/core/scope
  apps/api/src/core/db
  apps/api/src/jobs
  apps/api/test/phase4
  apps/api/test/support/scheduling
  apps/api/test/phase3/m8-enumeration.test.ts
)
export BOOKING_CONCURRENCY_OUT="${BOOKING_CONCURRENCY_OUT:-$(mktemp -t booking-concurrency.XXXXXX.json)}"

run pnpm db:migrate
run pnpm --filter @carepath/db migrate:check
run pnpm --filter @carepath/db exec vitest run test/phase4-scheduling.test.ts --reporter=verbose
run pnpm --filter @carepath/api exec vitest run test/phase4/booking-concurrency.test.ts
echo; echo "==> booking concurrency results ($BOOKING_CONCURRENCY_OUT)"
node -e '
const d = require(process.argv[1]);
let ok = true;
for (const r of d.results) {
  console.log(`rep ${String(r.repetition).padStart(2)}: 201=${r.created} 409 booking_conflict=${r.bookingConflict} other=${r.other} live=${r.liveAppointments} slot=${r.slotStatus} wall=${r.wallMs}ms slowest=${r.slowestMs}ms`);
  if (r.created !== 1 || r.bookingConflict !== d.parallel - 1 || r.other !== 0) ok = false;
}
const walls = d.results.map((r) => r.wallMs).sort((a, b) => a - b);
console.log(`repetitions=${d.results.length} parallel=${d.parallel} all exactly one 201: ${ok} wall ms min=${walls[0]} median=${walls[Math.floor(walls.length / 2)]} max=${walls[walls.length - 1]}`);
process.exit(ok && d.results.length === d.repetitions ? 0 : 1);
' "$BOOKING_CONCURRENCY_OUT" || { echo "FAILED: booking concurrency" >&2; exit 1; }
run pnpm --filter @carepath/api exec vitest run test/phase4/scheduling.test.ts test/phase3/m8-enumeration.test.ts
run pnpm --filter @carepath/shared typecheck
run pnpm --filter @carepath/db typecheck
run pnpm --filter @carepath/api typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm openapi:check
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "WP 4.1 gate: PASSED"
