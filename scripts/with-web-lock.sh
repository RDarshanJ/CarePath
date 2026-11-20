#!/usr/bin/env bash
# Runs a command while holding the web lock (checkpoint C1, section 4). The web build, `next start`
# and Playwright write or read the one apps/web/.next directory, so only one may run at a time.
# Usage: scripts/with-web-lock.sh <command> [args...]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
exec flock .data/web.lock "$@"
