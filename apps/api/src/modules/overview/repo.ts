import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

/** Overview work lists for the signed-in clinician's care-team patients (REQ-OVR-01). */
type Scope = Pick<RequestCtx, "orgId" | "userId">;

const patientSelect = { id: true, givenName: true, familyName: true, mrn: true } as const;

/** Patients whose active care team includes the caller. */
export async function caseload(db: DbClient, ctx: Scope) {
  return db.patient.findMany({
    where: {
      organizationId: ctx.orgId,
      careTeam: {
        organizationId: ctx.orgId,
        status: "active",
        members: { some: { userId: ctx.userId, endedAt: null } },
      },
    },
    orderBy: [{ familyName: "asc" }, { givenName: "asc" }, { id: "asc" }],
    select: { ...patientSelect, status: true },
  });
}

/** Lists are complete up to this many rows, so each count equals its list length. */
export const WORK_LIST_LIMIT = 200;

export async function unreviewedCheckIns(db: DbClient, ctx: Scope, patientIds: string[]) {
  return db.patientCheckIn.findMany({
    where: { organizationId: ctx.orgId, patientId: { in: patientIds }, reviewedAt: null },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: WORK_LIST_LIMIT,
    select: {
      id: true,
      painScore: true,
      submittedAt: true,
      sessionId: true,
      patient: { select: patientSelect },
    },
  });
}

export async function recentPublishes(db: DbClient, ctx: Scope, patientIds: string[], since: Date) {
  return db.carePlanVersion.findMany({
    where: {
      organizationId: ctx.orgId,
      publishedAt: { gte: since },
      carePlan: { organizationId: ctx.orgId, patientId: { in: patientIds } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: WORK_LIST_LIMIT,
    select: {
      id: true,
      versionNumber: true,
      publishedAt: true,
      publishedBy: {
        select: { id: true, userId: true, givenName: true, familyName: true, credentials: true },
      },
      carePlan: { select: { patient: { select: patientSelect } } },
    },
  });
}
