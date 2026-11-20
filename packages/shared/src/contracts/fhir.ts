import { z } from "zod";

/**
 * FHIR export and import (WP 5.4, ADR-11 as amended by advisor plan revision 1). Resources are
 * FHIR R4 JSON with US Core-aligned shapes, validated by CarePath's defined checks; they are not
 * claimed to pass the official HL7 validator. The resource bodies are described loosely here:
 * their structure is checked by @carepath/fhir, not by these schemas.
 */

/** A FHIR resource: an object with a resourceType. Other members pass through unchanged. */
export const fhirResourceSchema = z
  .looseObject({ resourceType: z.string() })
  .meta({ id: "FhirResource" });

export const fhirBundleSchema = z
  .looseObject({
    resourceType: z.literal("Bundle"),
    type: z.string(),
    timestamp: z.string().optional(),
    entry: z
      .array(z.looseObject({ fullUrl: z.string().optional(), resource: fhirResourceSchema }))
      .optional(),
  })
  .meta({ id: "FhirBundle" });
export type FhirBundle = z.infer<typeof fhirBundleSchema>;

/** Import body: any JSON object; the importer checks that it is a Bundle and reports why not. */
export const fhirImportBodySchema = z.looseObject({}).meta({ id: "FhirImportBody" });

export const fhirImportQuerySchema = z.object({
  /** reject (default): any duplicate fails the import with 409. skip: duplicates are reused. */
  onDuplicate: z.enum(["reject", "skip"]).default("reject"),
});

export const operationOutcomeIssueSchema = z.object({
  severity: z.enum(["fatal", "error", "warning", "information"]),
  code: z.string(),
  details: z
    .object({
      coding: z.array(z.object({ system: z.string(), code: z.string() })).optional(),
      text: z.string().optional(),
    })
    .optional(),
  diagnostics: z.string().optional(),
  expression: z.array(z.string()).optional(),
});

/**
 * FHIR OperationOutcome. Failed imports answer with one: 400 (not a Bundle, or structurally
 * invalid), 422 (CarePath checks: required elements, references, organization boundary,
 * mapping), 409 (duplicates with onDuplicate=reject). Each issue names its rule in
 * `details.coding` (system urn:carepath:fhir-check), its layer in `diagnostics`, and its location
 * in `expression`, for example `Bundle.entry[3].resource.subject`.
 */
export const operationOutcomeSchema = z
  .object({
    resourceType: z.literal("OperationOutcome"),
    issue: z.array(operationOutcomeIssueSchema),
  })
  .meta({ id: "OperationOutcome" });
export type OperationOutcomeBody = z.infer<typeof operationOutcomeSchema>;

const countSchema = z.object({
  created: z.number().int(),
  duplicate: z.number().int(),
  skipped: z.number().int(),
  invalid: z.number().int(),
});

/** Successful import (201 when something was created, 200 when every record already existed). */
export const fhirImportReportSchema = z
  .object({
    status: z.enum(["imported", "nothing_new"]),
    /** Per resource type in the bundle, including skipped types. */
    counts: z.record(z.string(), countSchema),
    entries: z.array(
      z.object({
        index: z.number().int(),
        fullUrl: z.string().nullable(),
        resourceType: z.string(),
        action: z.enum(["create", "duplicate", "skipped", "organization", "invalid"]),
        /** CarePath id created or matched (CarePlan: the version id). */
        id: z.string().nullable(),
      }),
    ),
    /** Warnings and information: skipped types, dropped references, derived practitioners. */
    outcome: operationOutcomeSchema,
  })
  .meta({ id: "FhirImportReport" });
export type FhirImportReport = z.infer<typeof fhirImportReportSchema>;
