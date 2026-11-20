import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildPatientBundle, isError, planImport, type ImportPlan } from "../src/index.js";
import { MemoryOrg } from "./memory-lookup.js";
import { ids, sampleExport } from "./samples.js";

const exported = () => buildPatientBundle(sampleExport(), "2026-11-19T16:00:00.000Z");
const opts = (org: MemoryOrg, onDuplicate: "reject" | "skip" = "reject") => ({
  lookup: org,
  onDuplicate,
  newId: randomUUID,
});
const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "synthea",
);
const synthea = (f: string) => JSON.parse(readFileSync(path.join(fixtures, f), "utf8"));
const rules = (p: ImportPlan, sev?: string) =>
  p.issues.filter((i) => !sev || i.severity === sev).map((i) => i.rule);

describe("import of a CarePath export into another organization", () => {
  it("creates every batch 1 record with new ids and remapped references", async () => {
    const org = new MemoryOrg("0b6c2f6e-0000-4000-8000-0000000000aa", "importing-clinic");
    const plan = await planImport(exported(), opts(org));
    expect(plan.issues.filter(isError)).toEqual([]);
    expect(plan.status).toBe(201);
    const c = plan.creates;
    expect([
      c.practitioners.length,
      c.patients.length,
      c.goals.length,
      c.observations.length,
      c.carePlans.length,
    ]).toEqual([2, 1, 2, 5, 1]);
    const patientId = c.patients[0]!.id;
    expect(patientId).not.toBe(ids.patient);
    expect(c.observations.every((o) => o.patientId === patientId)).toBe(true);
    const plan1 = c.carePlans[0]!;
    expect(plan1.status).toBe("active");
    expect(plan1.versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    expect(plan1.versions[1]!.changeNoteForPatient).toBe("Added a short walk on weekdays.");
    expect(plan1.versions[1]!.activities.map((a) => a.exerciseSlug)).toEqual(["quad-sets", "walk"]);
    expect(c.goals.every((g) => g.carePlanId === plan1.id)).toBe(true);
    const practitionerIds = new Set(c.practitioners.map((p) => p.id));
    expect(
      c.observations
        .filter((o) => o.performerPractitionerId)
        .every((o) => practitionerIds.has(o.performerPractitionerId!)),
    ).toBe(true);
    expect(plan.counts["Organization"]).toEqual({
      created: 0,
      duplicate: 0,
      skipped: 1,
      invalid: 0,
    });
    expect(rules(plan, "warning")).toContain("import.external-organization");
  });

  it("is idempotent: a second import finds every record as a duplicate", async () => {
    const org = new MemoryOrg("0b6c2f6e-0000-4000-8000-0000000000ab", "importing-clinic");
    org.apply(await planImport(exported(), opts(org)));
    const before = JSON.stringify(org);
    const again = await planImport(exported(), opts(org));
    expect(again.status).toBe(409);
    expect(
      again.creates.patients.length +
        again.creates.observations.length +
        again.creates.carePlans.length,
    ).toBe(0);
    expect(rules(again, "error").every((r) => r === "dup.existing")).toBe(true);
    expect(rules(again, "error").length).toBe(2 + 1 + 2 + 2 + 5);
    const skipped = await planImport(exported(), opts(org, "skip"));
    expect(skipped.status).toBe(200);
    org.apply(skipped);
    expect(JSON.stringify(org)).toBe(before);
  });

  it("re-importing into the exporting organization matches by CarePath identifiers", async () => {
    const data = sampleExport();
    const org = new MemoryOrg(ids.org, "fixture-clinic");
    org.patients.push(data.patient);
    org.observations.push(...data.observations);
    const plan = await planImport(exported(), opts(org, "skip"));
    const obs = plan.entries.filter((e) => e.resourceType === "Observation");
    expect(obs.every((e) => e.action === "duplicate")).toBe(true);
    expect(
      plan.issues.filter((i) => i.rule === "dup.existing" && i.message.includes("by identifier"))
        .length,
    ).toBe(6);
  });

  it("reports duplicates inside one bundle", async () => {
    const b = exported();
    const obs = structuredClone(b.entry!.find((e) => e.resource!.resourceType === "Observation")!);
    const id = randomUUID();
    obs.resource!.id = id;
    obs.fullUrl = `urn:uuid:${id}`;
    delete (obs.resource as { identifier?: unknown }).identifier;
    b.entry!.push(obs);
    const org = new MemoryOrg(randomUUID(), "importing-clinic");
    const plan = await planImport(b, opts(org));
    expect(plan.status).toBe(409);
    expect(rules(plan, "error")).toEqual(["dup.in-bundle"]);
  });
});

describe("Synthea fixtures", () => {
  it("imports practitioners, then patients, resolving conditional references", async () => {
    const org = new MemoryOrg(randomUUID(), "synthea-clinic");
    const pr = await planImport(synthea("practitioners.json"), opts(org));
    expect(pr.status).toBe(201);
    org.apply(pr);
    expect(org.practitioners.length).toBe(11);
    for (const f of ["patient-1.json", "patient-2.json", "patient-3.json"]) {
      const bundle = synthea(f);
      const plan = await planImport(bundle, opts(org));
      expect(plan.issues.filter(isError)).toEqual([]);
      expect(plan.status).toBe(201);
      expect(plan.creates.patients.length).toBe(1);
      const nonAllowed = bundle.entry.filter(
        (e: { resource: { resourceType: string } }) =>
          !["Patient", "Practitioner", "Organization", "CarePlan", "Goal", "Observation"].includes(
            e.resource.resourceType,
          ),
      ).length;
      expect(plan.issues.filter((i) => i.rule === "import.skipped-type").length).toBe(nonAllowed);
      expect(plan.issues.some((i) => i.rule === "import.derived-practitioner")).toBe(true);
      const known = new Set(org.practitioners.map((p) => p.id));
      expect(plan.creates.observations.length).toBeGreaterThan(0);
      expect(plan.creates.observations.every((o) => known.has(o.performerPractitionerId!))).toBe(
        true,
      );
      org.apply(plan);
    }
    const again = await planImport(synthea("patient-1.json"), opts(org));
    expect(again.status).toBe(409);
    const skip = await planImport(synthea("patient-1.json"), opts(org, "skip"));
    expect(skip.status).toBe(200);
    expect(
      skip.creates.observations.length +
        skip.creates.patients.length +
        skip.creates.carePlans.length,
    ).toBe(0);
  });

  it("fails conditional references to practitioners the organization does not have", async () => {
    const org = new MemoryOrg(randomUUID(), "synthea-clinic");
    const plan = await planImport(synthea("patient-2.json"), opts(org));
    // Without the practitioner bundle no performer can be derived; those observations fail mapping.
    expect(plan.status).toBe(422);
    expect(rules(plan, "error")).toContain("map.observation.performer");
  });
});
