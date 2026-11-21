#!/usr/bin/env bash
# WP 6.3 gate (full seed profile, NPI check digits) on this package's own port: API 4063, database
# carepath_wp63_<pid>. Migrates, then seeds the small and the full profile twice each and checks
# that each pair has the same content hash (determinism), runs the integrity checks (`--check`)
# after every profile, and checks the small hash against the recorded value. Runs the FHIR export
# check (three layers, and every seeded NPI passes isValidNpi) on the seeded database for both
# profiles, so the full profile's 1,000 exports are validated. Lints, format-checks and
# type-checks the paths this package owns, then `pnpm verify`, and ends with a clean `git status`.
# Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-6.3.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp63 4063 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  packages/db/seed
  apps/api/scripts/fhir-export-check.ts
)
SMALL_HASH=40b299619465b947cc075a59fbdb41cb164d29935f48bbe9a819ce6de5a582ee
FULL_HASH=eb3c2ae0fe9245a86d70fbf19357cd42d6717738c3e43742a3400986e4366c54

# Seeds one profile and returns its content hash on stdout; fails the gate on any error.
seed_hash() {
  local profile="$1" out hash
  out="$(pnpm --silent db:seed --profile "$profile" 2>&1)" || { echo "$out" >&2; echo "FAILED: seed $profile" >&2; exit 1; }
  echo "$out" | grep -E "integrity checks|total rows" >&2
  hash="$(echo "$out" | sed -n 's/^content-hash: //p')"
  [ -n "$hash" ] || { echo "$out" >&2; echo "FAILED: no content hash for $profile" >&2; exit 1; }
  echo "$hash"
}

run pnpm db:migrate
run pnpm --filter @carepath/db migrate:check

echo; echo "==> small profile: two seeds, same hash, recorded hash"
s1="$(seed_hash small)"; s2="$(seed_hash small)"
echo "small run 1: $s1"; echo "small run 2: $s2"
[ "$s1" = "$s2" ] || { echo "FAILED: small seed is not deterministic" >&2; exit 1; }
[ "$s1" = "$SMALL_HASH" ] || { echo "FAILED: small hash $s1 differs from recorded $SMALL_HASH" >&2; exit 1; }
run pnpm --silent db:seed --profile small --check
run pnpm --filter @carepath/api exec tsx scripts/fhir-export-check.ts

echo; echo "==> full profile: two seeds, same hash, recorded hash"
f1="$(seed_hash full)"; f2="$(seed_hash full)"
echo "full run 1: $f1"; echo "full run 2: $f2"
[ "$f1" = "$f2" ] || { echo "FAILED: full seed is not deterministic" >&2; exit 1; }
[ "$f1" = "$FULL_HASH" ] || { echo "FAILED: full hash $f1 differs from recorded $FULL_HASH" >&2; exit 1; }
run pnpm --silent db:seed --profile full --check
echo; echo "==> full profile: every patient exported through the three layers, every NPI checked"
run pnpm --filter @carepath/api exec tsx scripts/fhir-export-check.ts

run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/db typecheck
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "WP 6.3 gate: PASSED"
