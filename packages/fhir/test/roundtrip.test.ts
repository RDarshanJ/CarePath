import type { Bundle, DocumentReference, Resource } from "@medplum/fhirtypes";
import { describe, expect, it } from "vitest";
import {
  buildPatientBundle,
  checkRequired,
  defaultFromContext,
  findReferences,
  mappers,
  validateBundle,
  validateStructure,
  BundleIndex,
  type MappedType,
  type ToFhirContext,
} from "../src/index.js";
import { signedNoteDocuments } from "../src/index.js";
import { ids, ORG_SLUG, sampleExport, sampleNotes } from "./samples.js";

const ctx: ToFhirContext = { orgSlug: ORG_SLUG, organizationId: ids.org };
const fromCtx = { ...defaultFromContext, orgSlug: ORG_SLUG };

/** record -> FHIR -> layers 1 and 2 on the resource alone -> record. */
function roundTrip<T extends MappedType>(
  type: T,
  record: Parameters<(typeof mappers)[T]["toFhir"]>[0],
) {
  const resource = (mappers[type].toFhir as (r: unknown, c: ToFhirContext) => Resource)(
    record,
    ctx,
  );
  const problems = [
    ...validateStructure(resource, type),
    ...checkRequired(resource, type, { exportRules: true }),
  ].filter((i) => i.severity === "error" || i.severity === "fatal");
  const back = mappers[type].fromFhir(resource, fromCtx);
  return { resource, problems, back };
}

const data = sampleExport();

describe("round trip per resource (batches 1 and 2)", () => {
  it("Organization", () => {
    const r = roundTrip("Organization", data.organization);
    expect(r.problems).toEqual([]);
    expect(r.back.record).toEqual(data.organization);
  });

  it("Patient", () => {
    const r = roundTrip("Patient", data.patient);
    expect(r.problems).toEqual([]);
    expect(r.back.record).toEqual(data.patient);
    expect(r.resource).not.toHaveProperty("meta");
  });

  it.each(data.practitioners.map((p) => [p.staffId, p] as const))("Practitioner %s", (_, p) => {
    const r = roundTrip("Practitioner", p);
    expect(r.problems).toEqual([]);
    expect(r.back.record).toEqual(p);
  });

  it.each(data.goals.map((g) => [g.description, g] as const))("Goal %s", (_, g) => {
    const r = roundTrip("Goal", g);
    expect(r.problems).toEqual([]);
    expect(r.back.record).toEqual(g);
  });

  it.each(data.carePlans.map((c) => [c.versionNumber, c] as const))(
    "CarePlan version %s",
    (_, c) => {
      const r = roundTrip("CarePlan", c);
      expect(r.problems).toEqual([]);
      expect(r.back.issues).toEqual([]);
      expect(r.back.record).toEqual(c);
    },
  );

  it.each(data.observations.map((o) => [o.code, o.status, o] as const))(
    "Observation %s %s",
    (_, __, o) => {
      const r = roundTrip("Observation", o);
      expect(r.problems).toEqual([]);
      expect(r.back.record).toEqual(o);
    },
  );

  it.each(data.conditions.map((c) => [c.code, c.verificationStatus, c] as const))(
    "Condition %s %s",
    (_, __, c) => {
      const r = roundTrip("Condition", c);
      expect(r.problems).toEqual([]);
      expect(r.back.issues).toEqual([]);
      expect(r.back.record).toEqual(c);
    },
  );

  it.each(data.appointments.map((a) => [a.status, a] as const))("Appointment %s", (_, a) => {
    const r = roundTrip("Appointment", a);
    expect(r.problems).toEqual([]);
    expect(r.back.record).toEqual(a);
  });

  it.each(data.encounters.map((e) => [e.class, e.status, e] as const))(
    "Encounter %s %s",
    (_, __, e) => {
      const r = roundTrip("Encounter", e);
      expect(r.problems).toEqual([]);
      expect(r.back.record).toEqual(e);
    },
  );

  it.each(data.documents.map((d) => [d.versionNumber, d.status, d] as const))(
    "DocumentReference version %s %s",
    (_, __, d) => {
      const r = roundTrip("DocumentReference", d);
      expect(r.problems).toEqual([]);
      expect(r.back.record).toEqual(d);
    },
  );

  it("FHIR -> record -> FHIR is stable for CarePath-shaped resources", () => {
    const bundle = buildPatientBundle(data, "2026-11-19T16:00:00.000Z");
    for (const e of bundle.entry ?? []) {
      const type = e.resource!.resourceType as MappedType;
      const record = mappers[type].fromFhir(e.resource!, fromCtx).record;
      expect(record).not.toBeNull();
      const again = (mappers[type].toFhir as (r: unknown, c: ToFhirContext) => Resource)(
        record,
        ctx,
      );
      expect(again).toEqual(e.resource);
    }
  });
});

