import type { RequestCtx } from "../context.js";
import type { Db } from "../db/repo.js";

/**
 * Scoped lookups (ADR-8). Every query filters on ctx.orgId; the patient role is also pinned to
 * ctx.patientId. A row outside that scope is indistinguishable from a missing row.
 */
export function patientScopeWhere(
  ctx: RequestCtx,
  patientId: string,
): { id: string; organizationId: string } | null {
  if (ctx.role === "patient" && ctx.patientId !== patientId) return null;
  return { id: patientId, organizationId: ctx.orgId };
}

/** Returns the patient id when it is inside the caller's scope, otherwise null. */
export async function findScopedPatientId(
  db: Db,
  ctx: RequestCtx,
  patientId: string,
): Promise<string | null> {
  const where = patientScopeWhere(ctx, patientId);
  if (!where) return null;
  const row = await db.patient.findFirst({ where, select: { id: true } });
  return row?.id ?? null;
}

/** True when the caller is an active member of the patient's active care team. */
export async function isOnCareTeam(db: Db, ctx: RequestCtx, patientId: string): Promise<boolean> {
  const row = await db.careTeamMember.findFirst({
    where: {
      organizationId: ctx.orgId,
      userId: ctx.userId,
      endedAt: null,
      careTeam: { patientId, organizationId: ctx.orgId, status: "active" },
    },
    select: { id: true },
  });
  return row !== null;
}
