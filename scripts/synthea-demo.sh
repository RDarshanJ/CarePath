#!/usr/bin/env bash
# `pnpm synthea:demo` (advisor plan revision 1, WP 5.4): generate a small seeded Synthea population
# in a scratch directory, compare it with the committed fixtures, and import it into this run's own
# database through the real import endpoint (app.inject, no listening server).
#
#   pnpm synthea:demo                    generate, compare, import, print counts
#   pnpm synthea:demo --write-fixtures   also copy the generated bundles into the fixtures folder
#
# Needs Java 17 or newer. The jar (about 197 MB, Synthea "master-branch-latest" release) is
# downloaded once to $SYNTHEA_CACHE (default ~/.cache/carepath/synthea), never into the repo.
# The generation parameters below are recorded in packages/fhir/fixtures/synthea/manifest.json.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

WRITE=0
[ "${1:-}" = "--write-fixtures" ] && WRITE=1

JAR_URL="https://github.com/synthetichealth/synthea/releases/download/master-branch-latest/synthea-with-dependencies.jar"
CACHE="${SYNTHEA_CACHE:-$HOME/.cache/carepath/synthea}"
JAR="$CACHE/synthea-with-dependencies.jar"
FIXTURES="packages/fhir/fixtures/synthea"
SEED=20261120
CLINICIAN_SEED=20261120
REFERENCE_DATE=20261101
POPULATION=3
AGES=40-70
STATE=Arizona
EXCLUDED="Claim,ExplanationOfBenefit,DiagnosticReport,DocumentReference,SupplyDelivery,ImagingStudy"

command -v java >/dev/null || { echo "synthea:demo needs Java 17 or newer on PATH" >&2; exit 1; }
mkdir -p "$CACHE"
if [ ! -s "$JAR" ]; then
  echo "==> downloading Synthea jar to $JAR"
  curl -sSL --fail -o "$JAR.part" "$JAR_URL"
  mv "$JAR.part" "$JAR"
fi
echo "==> jar sha256: $(sha256sum "$JAR" | cut -d' ' -f1)"

SCRATCH="$(mktemp -d -t carepath-synthea.XXXXXX)"
trap 'rm -rf "$SCRATCH"' EXIT
echo "==> generating $POPULATION patients (seed $SEED) in $SCRATCH"
(
  cd "$SCRATCH"
  LANG=C.UTF-8 java -Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8 -jar "$JAR" \
    -s "$SEED" -cs "$CLINICIAN_SEED" -r "$REFERENCE_DATE" -p "$POPULATION" -a "$AGES" \
    --exporter.years_of_history=1 \
    --exporter.fhir.use_us_core_ig=true --exporter.fhir.us_core_version=6.1.0 \
    --exporter.fhir.excluded_resources="$EXCLUDED" \
    --exporter.baseDirectory="$SCRATCH/output/" \
    "$STATE" >"$SCRATCH/synthea.log" 2>&1
)
grep -E "^Records:|generated [0-9]+ patients" "$SCRATCH/synthea.log" | sed 's/\x1b\[[0-9;]*m//g'
OUT="$SCRATCH/output/fhir"

# Stable names: patient-1..3 in file-name order, and the practitioner batch without its timestamp.
mkdir -p "$SCRATCH/named"
i=0
while IFS= read -r f; do
  i=$((i + 1))
  cp "$OUT/$f" "$SCRATCH/named/patient-$i.json"
done < <(ls "$OUT" | grep -v -E '^(hospital|practitioner)Information' | LC_ALL=C sort)
cp "$OUT"/practitionerInformation*.json "$SCRATCH/named/practitioners.json"

echo "==> generated files compared with $FIXTURES"
same=1
for f in "$SCRATCH"/named/*.json; do
  name="$(basename "$f")"
  if [ -f "$FIXTURES/$name" ] && cmp -s "$f" "$FIXTURES/$name"; then
    echo "  $name: identical ($(wc -c <"$f") bytes)"
  else
    echo "  $name: differs or not committed"
    same=0
  fi
done
if [ "$WRITE" = 1 ]; then
  cp "$SCRATCH"/named/practitioners.json "$SCRATCH"/named/patient-*.json "$FIXTURES/"
  echo "  fixtures written"
elif [ "$same" = 0 ]; then
  echo "  note: the committed fixtures were produced by the same command; a different jar build can change the output"
fi

echo "==> importing into a fresh database"
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh synthea 4054
pnpm --silent db:migrate >/dev/null
pnpm --silent db:seed --profile small >/dev/null
pnpm --filter @carepath/api exec tsx scripts/fhir-import-files.ts \
  "$SCRATCH/named/practitioners.json" "$SCRATCH"/named/patient-*.json
