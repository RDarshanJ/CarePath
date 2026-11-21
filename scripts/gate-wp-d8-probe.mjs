// D-WP-8 gate, G5: reads the design-capture `_probe.json` and applies this package's rules to the
// onboarding and consent screens: no horizontal overflow, no warm background, no axe serious or critical
// finding, and no target under the patient floor (48 px), counting content targets only.
// Usage: node scripts/gate-wp-d8-probe.mjs <path to _probe.json>
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/gate-wp-d8-probe.mjs <_probe.json>");
  process.exit(2);
}
const raw = JSON.parse(readFileSync(file, "utf8"));
const probes = (Array.isArray(raw) ? raw : (raw.images ?? raw.probes ?? [])).filter((p) =>
  /^patient-(onboarding|consent)/.test(p.file),
);
const notATarget = (entry) => /^(patient )?a\.sr-only|^a\.sr-only| 1x1$/.test(entry);
const failures = [];
for (const p of probes) {
  if (p.overflowX > 1) failures.push(`overflow ${p.overflowX}px: ${p.file}`);
  const under = (p.underThemeFloorList ?? []).filter((e) => !notATarget(e));
  if (under.length)
    failures.push(`targets under the theme floor on ${p.file}: ${under.join("; ")}`);
  if ((p.warm ?? p.warmBackgrounds ?? []).length) failures.push(`warm background on ${p.file}`);
  if ((p.violations ?? []).length) failures.push(`axe finding on ${p.file}`);
}
console.log(`probe: ${probes.length} onboarding and consent images`);
if (failures.length) {
  for (const f of failures) console.error(`FAILED ${f}`);
  process.exit(1);
}
console.log("  overflow, warm, axe, targets: none");
