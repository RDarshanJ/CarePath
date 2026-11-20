#!/usr/bin/env bash
# `pnpm verify`: the single gate command (ADR-14). Exit code is the truth.
# Stages marked SKIPPED are not implemented yet; each names the work package that adds it.
# A skipped stage is printed loudly so a green run is never mistaken for full coverage.
#
# Concurrency (checkpoint C1, section 4): the run takes a lease on the shared cluster through
# scripts/gate-env.sh and works in its own fresh database (carepath_verify_<pid>), dropped on exit.
# It never stops a cluster another worker is using. Ports: API 4090, web 3090.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SKIPPED=()

stage() {
  local name="$1"; shift
  echo
  echo "==> $name"
  if ! "$@"; then
    echo "FAILED: $name" >&2
    exit 1
  fi
}

skip() {
  echo
  echo "==> $1: SKIPPED (not implemented until $2)"
  SKIPPED+=("$1 [$2]")
}

echo "==> gate environment"
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh verify 4090 3090 || { echo "FAILED: gate environment" >&2; exit 1; }
echo "database: $CAREPATH_DB"

stage "migrate" pnpm db:migrate
stage "seed (small profile)" pnpm db:seed --profile small
stage "typecheck" pnpm typecheck
stage "lint" pnpm lint
stage "unit + API tests" pnpm test
stage "build" scripts/with-web-lock.sh pnpm build
skip "start servers + Playwright + axe (runs under scripts/with-web-lock.sh)" "WP 3.2a"

echo
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  echo "verify: PASSED with skipped stages:"
  printf '  - %s\n' "${SKIPPED[@]}"
else
  echo "verify: PASSED"
fi
