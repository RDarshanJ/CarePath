import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BundleIndex, findReferences, validateBundle } from "@carepath/fhir";
import { as, login, testApp } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  type OrgFixture,
} from "../support/repo.js";
import { createClinicalFixture } from "../support/fixtures/repo.js";
import {
  addGoal,
  auditEvents,
  copyExercises,
  fhirCounts,
  importedPlans,
  orgSlug,
} from "../support/fhir/repo.js";

/**
 * WP 5.4: FHIR export and import through the API. Export: authorized roles only, a valid
 * collection Bundle with zero dangling references, audited. Import: admin only, into the caller's
 * organization, 400/409/422 with an itemised OperationOutcome and nothing written on failure,
 * the change and its audit event in one transaction, duplicates detected on re-import.
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const db = createTestDb();
const here = path.dirname(fileURLToPath(import.meta.url));
const syntheaDir = path.join(
  here,
  "..",
  "..",
  "..",
  "..",
  "packages",
  "fhir",
  "fixtures",
  "synthea",
);
const brokenDir = path.join(
  here,
  "..",
  "..",
  "..",
  "..",
  "packages",
  "fhir",
  "test",
  "fixtures",
  "broken",
);
const synthea = (f: string) => readFileSync(path.join(syntheaDir, f), "utf8");
const broken = (f: string) =>
  JSON.parse(readFileSync(path.join(brokenDir, `${f}.json`), "utf8")).bundle;

let app: FastifyInstance;
let orgA: OrgFixture;
let orgB: OrgFixture;
let orgC: OrgFixture;
let exportedA: Record<string, unknown>;

type Issue = {
  severity: string;
  code: string;
  details?: { coding?: { code: string }[]; text?: string };
  expression?: string[];
};
const countOf = (bundle: Record<string, unknown>, type: string) =>
  (bundle["entry"] as { resource: { resourceType: string } }[]).filter(
    (e) => e.resource.resourceType === type,
  ).length;
const rulesOf = (body: { issue: Issue[] }, severity = "error") =>
  body.issue.filter((i) => i.severity === severity).map((i) => i.details?.coding?.[0]?.code);

async function exportAs(email: string, patientId: string) {
  return as(
    app,
    await login(app, email),
  )({ method: "GET", url: `/patients/${patientId}/fhir/export` });
}
async function importAs(
  email: string,
  body: unknown,
  query = "",
  contentType = "application/json",
) {
  return as(
    app,
    await login(app, email),
  )({
    method: "POST",
    url: `/fhir/import${query}`,
    headers: { "content-type": contentType },
    payload: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  orgA = await createOrgFixture(db, { givenName: "Avery", familyName: "Exporter" });
  orgB = await createOrgFixture(db);
  orgC = await createOrgFixture(db);
  const fx = await createClinicalFixture(db, orgA, NOW);
  await addGoal(db, orgA.orgId, orgA.patient.patientId, fx.carePlanId);
  // Two pain check-ins through the API, so the export carries patient-reported Observations.
  const p = as(app, await login(app, orgA.patient.email));
  for (const painScore of [3, 5]) {
    const res = await p({
      method: "POST",
      url: `/patients/${orgA.patient.patientId}/check-ins`,
      payload: { sessionId: null, painScore },
    });
    expect(res.statusCode).toBe(201);
  }
  await copyExercises(db, orgA.orgId, orgB.orgId);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("export", () => {
  it("gives a therapist a valid collection Bundle with zero dangling references, audited", async () => {
    const res = await exportAs(orgA.therapist.email, orgA.patient.patientId);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-disposition"]).toContain(".fhir.json");
    const bundle = res.json();
    exportedA = bundle;
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("collection");
    const types = bundle.entry.map(
      (e: { resource: { resourceType: string } }) => e.resource.resourceType,
    );
    for (const t of ["Organization", "Practitioner", "Patient", "Goal", "CarePlan", "Observation"])
      expect(types).toContain(t);
    expect(types.filter((t: string) => t === "CarePlan").length).toBe(2);
    expect(types.filter((t: string) => t === "Observation").length).toBeGreaterThanOrEqual(2);

    const index = new BundleIndex(bundle);
    const dangling: string[] = [];
    let refs = 0;
    for (const e of bundle.entry) {
      for (const r of findReferences(e.resource)) {
        refs += 1;
        if (index.resolve(r.reference).kind !== "entry") dangling.push(r.reference);
      }
    }
    expect(dangling).toEqual([]);
    expect(refs).toBeGreaterThan(5);
    expect(validateBundle(bundle, { orgSlug: await orgSlug(db, orgA.orgId) }).valid).toBe(true);
    expect(JSON.stringify(bundle)).not.toContain('"meta"');

    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => [e.eventName, e.action, e.purposeOfUse])).toEqual([
      ["export.fhir", "E", "export"],
    ]);
  });

  it("lets a patient export only their own record", async () => {
    expect((await exportAs(orgA.patient.email, orgA.patient.patientId)).statusCode).toBe(200);
    expect((await exportAs(orgA.otherPatient.email, orgA.patient.patientId)).statusCode).toBe(404);
  });

  it("refuses the coordinator role and other organizations", async () => {
    const coord = await exportAs(orgA.coordinator.email, orgA.patient.patientId);
    expect(coord.statusCode).toBe(403);
    expect(coord.json().error.code).toBe("forbidden");
    const other = await exportAs(orgB.therapist.email, orgA.patient.patientId);
    expect(other.statusCode).toBe(404);
    const events = await auditEventsForRequest(db, other.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toEqual(["security.access_denied"]);
  });
});

describe("import", () => {
  it("is for the clinic admin only", async () => {
    for (const email of [orgB.therapist.email, orgB.coordinator.email, orgB.patient.email]) {
      const res = await importAs(email, exportedA);
      expect(res.statusCode).toBe(403);
    }
  });

  it("imports another organization's export with new ids, then detects every duplicate", async () => {
    const before = await fhirCounts(db, orgB.orgId);
    const res = await importAs(orgB.admin.email, exportedA);
    expect(res.statusCode).toBe(201);
    const report = res.json();
    expect(report.status).toBe("imported");
    expect(rulesOf(report.outcome)).toEqual([]);
    expect(report.counts.Patient.created).toBe(1);
    expect(report.counts.Organization.skipped).toBe(1);
    const after = await fhirCounts(db, orgB.orgId);
    expect({
      patients: after.patients - before.patients,
      carePlans: after.carePlans - before.carePlans,
      versions: after.versions - before.versions,
      goals: after.goals - before.goals,
      observations: after.observations - before.observations,
    }).toEqual({
      patients: 1,
      carePlans: 1,
      versions: 2,
      goals: countOf(exportedA, "Goal"),
      observations: countOf(exportedA, "Observation"),
    });
    expect(after.assignments - before.assignments).toBeGreaterThan(0);
    const created = report.entries.filter((e: { action: string }) => e.action === "create");
    for (const e of created) expect(JSON.stringify(exportedA)).not.toContain(e.id);
    const plans = await importedPlans(db, orgB.orgId);
    const imported = plans.find((p) => p.versions.length === 2)!;
    expect(imported.status).toBe("active");
    expect(imported.currentVersionId).toBe(imported.versions[1]!.id);

    // The change and its audit event were written together.
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => [e.eventName, e.outcome])).toEqual([["import.fhir", "success"]]);

    // Idempotency: the same bundle again is a 409 listing every duplicate, and writes nothing.
    const again = await importAs(orgB.admin.email, exportedA);
    expect(again.statusCode).toBe(409);
    const outcome = again.json();
    expect(outcome.resourceType).toBe("OperationOutcome");
    const dupRules = rulesOf(outcome);
    expect(dupRules.length).toBe(created.length);
    expect(new Set(dupRules)).toEqual(new Set(["dup.existing"]));
    expect(await fhirCounts(db, orgB.orgId)).toEqual(after);
    const skip = await importAs(orgB.admin.email, exportedA, "?onDuplicate=skip");
    expect(skip.statusCode).toBe(200);
    expect(skip.json().status).toBe("nothing_new");
    expect(await fhirCounts(db, orgB.orgId)).toEqual(after);
    const failures = (await auditEvents(db, orgB.orgId, "import.fhir")).filter(
      (e) => e.outcome !== "success",
    );
    expect(failures.map((e) => e.detailCode)).toContain("rejected_409");
  });

  it.each([
    ["bundle-not-a-bundle", 400, "bundle.resource-type"],
    ["bundle-duplicate-fullurl", 400, "bdl-7"],
    ["patient-birthdate-malformed", 400, "r4.structure"],
    ["observation-pain-out-of-range", 422, "carepath.pain-nrs-range"],
    ["careplan-subject-practitioner", 422, "ref.target-type"],
    ["observation-dangling-subject", 422, "ref.unresolved"],
    ["practitioner-npi-check-digit", 422, "us-core-17"],
  ] as const)(
    "rejects %s with %i and an itemised OperationOutcome, writing nothing",
    async (name, status, rule) => {
      const before = await fhirCounts(db, orgC.orgId);
      const res = await importAs(orgC.admin.email, broken(name));
      expect(res.statusCode).toBe(status);
      const body = res.json();
      expect(body.resourceType).toBe("OperationOutcome");
      expect(rulesOf(body)).toContain(rule);
      for (const i of body.issue.filter((x: Issue) => x.severity === "error")) {
        expect(i.expression?.[0]).toMatch(/^Bundle/);
        expect(i.details?.text).toBeTruthy();
      }
      expect(await fhirCounts(db, orgC.orgId)).toEqual(before);
      const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(events.map((e) => [e.eventName, e.outcome, e.detailCode])).toEqual([
        ["import.fhir", "minor_failure", `rejected_${status}`],
      ]);
    },
  );

  it("answers a reference into another organization exactly like a missing id", async () => {
    const withId = (id: string) => {
      const b = structuredClone(broken("import-reference-outside-organization"));
      const obs = b.entry.find(
        (e: { resource: { resourceType: string } }) => e.resource.resourceType === "Observation",
      );
      obs.resource.subject = { reference: `Patient/${id}` };
      return b;
    };
    const foreign = await importAs(orgB.admin.email, withId(orgA.patient.patientId));
    const missing = await importAs(orgB.admin.email, withId(randomUUID()));
    expect(foreign.statusCode).toBe(422);
    expect(missing.statusCode).toBe(422);
    expect(rulesOf(foreign.json())).toContain("ref.unresolved");
    expect(foreign.body.replace(orgA.patient.patientId, "X")).toBe(
      missing.body.replace(/Patient\/[0-9a-f-]{36}/, "Patient/X").replace(/[0-9a-f-]{36}/, "X"),
    );
  });

  it("rejects a body that is not JSON with 400", async () => {
    const res = await importAs(orgC.admin.email, "{not json", "", "application/fhir+json");
    expect(res.statusCode).toBe(400);
  });
});

describe("Synthea fixtures through the API", () => {
  let orgS: OrgFixture;
  beforeAll(async () => {
    orgS = await createOrgFixture(db);
  });

  it("imports the practitioner bundle, then three patient bundles, then refuses them again", async () => {
    const pr = await importAs(
      orgS.admin.email,
      synthea("practitioners.json"),
      "",
      "application/fhir+json",
    );
    expect(pr.statusCode).toBe(201);
    expect(pr.json().counts.Practitioner.created).toBe(11);
    expect(pr.json().counts.PractitionerRole.skipped).toBe(11);
    for (const f of ["patient-1.json", "patient-2.json", "patient-3.json"]) {
      const res = await importAs(orgS.admin.email, synthea(f), "", "application/fhir+json");
      expect(res.statusCode, res.body.slice(0, 400)).toBe(201);
      const report = res.json();
      expect(report.counts.Patient.created).toBe(1);
      expect(report.counts.Observation.created).toBeGreaterThan(0);
      expect(rulesOf(report.outcome, "information")).toContain("import.skipped-type");
      expect(rulesOf(report.outcome, "information")).toContain("import.derived-practitioner");
    }
    const counts = await fhirCounts(db, orgS.orgId);
    expect(counts.patients - 2).toBe(3);
    const again = await importAs(
      orgS.admin.email,
      synthea("patient-1.json"),
      "",
      "application/fhir+json",
    );
    expect(again.statusCode).toBe(409);
    const skip = await importAs(
      orgS.admin.email,
      synthea("patient-1.json"),
      "?onDuplicate=skip",
      "application/fhir+json",
    );
    expect(skip.statusCode).toBe(200);
    expect(await fhirCounts(db, orgS.orgId)).toEqual(counts);
  });
});
