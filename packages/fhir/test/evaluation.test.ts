/**
 * Measurements for docs/evaluation/fhir-validation.md. Always runs as a test (each number is
 * also asserted); with FHIR_EVAL_OUT set it writes the measured values as JSON to that path.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Resource } from "@medplum/fhirtypes";
import { describe, expect, it } from "vitest";
import {
  buildPatientBundle,
  checkRequired,
  defaultFromContext,
  isError,
  mappers,
  planImport,
  validateBundle,
  validateStructure,
  type MappedType,
  type ToFhirContext,
} from "../src/index.js";
import { brokenFixtures, errorsByLayer, runFixture } from "./broken.js";
import { MemoryOrg } from "./memory-lookup.js";
import { ids, ORG_SLUG, sampleExport } from "./samples.js";

const results: Record<string, unknown> = {};
const ctx: ToFhirContext = { orgSlug: ORG_SLUG, organizationId: ids.org };

describe("evaluation", () => {
  it("round trip per resource type", () => {
    const data = sampleExport();
    const samples: [MappedType, unknown[]][] = [
      ["Organization", [data.organization]],
      ["Practitioner", data.practitioners],
      ["Patient", [data.patient]],
      ["Goal", data.goals],
      ["CarePlan", data.carePlans],
      ["Observation", data.observations],
    ];
    const rows = samples.map(([type, records]) => {
      let equal = 0;
      let clean = 0;
      let stable = 0;
      for (const r of records) {
        const fhir = (mappers[type].toFhir as (x: unknown, c: ToFhirContext) => Resource)(r, ctx);
        const errors = [...validateStructure(fhir, type), ...checkRequired(fhir, type)].filter(
          isError,
        );
        if (errors.length === 0) clean += 1;
        const back = mappers[type].fromFhir(fhir, {
          ...defaultFromContext,
          orgSlug: ORG_SLUG,
        }).record;
        if (JSON.stringify(back) === JSON.stringify(r)) equal += 1;
        const again = (mappers[type].toFhir as (x: unknown, c: ToFhirContext) => Resource)(
          back,
          ctx,
        );
        if (JSON.stringify(again) === JSON.stringify(fhir)) stable += 1;
      }
      return {
        type,
        records: records.length,
        passLayers: clean,
        recordEqual: equal,
        fhirStable: stable,
      };
    });
    const bundle = buildPatientBundle(data, "2026-11-19T16:00:00.000Z");
    const v = validateBundle(bundle, { orgSlug: ORG_SLUG });
    results["roundTrip"] = rows;
    results["sampleBundle"] = {
      entries: bundle.entry!.length,
      errors: v.issues.filter(isError).length,
      warnings: v.issues.filter((i) => i.severity === "warning").length,
    };
    for (const r of rows)
      expect([r.passLayers, r.recordEqual, r.fhirStable]).toEqual([
        r.records,
        r.records,
        r.records,
      ]);
    expect(v.valid).toBe(true);
  });

  it("broken fixtures", async () => {
    const rows = [];
    for (const f of brokenFixtures()) {
      const { issues, status } = await runFixture(f);
      const layers = errorsByLayer(issues);
      rows.push({
        fixture: f.name,
        expectedRule: f.expect.rule,
        detected: issues.some((i) => isError(i) && i.rule === f.expect.rule),
        structuralErrors: layers["structural"],
        carepathErrors: layers["carepath"],
        duplicateErrors: layers["duplicate"],
        importErrors: layers["import"],
        status,
      });
    }
    results["broken"] = rows;
    expect(rows.every((r) => r.detected)).toBe(true);
  });

  it("Synthea fixtures through the import planner (in-memory organization)", async () => {
    const dir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "fixtures",
      "synthea",
    );
    const org = new MemoryOrg(randomUUID(), "synthea-eval");
    const rows = [];
    for (const f of ["practitioners.json", "patient-1.json", "patient-2.json", "patient-3.json"]) {
      const bundle = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
      const plan = await planImport(bundle, {
        lookup: org,
        onDuplicate: "reject",
        newId: randomUUID,
      });
      org.apply(plan);
      const rule = (r: string) => plan.issues.filter((i) => i.rule === r).length;
      rows.push({
        file: f,
        entries: bundle.entry.length,
        status: plan.status,
        counts: plan.counts,
        errors: plan.issues.filter(isError).length,
        skippedTypeIssues: rule("import.skipped-type"),
        derivedPractitioner: rule("import.derived-practitioner"),
        laboratorySkipped: rule("map.observation.category.skipped"),
        noStorableValueSkipped: rule("map.observation.value.skipped"),
        openPlanSkipped: rule("import.careplan.open-exists"),
        activityNotExercise: rule("map.careplan.activity.not-exercise"),
      });
    }
    const again = await planImport(
      JSON.parse(readFileSync(path.join(dir, "patient-1.json"), "utf8")),
      {
        lookup: org,
        onDuplicate: "reject",
        newId: randomUUID,
      },
    );
    results["synthea"] = {
      files: rows,
      reimportPatient1: {
        status: again.status,
        duplicates: again.issues.filter((i) => i.rule === "dup.existing").length,
      },
    };
    expect(rows.every((r) => r.errors === 0)).toBe(true);
    expect(again.status).toBe(409);
    if (process.env["FHIR_EVAL_OUT"])
      writeFileSync(process.env["FHIR_EVAL_OUT"], `${JSON.stringify(results, null, 2)}\n`);
  });
});
