#!/bin/sh
# Placeholder for PRISMA_SCHEMA_ENGINE_BINARY during `prisma generate`.
# Generation never runs the schema engine, but the Prisma CLI tries to download the native
# binary from binaries.prisma.sh first, which this environment blocks. Pointing the CLI at this
# file skips the download. Migrations use the WebAssembly engine (scripts/schema-engine.ts).
echo "schema engine binary is not available here; use pnpm --filter @carepath/db migrate:*" >&2
exit 1
