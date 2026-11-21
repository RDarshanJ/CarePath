#!/usr/bin/env bash
# `scripts/vercel-check.sh`: local evidence for the Vercel deployment (docs/deployment.md).
# It does not deploy anything and needs no Vercel account.
#
# API project (Root Directory apps/api):
#   1. copies the tracked and new files of this checkout into a scratch folder,
#   2. runs the project's install command there (offline here; Vercel runs it online),
#   3. runs `pnpm run vercel-build` (the project's build command) as a production build with
#      CAREPATH_DEPLOY_MIGRATE=1 and CAREPATH_DEPLOY_SEED=1 against a fresh, empty gate database:
#      the first build migrates and seeds; a preview build skips the database step; after the
#      function has written data, a second build migrates but does not reseed; a third with
#      CAREPATH_DEPLOY_RESEED=1 reseeds; a build whose migration cannot connect fails,
#   4. traces server.mjs with @vercel/nft plus the includeFiles of apps/api/vercel.json and copies
#      only the traced files into an empty folder, as a Vercel Function would hold them,
#   5. loads that copy the way Vercel's Node runtime does (scripts/vercel-harness.mjs) with
#      NODE_ENV=production against its own migrated and seeded database, and drives it over HTTP.
# Web project (Root Directory apps/web):
#   6. in another scratch copy, runs the project's install command and `next build --webpack` with
#      API_ORIGIN set to an https origin, and checks that the /api rewrite in the build output
#      points at it.
#
# Usage: scripts/vercel-check.sh [api|web]   (default: both)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"
WHAT="${1:-all}"
API_ORIGIN_EXAMPLE="https://carepath-api.example.vercel.app"
WEB_ORIGIN_EXAMPLE="https://carepath-web.example.vercel.app"

fail() { echo "FAILED: $*" >&2; exit 1; }

copy_checkout() {
  SCRATCH="$(mktemp -d /tmp/carepath-vercel.XXXXXX)"
  echo "==> copy checkout to $SCRATCH/repo"
  mkdir -p "$SCRATCH/repo"
  git ls-files -co --exclude-standard -z | tar --null -T - -cf - | tar -xf - -C "$SCRATCH/repo" \
    || fail "copy"
}

# The API build as Vercel runs it for production with the database step on. The gate database
# stands in for Neon: DATABASE_URL_UNPOOLED and DATABASE_URL both name it.
api_build() {
  local label="$1"; shift
  local log="$SCRATCH/build-$label.log"
  (
    cd "$SCRATCH/repo/apps/api" &&
      env VERCEL=1 VERCEL_ENV=production DATABASE_URL_UNPOOLED="$DATABASE_URL" \
        CAREPATH_DEPLOY_MIGRATE=1 CAREPATH_DEPLOY_SEED=1 "$@" pnpm run vercel-build >"$log" 2>&1
  )
  local code=$?
  grep -E '^vercel-build:|^seed:|^content-hash|^total rows' "$log"
  return "$code"
}

sql() { psql "$DATABASE_URL" -qtA -c "$1"; }

