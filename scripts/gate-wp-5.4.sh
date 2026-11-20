#!/usr/bin/env bash
# WP 5.4 gate (FHIR batch 1 and Synthea fixtures) on this package's own port: API 4054, database
# carepath_wp54_<pid>. Runs the @carepath/fhir tests (round trip for the six batch 1 resources,
# zero dangling references in the exported Bundle, the broken fixtures that must all fail with
# itemised errors, import idempotency and duplicates, the committed Synthea bundles), prints the
# measured evaluation, runs the API FHIR tests and M8, lints and type-checks the paths this
# package owns, checks openapi.json, then `pnpm verify`, and ends with a clean `git status`.
# Needs no Java: Synthea output comes from the committed fixtures (`pnpm synthea:demo` regenerates).
# Never stops the shared cluster.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-5.4.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp54 4054 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
OWNED=(
  packages/fhir
  packages/shared/src/contracts/fhir.ts
  apps/api/src/modules/fhir
  apps/api/scripts/fhir-import-files.ts
  apps/api/test/phase5
  apps/api/test/support/fhir
)
export FHIR_EVAL_OUT="${FHIR_EVAL_OUT:-$(mktemp -t fhir-eval.XXXXXX.json)}"

run pnpm db:migrate
run pnpm --filter @carepath/fhir exec vitest run --reporter=verbose
echo; echo "==> evaluation ($FHIR_EVAL_OUT)"
node -e '
const d = require(process.argv[1]);
let ok = true;
for (const r of d.roundTrip) {
  console.log(`round trip ${r.type.padEnd(13)} records=${r.records} pass layers 1-2=${r.passLayers} record equal=${r.recordEqual} FHIR stable=${r.fhirStable}`);
  if (r.passLayers !== r.records || r.recordEqual !== r.records || r.fhirStable !== r.records) ok = false;
}
console.log(`sample export bundle: entries=${d.sampleBundle.entries} errors=${d.sampleBundle.errors}`);
const caught = d.broken.filter((b) => b.detected).length;
const l1 = d.broken.filter((b) => b.structuralErrors > 0).length;
console.log(`broken fixtures: ${caught}/${d.broken.length} fail with the expected rule; layer 1 (Medplum) flags ${l1}`);
if (caught !== d.broken.length) ok = false;
for (const f of d.synthea.files) {
  const c = (t) => f.counts[t] ? `${f.counts[t].created}/${f.counts[t].skipped}` : "0/0";
  console.log(`synthea ${f.file.padEnd(19)} HTTP-equivalent ${f.status} errors=${f.errors} created/skipped Patient ${c("Patient")} Practitioner ${c("Practitioner")} CarePlan ${c("CarePlan")} Observation ${c("Observation")}`);
  if (f.errors !== 0) ok = false;
}
console.log(`synthea re-import patient-1: ${d.synthea.reimportPatient1.status} with ${d.synthea.reimportPatient1.duplicates} duplicates`);
process.exit(ok ? 0 : 1);
' "$FHIR_EVAL_OUT" || { echo "FAILED: evaluation" >&2; exit 1; }
run pnpm --filter @carepath/api exec vitest run --reporter=verbose test/phase5/fhir.test.ts test/phase3/m8-enumeration.test.ts test/core/contracts.test.ts test/core/openapi.test.ts
echo; echo "==> M8 covers the export route"
grep -q '"/patients/{patientId}/fhir/export"' apps/api/openapi.json && echo "GET /patients/{patientId}/fhir/export is in openapi.json, so M8 enumerates it" || { echo "FAILED: export route missing" >&2; exit 1; }
run pnpm --filter @carepath/shared typecheck
run pnpm --filter @carepath/fhir typecheck
run pnpm --filter @carepath/api typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm openapi:check
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "WP 5.4 gate: PASSED"
