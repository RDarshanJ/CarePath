#!/usr/bin/env bash
# WP 3.1 gate: API for Scenarios A to D (checkpoint C1, section 5.4).
#
# Takes a lease on the shared cluster through scripts/gate-env.sh (database carepath_wp31_<pid>,
# API port 4031), never stops a cluster another worker is using, and drops its database on exit.
# Stages: migrate, seed (small profile, integrity checks), scoped type check, scoped lint,
# API tests (Scenarios A to D, the M8 enumeration test), OpenAPI check.
#
#   scripts/gate-wp-3.1.sh                 full gate
#   GATE_ONLY=test GATE_FILTER=sessions scripts/gate-wp-3.1.sh
#                                          migrate, then only API test files matching the filter
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

stage() {
  local name="$1"; shift
  echo
  echo "==> $name"
  if ! "$@"; then
    echo "FAILED: $name" >&2
    exit 1
  fi
}

echo "==> gate environment"
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp31 4031 || { echo "FAILED: gate environment" >&2; exit 1; }
echo "database: $CAREPATH_DB"

stage "migrate" pnpm db:migrate

if [ "${GATE_ONLY:-}" = "test" ]; then
  stage "API tests (${GATE_FILTER:-all})" pnpm --filter @carepath/api exec vitest run ${GATE_FILTER:-}
  echo
  echo "WP 3.1 gate: partial run (GATE_ONLY=test), not a gate result"
  exit 0
fi

stage "seed (small profile)" pnpm db:seed --profile small
stage "typecheck (shared, db, api)" pnpm --filter @carepath/shared --filter @carepath/db --filter @carepath/api typecheck
stage "lint (paths owned by WP 3.1)" pnpm exec eslint packages/shared packages/db/src packages/db/seed apps/api
stage "format (paths owned by WP 3.1)" pnpm exec prettier --check packages/shared packages/db/src packages/db/seed apps/api
stage "db tests" pnpm --filter @carepath/db exec vitest run
stage "API tests" pnpm --filter @carepath/api test
stage "OpenAPI check" pnpm openapi:check

echo
echo "WP 3.1 gate: PASSED"
