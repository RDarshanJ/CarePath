import { randomUUID } from "node:crypto";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  buildPatientBundle,
  isError,
  planImport,
  toOperationOutcome,
  validateBundle,
} from "@carepath/fhir";
import {
  errorEnvelopeSchema,
  fhirBundleSchema,
  fhirImportBodySchema,
  fhirImportQuerySchema,
  fhirImportReportSchema,
  operationOutcomeSchema,
  patientIdParamsSchema,
  type FhirBundle,
  type FhirImportReport,
  type OperationOutcomeBody,
} from "@carepath/shared/contracts";
import { requireCtx } from "../../core/context.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { requirePatientRead } from "../../core/scope/patient-scope.js";
import { importLookup, loadPatientExport, organizationSlug, persistImport } from "./repo.js";

/** Import bodies may be larger than the 1 MB default (a Synthea bundle is about 200 KB to 1 MB). */
const IMPORT_BODY_LIMIT = 5 * 1024 * 1024;

/** Failed imports answer with a FHIR OperationOutcome; access and body errors keep the envelope. */
const importFailure = z.union([errorEnvelopeSchema, operationOutcomeSchema]);

/**
 * FHIR R4 export and import (WP 5.4 batch 1, WP 5.4b batch 2). Plain CarePath paths: the export is one
 * patient's record as a collection Bundle, not the FHIR Bulk Data `$export` operation.
 */
export const fhirRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, audit, now } = app.deps;

  // FHIR clients send application/fhir+json; parse it like JSON, inside this plugin only.
  app.addContentTypeParser(
    "application/fhir+json",
    { parseAs: "string", bodyLimit: IMPORT_BODY_LIMIT },
    app.getDefaultJsonParser("error", "error"),
  );

  app.get(
    "/patients/:patientId/fhir/export",
    {
      config: { access: { permission: ["fhir.export", "fhir.export_own"] } },
      schema: {
        operationId: "exportPatientFhir",
        tags: ["fhir"],
        summary:
          "One patient's record as a FHIR R4 collection Bundle (Organization, Practitioner, Patient, Appointment, Encounter for visits that took place, Condition, Goal, CarePlan per published version, Observation, DocumentReference per version of a signed note; drafts and notes marked entered in error are never exported). US Core-aligned shapes, validated by CarePath's defined checks before it is sent.",
        params: patientIdParamsSchema,
        response: { 200: fhirBundleSchema, ...errorResponses(400, 401, 403, 404, 429, 500) },
      },
    },
    async (request, reply): Promise<FhirBundle> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const data = await loadPatientExport(db, ctx, patientId);
      if (!data) throw new AppError("not_found");
      const bundle = buildPatientBundle(data, now().toISOString());
      const check = validateBundle(bundle, { orgSlug: data.organization.slug });
      if (!check.valid) {
        // An export that fails CarePath's own checks is a defect; never send it.
        request.log.error(
          { rules: [...new Set(check.issues.filter(isError).map((i) => i.rule))] },
          "fhir export failed validation",
        );
        throw new AppError("internal_error");
      }
      await audit.fromRequest(request, {
        eventName: "export.fhir",
        action: "E",
        outcome: "success",
        resourceType: "Patient",
        resourceId: patientId,
        patientId,
        purposeOfUse: "export",
        metadata: { entries: bundle.entry?.length ?? 0, format: "fhir-r4-collection" },
      });
      reply.header("content-disposition", `attachment; filename="patient-${patientId}.fhir.json"`);
      return bundle as FhirBundle;
    },
  );

  app.post(
    "/fhir/import",
    {
      bodyLimit: IMPORT_BODY_LIMIT,
      config: { access: { permission: "fhir.import" } },
      schema: {
        operationId: "importFhirBundle",
        tags: ["fhir"],
        summary:
          "Validate a FHIR R4 Bundle (collection, transaction or batch) with three layers and import its Practitioner, Patient, Encounter (AMB and VR visits), Condition, Goal, CarePlan and Observation resources into the caller's organization. Other resource types, including Appointment and DocumentReference (export only), are skipped and listed. 400: not a Bundle or structurally invalid; 422: CarePath checks fail; 409: duplicates with onDuplicate=reject; failures answer with an itemised OperationOutcome and write nothing.",
        querystring: fhirImportQuerySchema,
        body: fhirImportBodySchema,
        response: {
          200: fhirImportReportSchema,
          201: fhirImportReportSchema,
          400: importFailure,
          401: errorEnvelopeSchema,
          403: errorEnvelopeSchema,
          409: importFailure,
          413: errorEnvelopeSchema,
          415: errorEnvelopeSchema,
          422: importFailure,
          429: errorEnvelopeSchema,
        },
      },
    },
    async (request, reply): Promise<FhirImportReport | OperationOutcomeBody> => {
      const ctx = requireCtx(request.ctx);
      const slug = await organizationSlug(db, ctx);
      const plan = await planImport(request.body, {
        lookup: importLookup(db, ctx, slug),
        onDuplicate: request.query.onDuplicate,
        newId: randomUUID,
      });
      const errors = plan.issues.filter(isError).length;
      if (plan.status >= 400) {
        // Nothing was written, so the event goes outside any transaction.
        await audit.fromRequest(request, {
          eventName: "import.fhir",
          action: "C",
          outcome: "minor_failure",
          resourceType: "Bundle",
          purposeOfUse: "operations",
          detailCode: `rejected_${plan.status}`,
          metadata: { errors, entries: plan.entries.length },
        });
        return reply
          .code(plan.status)
          .send(toOperationOutcome(plan.issues) as OperationOutcomeBody);
      }
      const created = plan.entries.filter((e) => e.action === "create").length;
      await withTx(
        request,
        async ({ tx, audit: auditTx }) => {
          await persistImport(tx, ctx, plan);
          await auditTx({
            eventName: "import.fhir",
            action: "C",
            outcome: "success",
            resourceType: "Bundle",
            purposeOfUse: "operations",
            metadata: {
              created,
              duplicates: plan.entries.filter((e) => e.action === "duplicate").length,
              skipped: plan.entries.filter((e) => e.action === "skipped").length,
              patients: plan.creates.patients.length,
            },
          });
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
      const report: FhirImportReport = {
        status: created > 0 ? "imported" : "nothing_new",
        counts: plan.counts,
        entries: plan.entries,
        outcome: toOperationOutcome(plan.issues) as OperationOutcomeBody,
      };
      return reply.code(plan.status).send(report);
    },
  );
};
