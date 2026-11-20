#!/usr/bin/env bash
# `pnpm verify`: the single gate command (ADR-14). Exit code is the truth.
# Stages marked SKIPPED are not implemented yet; each names the work package that adds it.
# A skipped stage is printed loudly so a green run is never mistaken for full coverage.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SKIPPED=()
cleanup() {
  scripts/db.sh stop || true
}
trap cleanup EXIT

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

stage "db start" scripts/db.sh start
stage "migrate" pnpm db:migrate
stage "seed (small profile)" pnpm db:seed --profile small
stage "typecheck" pnpm typecheck
stage "lint" pnpm lint
stage "unit + API tests" pnpm test
stage "build" pnpm build
skip "start servers + Playwright + axe" "WP 2.2 / WP 3.2"

echo
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  echo "verify: PASSED with skipped stages:"
  printf '  - %s\n' "${SKIPPED[@]}"
else
  echo "verify: PASSED"
fi
