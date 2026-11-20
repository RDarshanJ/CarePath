import type { RequestCtx } from "../../core/context.js";
import type { Db } from "../../core/db/repo.js";
import { patientScopeWhere } from "../../core/scope/repo.js";

/** Patient header: the persistent identity block shown on every record view. Scoped by ctx. */
export async function findPatientHeader(db: Db, ctx: RequestCtx, patientId: string) {
  const where = patientScopeWhere(ctx, patientId);
  if (!where) return null;
  return db.patient.findFirst({
    where,
    select: {
      id: true,
      mrn: true,
      givenName: true,
      familyName: true,
      birthDate: true,
      gender: true,
      status: true,
      timezone: true,
      preferredLanguage: true,
    },
  });
}
