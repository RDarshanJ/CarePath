#!/usr/bin/env bash
# WP 2.4 gate: API core (auth, ctx, scoped repos, error envelope, audit, rate limit, OpenAPI,
# job runner). Starts Postgres if it is not running and stops it again only in that case, so a
# concurrent worker's database is left alone. Exit code is the truth.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

started_db=0
if ! scripts/db.sh status >/dev/null 2>&1; then
  scripts/db.sh start
  started_db=1
fi
cleanup() { if [ "$started_db" = 1 ]; then scripts/db.sh stop || true; fi; }
trap cleanup EXIT

pnpm --filter @carepath/api typecheck
pnpm exec eslint apps/api
pnpm exec prettier --check apps/api packages/db/prisma/migrations/20261120120000_role_permissions
# Applies migrations (including the role permissions migration), then the core API tests.
pnpm --filter api test core
pnpm openapi:check
echo "WP 2.4 gate: PASSED"
