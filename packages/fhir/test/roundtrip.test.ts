import type { Bundle, Resource } from "@medplum/fhirtypes";
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
import { ids, ORG_SLUG, sampleExport } from "./samples.js";

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
  const problems = [...validateStructure(resource, type), ...checkRequired(resource, type)].filter(
    (i) => i.severity === "error" || i.severity === "fatal",
  );
  const back = mappers[type].fromFhir(resource, fromCtx);
  return { resource, problems, back };
}

const data = sampleExport();

describe("round trip per resource (batch 1)", () => {
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
