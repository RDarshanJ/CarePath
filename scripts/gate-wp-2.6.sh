#!/usr/bin/env bash
# WP 2.6 gate: deterministic seed generator. Exit code is the truth.
# Works in a scratch database so it never wipes data another process is using, and stops the
# local cluster only if this script started it.
# Seeds the small profile twice and requires identical per-table checksums and content hash,
# then runs the seed tests (pure generator, determinism, integrity, full profile in a second scratch database).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

STARTED_DB=0
SCRATCH="carepath_wp26_gate"
PSQL=(psql -h 127.0.0.1 -p 54329 -U carepath -d postgres -qtA -v ON_ERROR_STOP=1)
cleanup() {
  "${PSQL[@]}" -c "DROP DATABASE IF EXISTS \"$SCRATCH\" WITH (FORCE)" >/dev/null 2>&1 || true
  if [ "$STARTED_DB" = "1" ]; then scripts/db.sh stop || true; fi
}
trap cleanup EXIT

pnpm install --offline
if ! scripts/db.sh status >/dev/null 2>&1; then STARTED_DB=1; fi
scripts/db.sh start
"${PSQL[@]}" -c "DROP DATABASE IF EXISTS \"$SCRATCH\" WITH (FORCE)" -c "CREATE DATABASE \"$SCRATCH\""
export DATABASE_URL="postgresql://carepath:carepath@127.0.0.1:54329/$SCRATCH"

pnpm db:migrate
pnpm db:seed --profile small | tee /tmp/seed-run-1.txt
pnpm db:seed --profile small | tee /tmp/seed-run-2.txt
# Compare everything from the first table line on (timings in the header differ).
diff <(sed -n '/^  /,$p' /tmp/seed-run-1.txt) <(sed -n '/^  /,$p' /tmp/seed-run-2.txt)
echo "row checksums identical across two runs"
pnpm db:seed --check --profile small
unset DATABASE_URL

pnpm --filter @carepath/db typecheck
pnpm --filter @carepath/shared typecheck
pnpm --filter @carepath/db exec vitest run test/seed.test.ts
pnpm exec eslint packages/db packages/shared
pnpm exec prettier --check packages/db packages/shared scripts docs/demo-accounts.md package.json
echo "WP 2.6 gate: PASSED"
