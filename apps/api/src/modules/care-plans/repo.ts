import type { Prisma } from "@carepath/db/client";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import type { PlanRenderGoal, PlanRenderItem } from "./serializer.js";

/**
 * Care plan reads and writes. Every query filters on ctx.orgId and the patient id that the route
 * has already put in scope; versions are reached through their plan's patient.
 */
type Scope = Pick<RequestCtx, "orgId">;

export const exerciseSelect = {
  id: true,
  name: true,
  bodyArea: true,
  category: true,
  description: true,
  instructions: true,
  mediaPath: true,
} as const;

export const assignmentSelect = {
  id: true,
  position: true,
  sets: true,
  reps: true,
  holdSeconds: true,
  durationSeconds: true,
  restSeconds: true,
  daysOfWeek: true,
  timesPerDay: true,
  instructions: true,
  exercise: { select: exerciseSelect },
} as const;

export const practitionerSelect = {
  id: true,
  userId: true,
  givenName: true,
  familyName: true,
  credentials: true,
} as const;

type AssignmentRow = Prisma.ExerciseAssignmentGetPayload<{ select: typeof assignmentSelect }>;

export function toRenderItem(a: AssignmentRow): PlanRenderItem {
  return {
    assignmentId: a.id,
    position: a.position,
    exercise: a.exercise,
    dose: {
      sets: a.sets,
      reps: a.reps,
      holdSeconds: a.holdSeconds,
      durationSeconds: a.durationSeconds,
      restSeconds: a.restSeconds,
    },
    schedule: { daysOfWeek: a.daysOfWeek, timesPerDay: a.timesPerDay },
    clinicianInstructions: a.instructions,
  };
}

const openPlanStatuses = ["draft", "active", "on_hold"] as const;

/** The patient's open plan (at most one, by partial unique index), published or not. */
export async function findOpenPlan(db: DbClient, ctx: Scope, patientId: string) {
  return db.carePlan.findFirst({
    where: { organizationId: ctx.orgId, patientId, status: { in: [...openPlanStatuses] } },
    select: {
      id: true,
      title: true,
      status: true,
      currentVersionId: true,
      draftContent: true,
      draftUpdatedAt: true,
      createdByPractitionerId: true,
    },
  });
}

const versionSelect = {
  id: true,
  carePlanId: true,
  versionNumber: true,
  title: true,
  instructions: true,
  changeNoteForPatient: true,
  publishedAt: true,
  publishedBy: { select: practitionerSelect },
  carePlan: { select: { id: true, currentVersionId: true } },
  assignments: { select: assignmentSelect, orderBy: { position: "asc" } },
} as const;

export type VersionRow = Prisma.CarePlanVersionGetPayload<{ select: typeof versionSelect }>;

/** A published version of one of the patient's plans. */
export async function findVersion(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  versionId: string,
): Promise<VersionRow | null> {
  return db.carePlanVersion.findFirst({
    where: {
      id: versionId,
      organizationId: ctx.orgId,
      carePlan: { patientId, organizationId: ctx.orgId },
    },
    select: versionSelect,
  });
}

export async function findVersionByNumber(
  db: DbClient,
  ctx: Scope,
  carePlanId: string,
  versionNumber: number,
): Promise<VersionRow | null> {
  return db.carePlanVersion.findFirst({
    where: { organizationId: ctx.orgId, carePlanId, versionNumber },
    select: versionSelect,
  });
}

export async function listVersions(db: DbClient, ctx: Scope, patientId: string) {
  return db.carePlanVersion.findMany({
    where: { organizationId: ctx.orgId, carePlan: { patientId, organizationId: ctx.orgId } },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      versionNumber: true,
      publishedAt: true,
      changeNoteForPatient: true,
      publishedBy: { select: practitionerSelect },
      carePlan: { select: { currentVersionId: true } },
    },
  });
}

const liveGoalStatuses = [
  "proposed",
  "planned",
  "accepted",
  "active",
  "on_hold",
  "completed",
] as const;

export async function planGoals(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  carePlanId: string,
): Promise<PlanRenderGoal[]> {
  const rows = await db.goal.findMany({
    where: {
      organizationId: ctx.orgId,
      patientId,
      carePlanId,
      lifecycleStatus: { in: [...liveGoalStatuses] },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, description: true, targetValue: true, targetUnit: true, dueDate: true },
  });
  return rows.map((g) => ({
    id: g.id,
    description: g.description,
    targetValue: g.targetValue === null ? null : Number(g.targetValue),
    targetUnit: g.targetUnit,
    dueDate: g.dueDate ? g.dueDate.toISOString().slice(0, 10) : null,
  }));
}

/** Goals of the patient's open plan; used by progress. */
export async function openPlanGoals(db: DbClient, ctx: Scope, patientId: string) {
  const plan = await findOpenPlan(db, ctx, patientId);
  return plan ? planGoals(db, ctx, patientId, plan.id) : [];
}

/**
 * Plan-change acknowledgement (REQ-TOD-02) is the read time of the patient's
 * `care_plan_published` notification for the version.
 */
export async function findUnreadPlanNotice(
  db: DbClient,
  ctx: Scope,
  patientUserId: string,
  versionId: string,
): Promise<boolean> {
  const row = await db.notification.findFirst({
    where: {
      organizationId: ctx.orgId,
      userId: patientUserId,
      type: "care_plan_published",
      sourceType: "CarePlanVersion",
      sourceId: versionId,
      readAt: null,
    },
    select: { id: true },
  });
  return row !== null;
}

export async function markPlanNoticeRead(
  db: DbClient,
  ctx: Scope,
  patientUserId: string,
  versionId: string,
  at: Date,
): Promise<void> {
  await db.notification.updateMany({
    where: {
      organizationId: ctx.orgId,
      userId: patientUserId,
      type: "care_plan_published",
      sourceType: "CarePlanVersion",
      sourceId: versionId,
      readAt: null,
    },
    data: { readAt: at },
  });
}

/** The user id of the patient's login, if the patient has one. */
export async function patientUserId(
  db: DbClient,
  ctx: Scope,
  patientId: string,
): Promise<string | null> {
  const row = await db.patient.findFirst({
    where: { id: patientId, organizationId: ctx.orgId },
    select: { userId: true },
  });
  return row?.userId ?? null;
}
