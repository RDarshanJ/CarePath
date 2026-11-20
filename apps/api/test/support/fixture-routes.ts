import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requirePatientWrite } from "../../src/core/scope/patient-scope.js";

/**
 * Routes that exist only in tests. They exercise core plumbing (care-team write scope,
 * unexpected errors, PHI in bodies) before any feature module ships a real write endpoint.
 */
export function fixtureRoutes(app: FastifyInstance): void {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    "/test/patients/:patientId/clinical-write",
    {
      config: { access: { permission: ["clinical.write", "checkin.write_own"] } },
      schema: { params: z.object({ patientId: z.uuid() }) },
    },
    async (request) => {
      await requirePatientWrite(request, request.params.patientId, { careTeamOnly: true });
      return { ok: true };
    },
  );

  r.post(
    "/test/check-in",
    {
      config: { access: { auth: "public" } },
      schema: {
        body: z
          .object({ painScore: z.number().int().min(0).max(10), note: z.string().max(200) })
          .strict(),
      },
    },
    async (request) => {
      // Simulates a bug whose error message quotes patient content.
      throw new Error(
        `failed to save check-in "${request.body.note}" pain=${request.body.painScore}`,
      );
    },
  );
}
