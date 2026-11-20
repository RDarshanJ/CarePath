import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { requirePatientRead } from "../../core/scope/patient-scope.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { findPatientHeader } from "./repo.js";

export const patientIdParams = z.object({ patientId: z.uuid() });

export const patientHeaderSchema = z
  .object({
    id: z.uuid(),
    mrn: z.string(),
    givenName: z.string(),
    familyName: z.string(),
    birthDate: z.iso.date(),
    gender: z.enum(["female", "male", "other", "unknown"]),
    status: z.enum([
      "intake_incomplete",
      "awaiting_assignment",
      "active",
      "inactive",
      "discharged",
    ]),
    timezone: z.string(),
    preferredLanguage: z.string(),
  })
  .meta({ id: "PatientHeader" });

const purposeByRole = {
  patient: "patient_access",
  physical_therapist: "treatment",
  care_coordinator: "operations",
  clinic_admin: "operations",
} as const;

export const patientRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, audit } = app.deps;

  app.get(
    "/patients/:patientId",
    {
      config: { access: { permission: ["patient.read", "patient.read_own"] } },
      schema: {
        operationId: "getPatientHeader",
        tags: ["patients"],
        summary: "Patient header. Opening it writes a phi.read audit event.",
        params: patientIdParams,
        response: { 200: patientHeaderSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const row = await findPatientHeader(db, ctx, patientId);
      if (!row) throw new AppError("not_found");
      // PRD section 13 and advisor plan revision 1: every record open is audited.
      await audit.fromRequest(request, {
        eventName: "phi.read",
        action: "R",
        outcome: "success",
        resourceType: "Patient",
        resourceId: row.id,
        patientId: row.id,
        purposeOfUse: purposeByRole[ctx.role],
      });
      return { ...row, birthDate: row.birthDate.toISOString().slice(0, 10) };
    },
  );
};
