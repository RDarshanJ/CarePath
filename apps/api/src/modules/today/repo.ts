import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

export async function findPatientBasics(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  patientId: string,
) {
  return db.patient.findFirstOrThrow({
    where: { id: patientId, organizationId: ctx.orgId },
    select: { id: true, givenName: true, status: true, userId: true },
  });
}
