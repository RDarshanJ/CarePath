// D-WP-6 gate, G5: reads the design-capture `_probe.json` and applies this package's rules.
//
// - Horizontal overflow fails on every screen except the two whose overflow comes from page content that
//   later slices own (audit.md section 4: the schedule table, D-WP-14; the record appointments tab,
//   D-WP-15). Those are reported, not failed.
// - Targets under the theme floor fail on the screens this package owns whole (sign-in and the landing
//   redirect). Elsewhere they are reported; the shell's own controls are measured by e2e/shells.spec.ts.
//   Two probe entries are not targets a person can hit and are ignored: the skip link while visually
//   hidden (it is full size once focused) and the 1 px native select Radix keeps for forms.
// Usage: node scripts/gate-wp-d6-probe.mjs <path to _probe.json>
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/gate-wp-d6-probe.mjs <_probe.json>");
  process.exit(2);
}
const raw = JSON.parse(readFileSync(file, "utf8"));
const probes = Array.isArray(raw) ? raw : (raw.images ?? raw.probes ?? []);
const OVERFLOW_OWNED_ELSEWHERE = ["clinician-schedule-", "clinician-record-appointments-"];
const TARGETS_OWNED_HERE = ["public-sign-in-", "public-landing-"];
const notATarget = (entry) => /^(patient|clinician) a\.sr-only|^a\.sr-only| 1x1$/.test(entry);

const failures = [];
const notes = [];
for (const p of probes) {
  if (p.overflowX > 1) {
    const elsewhere = OVERFLOW_OWNED_ELSEWHERE.some((s) => p.file.startsWith(s));
    (elsewhere ? notes : failures).push(`overflow ${p.overflowX}px: ${p.file}`);
  }
  const under = (p.underThemeFloorList ?? []).filter((e) => !notATarget(e));
  if (under.length && TARGETS_OWNED_HERE.some((s) => p.file.startsWith(s))) {
    failures.push(`targets under the theme floor on ${p.file}: ${under.join("; ")}`);
  }
}
const withSmall = probes.filter(
  (p) => (p.underThemeFloorList ?? []).filter((e) => !notATarget(e)).length > 0,
);
console.log(`probe: ${probes.length} images`);
console.log(`  overflow on screens owned elsewhere (reported): ${notes.length}`);
for (const n of notes) console.log(`    ${n}`);
console.log(
  `  images with a page target under the theme floor (reported, page content): ${withSmall.length}`,
);
if (failures.length) {
  for (const f of failures) console.error(`FAILED ${f}`);
  process.exit(1);
}
console.log("  shell overflow and owned-screen targets: none");
