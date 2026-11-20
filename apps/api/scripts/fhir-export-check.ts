/**
 * Builds the FHIR export of every patient in the database at DATABASE_URL (normally a freshly
 * seeded gate database), validates each Bundle with the three layers, and prints per-type entry
 * counts and the number of failing bundles. Exit 1 if any export fails. Used by the WP 5.4b gate.
 *   tsx scripts/fhir-export-check.ts
 */
import { buildPatientBundle, isError, validateBundle } from "@carepath/fhir";
import { buildApp } from "../src/app.js";
import { loadPatientExport } from "../src/modules/fhir/repo.js";

const app = await buildApp({ config: { logLevel: "silent", allowedOrigins: [] } });
let failed = 0;
try {
  const { db } = app.deps;
  const patients = await db.patient.findMany({
    select: { id: true, organizationId: true },
    orderBy: [{ organizationId: "asc" }, { id: "asc" }],
  });
  const totals: Record<string, number> = {};
  const rules: Record<string, number> = {};
  let drafts = 0;
  for (const p of patients) {
    const data = await loadPatientExport(db, { orgId: p.organizationId }, p.id);
    if (!data) throw new Error(`patient ${p.id} not found`);
    const bundle = buildPatientBundle(data, new Date().toISOString());
    const v = validateBundle(bundle, { orgSlug: data.organization.slug });
    if (!v.valid) {
      failed += 1;
      for (const i of v.issues.filter(isError)) rules[i.rule] = (rules[i.rule] ?? 0) + 1;
    }
    for (const e of bundle.entry ?? []) {
      const t = e.resource!.resourceType;
      totals[t] = (totals[t] ?? 0) + 1;
    }
    // A draft version id appearing anywhere in the export would be a leak.
    const draftIds = (
      await db.clinicalNoteVersion.findMany({
        where: { organizationId: p.organizationId, note: { patientId: p.id, signedAt: null } },
        select: { id: true },
      })
    ).map((x) => x.id);
    const text = JSON.stringify(bundle);
    drafts += draftIds.filter((id) => text.includes(id)).length;
  }
  console.log(`patients exported: ${patients.length}, bundles failing the three layers: ${failed}`);
  for (const [t, n] of Object.entries(totals).sort()) console.log(`  ${t.padEnd(18)} ${n}`);
  for (const [r, n] of Object.entries(rules).sort()) console.log(`  failing rule ${r}: ${n}`);
  const unsigned = await db.clinicalNote.count({ where: { signedAt: null } });
  console.log(
    `unsigned notes in the database: ${unsigned}; draft version ids found in exports: ${drafts}`,
  );
  if (drafts > 0) failed += 1;
} finally {
  await app.close();
}
process.exit(failed ? 1 : 0);
