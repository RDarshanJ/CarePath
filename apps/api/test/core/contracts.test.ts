/**
 * Shared contracts (checkpoint C1, ruling 3.5): the API serves the schemas from
 * @carepath/shared/contracts, and the browser-safe entry points never pull in server modules.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BANNED_DIAGNOSTIC_TERMS,
  CONTACT_CLINIC_FALLBACK,
  EMERGENCY_NOTICE,
  findBannedDiagnosticTerms,
} from "@carepath/shared";
import {
  errorCodes,
  errorEnvelopeSchema,
  loginBodySchema,
  patientHeaderSchema,
  sessionInfoSchema,
} from "@carepath/shared/contracts";
import { describe, expect, it } from "vitest";
import { errorEnvelopeSchema as apiEnvelope } from "../../src/core/errors.js";
import { createTestDb } from "../support/repo.js";
import { testApp } from "../support/http.js";

const sharedSrc = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../packages/shared/src",
);

describe("shared contracts", () => {
  it("the API error handler uses the shared envelope", () => {
    expect(apiEnvelope).toBe(errorEnvelopeSchema);
    for (const [code, { status }] of Object.entries(errorCodes)) {
      expect(status, code).toBeGreaterThanOrEqual(400);
      expect(status, code).toBeLessThan(600);
    }
  });

  it("OpenAPI components carry the shared schema names", async () => {
    const db = createTestDb();
    const app = await testApp(db);
    try {
      const doc = app.swagger() as { components: { schemas: Record<string, unknown> } };
      for (const schema of [
        loginBodySchema,
        sessionInfoSchema,
        patientHeaderSchema,
        errorEnvelopeSchema,
      ]) {
        const id = schema.meta()?.id;
        expect(id).toBeTypeOf("string");
        expect(Object.keys(doc.components.schemas)).toContain(id);
      }
    } finally {
      await app.close();
      await db.$disconnect();
    }
  });

  it("browser-safe entry points import no node: modules", () => {
    const files = [
      path.join(sharedSrc, "index.ts"),
      path.join(sharedSrc, "copy.ts"),
      ...readdirSync(path.join(sharedSrc, "contracts")).map((f) =>
        path.join(sharedSrc, "contracts", f),
      ),
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/from "node:/);
    }
  });
});

describe("fixed safety copy (PRD section 16, ruling 3.7)", () => {
  it("keeps the approved emergency wording", () => {
    expect(EMERGENCY_NOTICE).toBe(
      "Not monitored for emergencies. If this is an emergency, call 911.",
    );
    expect(CONTACT_CLINIC_FALLBACK).toBe("contact your clinic");
    expect(BANNED_DIAGNOSTIC_TERMS).toHaveLength(9);
  });

  it("finds banned diagnostic terms as whole words, in any case", () => {
    expect(findBannedDiagnosticTerms("You may have a SPRAIN.")).toEqual(["you may have", "sprain"]);
    expect(
      findBannedDiagnosticTerms("Steady progress this week. Keep the steering wheel."),
    ).toEqual([]);
    expect(findBannedDiagnosticTerms(EMERGENCY_NOTICE)).toEqual([]);
  });
});
