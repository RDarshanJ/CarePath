# shellcheck shell=bash
# Shared data root (checkpoint C2, S1). Sourced by db.sh, with-web-lock.sh, e2e.sh and the gates.
#
# Every git worktree of this repository shares one PostgreSQL cluster, one lease directory and one
# web lock. They live under CAREPATH_DATA_ROOT, which defaults to `.data` beside the main checkout:
# the parent of `git rev-parse --git-common-dir`. Outside git the default is `.data` in this checkout.
#
#   export CAREPATH_DATA_ROOT=/some/dir   overrides the default (the same value in every worktree)
#
# Sets and exports CAREPATH_DATA_ROOT (absolute). Worktree-local scratch (end-to-end logs, apps/web/.next)
# stays in the worktree; only shared state goes here.
if [ -z "${CAREPATH_DATA_ROOT:-}" ]; then
  _cp_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  _cp_common="$(git -C "$_cp_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [ -n "$_cp_common" ]; then
    CAREPATH_DATA_ROOT="$(dirname "$_cp_common")/.data"
  else
    CAREPATH_DATA_ROOT="$_cp_root/.data"
  fi
  unset _cp_root _cp_common
fi
mkdir -p "$CAREPATH_DATA_ROOT"
CAREPATH_DATA_ROOT="$(cd "$CAREPATH_DATA_ROOT" && pwd)"
export CAREPATH_DATA_ROOT
