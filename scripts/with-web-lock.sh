#!/usr/bin/env bash
# Runs a command while holding the web lock (checkpoint C1, section 4; checkpoint C2, S1).
# The lock is global across every git worktree ($CAREPATH_DATA_ROOT/web.lock, see scripts/data-root.sh):
# each worktree has its own apps/web/.next, but the machine has 2 CPUs and 7 GB, so only one web build,
# `next start` plus Playwright run may happen at a time on the machine.
# Usage: scripts/with-web-lock.sh <command> [args...]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/data-root.sh
source scripts/data-root.sh
exec flock -o "$CAREPATH_DATA_ROOT/web.lock" "$@"
