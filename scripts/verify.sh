#!/usr/bin/env bash
# `pnpm verify`: the single gate command (ADR-14). Exit code is the truth.
# Stages marked SKIPPED are not implemented yet; each names the work package that adds it (none at present).
# A skipped stage is printed loudly so a green run is never mistaken for full coverage.
#
# Concurrency (checkpoint C1, section 4): the run takes a lease on the shared cluster through
# scripts/gate-env.sh and works in its own fresh database (carepath_verify_<pid>), dropped on exit.
# It never stops a cluster another worker is using. Ports: API 4090, web 3090.
# The cluster, leases and web lock live under CAREPATH_DATA_ROOT (scripts/data-root.sh), shared by every
# git worktree; the web lock serialises build and end-to-end across worktrees, so the fixed ports are safe.
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
echo "data root: $CAREPATH_DATA_ROOT"
# A run that starts with docs/ clean must end with docs/ clean (checkpoint C2, F5).
DOCS_STATUS_BEFORE="$(git status --porcelain --untracked-files=all -- docs/)"

stage "migrate" pnpm db:migrate
stage "seed (small profile)" pnpm db:seed --profile small
stage "typecheck" pnpm typecheck
stage "lint" pnpm lint
stage "unit + API tests" pnpm test
stage "build" scripts/with-web-lock.sh pnpm build
# verify never records screenshots into docs/: they go to scratch in this worktree (checkpoint C2, F5).
export SCREENSHOT_DIR="$PWD/.data/verify-screenshots"
stage "end-to-end (API + next start + Playwright + axe)" scripts/with-web-lock.sh scripts/e2e.sh
docs_clean() {
  local dirty
  dirty="$(git status --porcelain --untracked-files=all -- docs/)"
  if [ -n "$dirty" ] && [ "$dirty" != "$DOCS_STATUS_BEFORE" ]; then
    echo "docs/ changed during verify:" >&2
    echo "$dirty" >&2
    return 1
  fi
}
stage "docs/ unchanged by the run" docs_clean

echo
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  echo "verify: PASSED with skipped stages:"
  printf '  - %s\n' "${SKIPPED[@]}"
else
  echo "verify: PASSED"
fi
