import type { RequestCtx } from "../context.js";
import type { DbClient } from "../db/repo.js";

/**
 * Scoped lookups (ADR-8). Every query filters on ctx.orgId; the patient role is also pinned to
 * ctx.patientId. A row outside that scope is indistinguishable from a missing row.
 *
 * Child resources are looked up through their parent, never by bare id (C1 section 5.4, M8):
 * a session id is only found under the patient it belongs to, an activity only under its
 * session, a plan version only under the patient's plan.
 */
export function patientScopeWhere(
  ctx: Pick<RequestCtx, "orgId" | "role" | "patientId">,
  patientId: string,
): { id: string; organizationId: string } | null {
  if (ctx.role === "patient" && ctx.patientId !== patientId) return null;
  return { id: patientId, organizationId: ctx.orgId };
}

/** Returns the patient id when it is inside the caller's scope, otherwise null. */
export async function findScopedPatientId(
  db: DbClient,
  ctx: RequestCtx,
  patientId: string,
): Promise<string | null> {
  const where = patientScopeWhere(ctx, patientId);
  if (!where) return null;
  const row = await db.patient.findFirst({ where, select: { id: true } });
  return row?.id ?? null;
}

/** True when the caller is an active member of the patient's active care team. */
export async function isOnCareTeam(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId" | "userId">,
  patientId: string,
): Promise<boolean> {
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

/**
 * Of the given patients, those whose active care team has the caller as an active member (CR-2).
 * One query for a whole page; the same condition as isOnCareTeam.
 */
export async function careTeamPatientIds(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId" | "userId">,
  patientIds: readonly string[],
): Promise<Set<string>> {
  if (patientIds.length === 0) return new Set();
  const rows = await db.careTeamMember.findMany({
    where: {
      organizationId: ctx.orgId,
      userId: ctx.userId,
      endedAt: null,
      careTeam: {
        patientId: { in: [...new Set(patientIds)] },
        organizationId: ctx.orgId,
        status: "active",
      },
    },
    select: { careTeam: { select: { patientId: true } } },
  });
  return new Set(rows.map((r) => r.careTeam.patientId));
}

/** Child resources of a patient, keyed by the resource type recorded in audit events. */
export type PatientChild =
  | "ExerciseSession"
  | "PatientCheckIn"
  | "ReviewTask"
  | "CarePlanVersion"
  | "Consent"
  | "Appointment";

/**
 * One scoped finder per child resource. `patientId` must already be in scope
 * (requirePatientRead); this proves the child belongs to that patient in that organization.
 */
export async function childExists(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  kind: PatientChild,
  patientId: string,
  id: string,
): Promise<boolean> {
  const scope = { id, organizationId: ctx.orgId };
  const select = { id: true } as const;
  switch (kind) {
    case "ExerciseSession":
      return (
        (await db.exerciseSession.findFirst({ where: { ...scope, patientId }, select })) !== null
      );
    case "PatientCheckIn":
      return (
        (await db.patientCheckIn.findFirst({ where: { ...scope, patientId }, select })) !== null
      );
    case "ReviewTask":
      return (await db.reviewTask.findFirst({ where: { ...scope, patientId }, select })) !== null;
    case "Consent":
      return (await db.consent.findFirst({ where: { ...scope, patientId }, select })) !== null;
    case "Appointment":
      return (await db.appointment.findFirst({ where: { ...scope, patientId }, select })) !== null;
    case "CarePlanVersion":
      return (
        (await db.carePlanVersion.findFirst({
          where: { ...scope, carePlan: { patientId, organizationId: ctx.orgId } },
          select,
        })) !== null
      );
  }
}

/** An activity is found only under its session, which was itself checked against the patient. */
export async function activityInSession(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  sessionId: string,
  activityId: string,
): Promise<boolean> {
  const row = await db.sessionActivity.findFirst({
    where: { id: activityId, sessionId, organizationId: ctx.orgId },
    select: { id: true },
  });
  return row !== null;
}

/** Organization-level resources (review rules). */
export async function ruleInOrg(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  ruleId: string,
): Promise<boolean> {
  const row = await db.reviewRule.findFirst({
    where: { id: ruleId, organizationId: ctx.orgId },
    select: { id: true },
  });
  return row !== null;
}

/** A practitioner of the caller's organization (slots, day agenda). */
export async function practitionerInOrg(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  practitionerId: string,
): Promise<{ id: string; userId: string | null } | null> {
  return db.practitioner.findFirst({
    where: { id: practitionerId, organizationId: ctx.orgId },
    select: { id: true, userId: true },
  });
}
