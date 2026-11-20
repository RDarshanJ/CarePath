import { Prisma } from "@carepath/db/client";
import { initialStatus } from "@carepath/db";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import type { PlanRenderGoal, PlanRenderItem } from "./serializer.js";

/**
 * Care plan reads and writes. Every query filters on ctx.orgId and the patient id that the route
 * has already put in scope; versions are reached through their plan's patient.
 */
type Scope = Pick<RequestCtx, "orgId">;
const DbNull = Prisma.DbNull;

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

// ---- draft and publish (delivery step 4) ----------------------------------------------------

/** Locks the open plan row for the rest of the transaction (autosave and publish serialize). */
export async function lockOpenPlan(db: DbClient, ctx: Scope, patientId: string) {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "CarePlan"
    WHERE "organizationId" = ${ctx.orgId}::uuid AND "patientId" = ${patientId}::uuid
      AND status IN ('draft', 'active', 'on_hold')
    FOR UPDATE`;
  return rows[0] ? findOpenPlan(db, ctx, patientId) : null;
}

export async function nextVersionNumber(db: DbClient, ctx: Scope, carePlanId: string) {
  const agg = await db.carePlanVersion.aggregate({
    where: { organizationId: ctx.orgId, carePlanId },
    _max: { versionNumber: true },
  });
  return (agg._max.versionNumber ?? 0) + 1;
}

export async function insertPlan(
  db: DbClient,
  ctx: Scope,
  input: { patientId: string; title: string; practitionerId: string; now: Date },
): Promise<string> {
  const row = await db.carePlan.create({
    data: {
      organizationId: ctx.orgId,
      patientId: input.patientId,
      title: input.title,
      status: initialStatus.CarePlan,
      createdByPractitionerId: input.practitionerId,
      createdAt: input.now,
      updatedAt: input.now,
    },
    select: { id: true },
  });
  return row.id;
}

export async function saveDraft(
  db: DbClient,
  ctx: Scope,
  carePlanId: string,
  content: Prisma.InputJsonValue,
  at: Date,
): Promise<void> {
  const res = await db.carePlan.updateMany({
    where: { id: carePlanId, organizationId: ctx.orgId },
    data: { draftContent: content, draftUpdatedAt: at, updatedAt: at },
  });
  if (res.count !== 1) throw new Error("plan update matched no row in scope");
}

export async function practitionerById(db: DbClient, ctx: Scope, practitionerId: string) {
  return db.practitioner.findFirst({
    where: { id: practitionerId, organizationId: ctx.orgId },
    select: practitionerSelect,
  });
}

export interface NewAssignment {
  exerciseId: string;
  position: number;
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  daysOfWeek: number[];
  timesPerDay: number;
  instructions: string | null;
}

/** Appends an immutable version with its assignments (ADR-10). */
export async function insertVersion(
  db: DbClient,
  ctx: Scope,
  input: {
    carePlanId: string;
    versionNumber: number;
    title: string;
    instructions: string;
    changeNoteForPatient: string | null;
    practitionerId: string;
    now: Date;
    assignments: NewAssignment[];
  },
): Promise<string> {
  const v = await db.carePlanVersion.create({
    data: {
      organizationId: ctx.orgId,
      carePlanId: input.carePlanId,
      versionNumber: input.versionNumber,
      title: input.title,
      instructions: input.instructions,
      changeNoteForPatient: input.changeNoteForPatient,
      publishedByPractitionerId: input.practitionerId,
      publishedAt: input.now,
    },
    select: { id: true },
  });
  await db.exerciseAssignment.createMany({
    data: input.assignments.map((a) => ({
      ...a,
      organizationId: ctx.orgId,
      carePlanVersionId: v.id,
      createdAt: input.now,
    })),
  });
  return v.id;
}

/** Points the plan at the new version, activates a first publish and clears the draft. */
export async function markPublished(
  db: DbClient,
  ctx: Scope,
  carePlanId: string,
  input: { versionId: string; title: string; activate: boolean; now: Date },
): Promise<void> {
  const res = await db.carePlan.updateMany({
    where: { id: carePlanId, organizationId: ctx.orgId },
    data: {
      currentVersionId: input.versionId,
      title: input.title,
      ...(input.activate ? { status: "active" as const } : {}),
      draftContent: DbNull,
      draftUpdatedAt: null,
      updatedAt: input.now,
    },
  });
  if (res.count !== 1) throw new Error("plan update matched no row in scope");
}

const cancellableGoal = ["proposed", "planned", "accepted", "active", "on_hold"] as const;

/**
 * Makes the plan's goals match the published draft: listed goals are updated and active, new
 * ones are inserted in their initial status and then activated, unlisted ones are cancelled.
 */
export async function syncGoals(
  db: DbClient,
  ctx: Scope,
  input: {
    patientId: string;
    carePlanId: string;
    goals: {
      id: string | null;
      description: string;
      targetValue: number | null;
      targetUnit: string | null;
      dueDate: string | null;
    }[];
    now: Date;
  },
): Promise<void> {
  const where = {
    organizationId: ctx.orgId,
    patientId: input.patientId,
    carePlanId: input.carePlanId,
  };
  const kept = input.goals.map((g) => g.id).filter((id): id is string => id !== null);
  await db.goal.updateMany({
    where: { ...where, id: { notIn: kept }, lifecycleStatus: { in: [...cancellableGoal] } },
    data: { lifecycleStatus: "cancelled", updatedAt: input.now },
  });
  for (const g of input.goals) {
    const fields = {
      description: g.description,
      targetValue: g.targetValue,
      targetUnit: g.targetUnit,
      dueDate: g.dueDate ? new Date(`${g.dueDate}T00:00:00Z`) : null,
      updatedAt: input.now,
    };
    let id = g.id;
    if (id === null) {
      const row = await db.goal.create({
        data: {
          ...where,
          ...fields,
          lifecycleStatus: initialStatus.Goal,
          startDate: input.now,
          createdAt: input.now,
        },
        select: { id: true },
      });
      id = row.id;
    } else {
      await db.goal.updateMany({ where: { ...where, id }, data: fields });
    }
    await db.goal.updateMany({
      where: { ...where, id, lifecycleStatus: { in: ["proposed", "planned", "accepted"] } },
      data: { lifecycleStatus: "active" },
    });
  }
}

/** Goal ids that belong to the plan; used to validate draft goal references. */
export async function planGoalIds(db: DbClient, ctx: Scope, carePlanId: string) {
  const rows = await db.goal.findMany({
    where: { organizationId: ctx.orgId, carePlanId },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/** In-app notice to the patient (REQ-TOD-02 reads it as the plan-change explanation). */
export async function notifyPlanPublished(
  db: DbClient,
  ctx: Scope,
  input: {
    userId: string;
    versionId: string;
    versionNumber: number;
    note: string | null;
    title: string;
    now: Date;
  },
): Promise<void> {
  await db.notification.create({
    data: {
      organizationId: ctx.orgId,
      userId: input.userId,
      type: "care_plan_published",
      title: input.versionNumber === 1 ? "Your care plan is ready" : "Your care plan was updated",
      body: input.note ?? `Your therapist published "${input.title}".`,
      linkPath: "/plan",
      sourceType: "CarePlanVersion",
      sourceId: input.versionId,
      createdAt: input.now,
    },
  });
}
