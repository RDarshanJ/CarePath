import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { patientHeaderSchema, patientIdParamsSchema } from "@carepath/shared/contracts";
import { recordPhiRead, requirePatientRead } from "../../core/scope/patient-scope.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { findPatientHeader } from "./repo.js";

export const patientRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db } = app.deps;

  app.get(
    "/patients/:patientId",
    {
      config: { access: { permission: ["patient.read", "patient.read_own"] } },
      schema: {
        operationId: "getPatientHeader",
        tags: ["patients"],
        summary: "Patient header. Opening it writes a phi.read audit event.",
        params: patientIdParamsSchema,
        response: { 200: patientHeaderSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const row = await findPatientHeader(db, ctx, patientId);
      if (!row) throw new AppError("not_found");
      // PRD section 13 and advisor plan revision 1: every record open is audited.
      await recordPhiRead(request, row.id, "Patient", row.id, { includePatient: true });
      return { ...row, birthDate: row.birthDate.toISOString().slice(0, 10) };
    },
  );
};