describe("practitioner NPI", () => {
  it("leaves out a stored NPI that fails the check digit (us-core-17)", () => {
    const p = { ...data.practitioners[0]!, npi: "9100007919" };
    const r = mappers.Practitioner.toFhir(p, ctx) as { identifier: { system: string }[] };
    expect(r.identifier.map((i) => i.system)).toEqual([`urn:carepath:${ORG_SLUG}:staff`]);
  });
});

describe("signed notes only", () => {
  const [signed, draft, error, evaluation] = sampleNotes();

  it("exports the signed version and each amendment, never working drafts", () => {
    const docs = signedNoteDocuments(signed!);
    expect(docs.map((d) => [d.versionId, d.status, d.isAmendment, d.replacesVersionId])).toEqual([
      [ids.noteSignedV2, "superseded", false, null],
      [ids.noteSignedV3, "current", true, ids.noteSignedV2],
    ]);
    expect(docs[0]!.signedAt).toBe(signed!.signedAt);
    expect(docs[1]!.signedAt).toBe(signed!.versions[2]!.createdAt);
    expect(docs[1]!.amendmentReason).toBe("Corrected the number of home sessions.");
  });

  it("exports nothing for a draft or for a note marked entered in error (C3 ruling 4.1)", () => {
    expect(signedNoteDocuments(draft!)).toEqual([]);
    expect(
      signedNoteDocuments({ ...error!, signedAt: null, signedByPractitionerId: null }),
    ).toEqual([]);
    // Signed, then marked entered in error: still carries signedAt and the signer.
    expect(error!.signedAt).not.toBeNull();
    expect(signedNoteDocuments(error!)).toEqual([]);
    expect(signedNoteDocuments(evaluation!).map((d) => d.status)).toEqual(["current"]);
  });

  it("writes amendments as docStatus amended replacing the earlier version", () => {
    const bundle = buildPatientBundle(data, "2026-11-19T16:00:00.000Z");
    const docs = bundle
      .entry!.map((e) => e.resource!)
      .filter((r) => r.resourceType === "DocumentReference") as DocumentReference[];
    expect(docs.map((d) => d.id)).toEqual([ids.noteEvalV1, ids.noteSignedV2, ids.noteSignedV3]);
    expect(docs.map((d) => [d.status, d.docStatus])).toEqual([
      ["current", "final"],
      ["superseded", "final"],
      ["current", "amended"],
    ]);
    expect(docs[2]!.relatesTo).toEqual([
      {
        code: "replaces",
        target: { reference: `urn:uuid:${ids.noteSignedV2}`, type: "DocumentReference" },
      },
    ]);
    expect(docs[1]!.type!.coding![0]!.code).toBe("11506-3");
    expect(docs[0]!.type!.coding![0]!.code).toBe("34117-2");
    expect(docs.every((d) => d.custodian?.reference === `urn:uuid:${ids.org}`)).toBe(true);
    expect(JSON.stringify(bundle)).not.toContain(ids.noteDraftV1);
    expect(JSON.stringify(bundle)).not.toContain(ids.noteSignedV1);
    expect(JSON.stringify(bundle)).not.toContain(ids.noteError);
    expect(JSON.stringify(bundle)).not.toContain(ids.noteErrorV1);
  });
});

describe("export bundle", () => {
  const bundle: Bundle = buildPatientBundle(data, "2026-11-19T16:00:00.000Z");

  it("is a collection with unique urn:uuid fullUrls and no entry.request", () => {
    expect(bundle.type).toBe("collection");
    const urls = bundle.entry!.map((e) => e.fullUrl);
    expect(new Set(urls).size).toBe(urls.length);
    for (const e of bundle.entry!) {
      expect(e.fullUrl).toBe(`urn:uuid:${e.resource!.id}`);
      expect(e).not.toHaveProperty("request");
    }
  });

  it("has zero dangling references, and every referenced entry comes first", () => {
    const index = new BundleIndex(bundle);
    let count = 0;
    const dangling: string[] = [];
    bundle.entry!.forEach((e, i) => {
      for (const r of findReferences(e.resource as unknown as Record<string, unknown>)) {
        count += 1;
        const res = index.resolve(r.reference);
        if (res.kind !== "entry") dangling.push(`${i}.${r.path} -> ${r.reference}`);
        else if (res.index > i) dangling.push(`${i}.${r.path} before target`);
      }
    });
    expect(dangling).toEqual([]);
    expect(count).toBeGreaterThan(20);
  });

  it("passes all three layers", () => {
    const v = validateBundle(bundle, { orgSlug: ORG_SLUG });
    expect(v.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(v.valid).toBe(true);
  });

  it("links versions with replaces and plans with goals", () => {
    const plans = bundle
      .entry!.map((e) => e.resource!)
      .filter((r) => r.resourceType === "CarePlan");
    expect(plans.map((p) => (p as { status: string }).status)).toEqual(["revoked", "active"]);
    expect(JSON.stringify(plans[1])).toContain(`urn:uuid:${ids.v1}`);
  });
});
