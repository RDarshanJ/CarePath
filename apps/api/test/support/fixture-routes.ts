import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireCtx } from "../../src/core/context.js";
import { withTx } from "../../src/core/db/tx.js";
import { requirePatientWrite } from "../../src/core/scope/patient-scope.js";
import { createOrgFixture, setPatientPhone, violate } from "./repo.js";

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

  // A mutation plus its audit event through withTx (M4). `failAudit` makes the audit insert
  // fail on a foreign key (an unknown patient id), after the change has been written.
  r.post(
    "/test/patients/:patientId/phone",
    {
      config: { access: { permission: ["patient.update_admin", "patient.update_own"] } },
      schema: {
        params: z.object({ patientId: z.uuid() }),
        body: z.object({ phone: z.string().min(3).max(40), failAudit: z.boolean() }).strict(),
      },
    },
    async (request) => {
      const { patientId } = request.params;
      await requirePatientWrite(request, patientId, { careTeamOnly: false });
      await withTx(request, async ({ tx, ctx, audit }) => {
        await setPatientPhone(tx, requireCtx(ctx), patientId, request.body.phone);
        await audit({
          eventName: "settings.update",
          action: "U",
          outcome: "success",
          resourceType: "Patient",
          resourceId: patientId,
          patientId: request.body.failAudit ? randomUUID() : patientId,
        });
      });
      return { ok: true };
    },
  );

  // M5: each kind runs one statement the database rejects, then lets the error propagate.
  r.post(
    "/test/db-error/:kind",
    {
      config: { access: { auth: "public" } },
      schema: {
        params: z.object({ kind: z.enum(["overlap", "duplicate", "transition", "domain_rule"]) }),
      },
    },
    async (request) => {
      const org = await createOrgFixture(app.deps.db);
      await violate(app.deps.db, org, request.params.kind);
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