check_api() {
  echo "==> gate environment (fresh, empty database)"
  # shellcheck source=scripts/gate-env.sh
  source scripts/gate-env.sh vercel 4092 || fail "gate environment"
  echo "database: $CAREPATH_DB"
  [ "$(sql "SELECT count(*) FROM information_schema.tables WHERE table_name = 'Organization'")" = "0" ] \
    || fail "the gate database is not empty"

  copy_checkout

  echo "==> install (apps/api/vercel.json installCommand, offline)"
  local install
  install="$(node -e 'console.log(require("./apps/api/vercel.json").installCommand)')"
  (cd "$SCRATCH/repo/apps/api" && CI=1 $install --offline 2>&1 | tail -1) || fail "install"

  echo "==> build 1 (empty database): expect migrate and seed"
  api_build first || fail "vercel-build (first)"
  grep -q "has no organizations: loading the small seed" "$SCRATCH/build-first.log" || fail "first build did not seed"
  local orgs
  orgs="$(sql 'SELECT count(*) FROM "Organization"')"
  [ "$orgs" -gt 0 ] || fail "no organizations after the first build"
  echo "organizations after build 1: $orgs"

  echo "==> preview build: expect the database step to be skipped"
  (cd "$SCRATCH/repo/apps/api" && VERCEL=1 VERCEL_ENV=preview CAREPATH_DEPLOY_MIGRATE=1 \
    CAREPATH_DEPLOY_SEED=1 CAREPATH_DEPLOY_RESEED=1 DATABASE_URL_UNPOOLED="$DATABASE_URL" \
    pnpm run vercel-build 2>&1 | grep '^vercel-build:') || fail "vercel-build (preview)"

  echo "==> trace the function files"
  local includes=()
  mapfile -t includes < <(node -e \
    'for (const g of require("./apps/api/vercel.json").functions["server.mjs"].includeFiles) console.log(g)')
  node scripts/vercel-trace.mjs "$SCRATCH/repo" apps/api/server.mjs "$SCRATCH/fn" "${includes[@]}" \
    || fail "trace"
  if find "$SCRATCH/fn" -name '*.ts' ! -name '*.d.ts' | grep -q .; then
    find "$SCRATCH/fn" -name '*.ts' ! -name '*.d.ts' | head -5
    fail "the traced function still contains TypeScript sources"
  fi

  echo "==> run the traced function as Vercel loads it (NODE_ENV=production)"
  (
    cd "$SCRATCH/fn/apps/api" &&
      env -i PATH="$PATH" HOME="$HOME" VERCEL=1 DATABASE_URL="$DATABASE_URL" \
        SESSION_SECRET="vercel-check-session-secret-$RANDOM$RANDOM" \
        CRON_SECRET="vercel-check-cron-secret-$RANDOM$RANDOM" \
        CORS_ORIGINS="$WEB_ORIGIN_EXAMPLE" TRUST_PROXY=loopback JOBS_INLINE=1 LOG_LEVEL=warn \
        node "$ROOT/scripts/vercel-harness.mjs" server.mjs
  ) || fail "harness"

  # The harness sent one message. A reseed would delete it.
  local marker='SELECT count(*) FROM "Message" WHERE body = '"'"'Deployment check message.'"'"''
  [ "$(sql "$marker")" = "1" ] || fail "the harness message is missing"

  echo "==> build 2 (database has tenant data): expect migrate only, no reseed"
  api_build second || fail "vercel-build (second)"
  grep -q "seed skipped: .* already has $orgs organizations" "$SCRATCH/build-second.log" \
    || fail "second build did not skip the seed"
  [ "$(sql "$marker")" = "1" ] || fail "the second build replaced the data"
  echo "harness message still present after build 2: the database was not reseeded"

  echo "==> build 3 with CAREPATH_DEPLOY_RESEED=1: expect a reseed"
  api_build third CAREPATH_DEPLOY_RESEED=1 || fail "vercel-build (reseed)"
  grep -q "CAREPATH_DEPLOY_RESEED=1: replacing" "$SCRATCH/build-third.log" || fail "reseed did not run"
  [ "$(sql "$marker")" = "0" ] || fail "the reseed kept the harness message"
  echo "harness message gone after build 3: the forced reseed replaced the data"

  echo "==> a failing migration fails the build"
  if (cd "$SCRATCH/repo/apps/api" && VERCEL=1 VERCEL_ENV=production CAREPATH_DEPLOY_MIGRATE=1 \
    DATABASE_URL_UNPOOLED="postgresql://carepath:wrong@127.0.0.1:${DB_PORT:-54329}/no_such_db" \
    pnpm run vercel-build >"$SCRATCH/build-bad.log" 2>&1); then
    fail "the build passed with an unreachable database"
  fi
  grep '^vercel-build: FAILED' "$SCRATCH/build-bad.log" || fail "no failure line"
  rm -rf "$SCRATCH"
}

check_web() {
  # A scratch copy has its own apps/web/.next, so this needs no web lock.
  copy_checkout
  echo "==> install (apps/web/vercel.json installCommand, offline)"
  local install
  install="$(node -e 'console.log(require("./apps/web/vercel.json").installCommand)')"
  (cd "$SCRATCH/repo/apps/web" && CI=1 $install --offline 2>&1 | tail -1) || fail "install"
  echo "==> build (apps/web/vercel.json buildCommand) with API_ORIGIN=$API_ORIGIN_EXAMPLE"
  local build
  build="$(node -e 'console.log(require("./apps/web/vercel.json").buildCommand)')"
  (cd "$SCRATCH/repo/apps/web" && API_ORIGIN="$API_ORIGIN_EXAMPLE" NEXT_TELEMETRY_DISABLED=1 $build 2>&1 | tail -4) \
    || fail "next build"
  node -e '
    const m = require(process.argv[2] + "/apps/web/.next/routes-manifest.json");
    const all = [].concat(m.rewrites?.beforeFiles ?? [], m.rewrites?.afterFiles ?? [], m.rewrites?.fallback ?? [], Array.isArray(m.rewrites) ? m.rewrites : []);
    const r = all.find((x) => x.source === "/api/:path*");
    if (!r || r.destination !== process.argv[1] + "/:path*") { console.error("rewrite:", JSON.stringify(r)); process.exit(1); }
    console.log("rewrite /api/:path* -> " + r.destination);
  ' "$API_ORIGIN_EXAMPLE" "$SCRATCH/repo" || fail "rewrite destination"
  rm -rf "$SCRATCH"
}

case "$WHAT" in
  api) check_api ;;
  web) check_web ;;
  all) check_api; check_web ;;
  *) fail "usage: scripts/vercel-check.sh [api|web]" ;;
esac
echo
echo "vercel-check: PASSED ($WHAT)"
