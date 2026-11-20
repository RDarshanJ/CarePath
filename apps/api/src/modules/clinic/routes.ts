import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import { clinicCardSchema, patientIdParamsSchema } from "@carepath/shared/contracts";
import { errorResponses } from "../../core/errors.js";
import { requirePatientRead } from "../../core/scope/patient-scope.js";
import { findClinic } from "./repo.js";

export const clinicRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/patients/:patientId/clinic",
    {
      config: { access: { permission: ["patient.read_own", "patient.read"] } },
      schema: {
        operationId: "getClinicCard",
        tags: ["clinic"],
        summary: "The patient's clinic: name, phone, reply-time text and the emergency notice.",
        params: patientIdParamsSchema,
        response: { 200: clinicCardSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const ctx = await requirePatientRead(request, request.params.patientId);
      const org = await findClinic(app.deps.db, ctx);
      return {
        organizationId: org.id,
        name: org.name,
        timezone: org.timezone,
        phone: org.phone,
        replyTimeText: org.replyTimeText,
        emergencyNotice: EMERGENCY_NOTICE,
      };
    },
  );
};
