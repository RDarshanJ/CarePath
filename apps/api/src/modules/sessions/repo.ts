import type { Prisma } from "@carepath/db/client";
import { initialStatus } from "@carepath/db";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { assignmentSelect } from "../care-plans/repo.js";

/**
 * Exercise sessions. Reads and writes are always keyed by (organization, patient, session):
 * the route has put the patient in scope and checked the session through requireChild.
 */
type Scope = Pick<RequestCtx, "orgId">;

const detailSelect = {
  id: true,
  patientId: true,
  status: true,
  carePlanVersionId: true,
  currentPosition: true,
  elapsedSeconds: true,
  startedAt: true,
  pausedAt: true,
  completedAt: true,
  stoppedAt: true,
  updatedAt: true,
  carePlanVersion: { select: { versionNumber: true } },
  checkIns: { select: { id: true }, orderBy: { submittedAt: "asc" as const }, take: 1 },
  activities: {
    select: {
      id: true,
      assignmentId: true,
      status: true,
      completedSets: true,
      completedReps: true,
      durationSeconds: true,
      skipReason: true,
      discomfortLevel: true,
      discomfortNote: true,
      completedAt: true,
      assignment: { select: assignmentSelect },
    },
  },
} as const;

export type SessionDetailRow = Prisma.ExerciseSessionGetPayload<{ select: typeof detailSelect }>;

export async function findSessionDetail(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  sessionId: string,
): Promise<SessionDetailRow | null> {
  return db.exerciseSession.findFirst({
    where: { id: sessionId, organizationId: ctx.orgId, patientId },
    select: detailSelect,
  });
}

const summarySelect = {
  id: true,
  status: true,
  carePlanVersionId: true,
  elapsedSeconds: true,
  startedAt: true,
  pausedAt: true,
  completedAt: true,
  stoppedAt: true,
  carePlanVersion: { select: { versionNumber: true } },
  checkIns: { select: { id: true }, orderBy: { submittedAt: "asc" as const }, take: 1 },
  activities: { select: { status: true } },
} as const;

export type SessionSummaryRow = Prisma.ExerciseSessionGetPayload<{ select: typeof summarySelect }>;

/** Newest first. */
export async function listSessions(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  offset: number,
  take: number,
): Promise<SessionSummaryRow[]> {
  return db.exerciseSession.findMany({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    skip: offset,
    take,
    select: summarySelect,
  });
}

/** The patient's open session (in progress or paused), if any. At most one by partial index. */
export async function findOpenSession(db: DbClient, ctx: Scope, patientId: string) {
  return db.exerciseSession.findFirst({
    where: { organizationId: ctx.orgId, patientId, status: { in: ["in_progress", "paused"] } },
    select: { id: true, status: true },
  });
}

/** The most recent session that ended (completed or stopped) at or after `since`. */
export async function findLastEndedSession(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  since: Date,
) {
  return db.exerciseSession.findFirst({
    where: {
      organizationId: ctx.orgId,
      patientId,
      OR: [
        { status: "completed", completedAt: { gte: since } },
        { status: "stopped_discomfort", stoppedAt: { gte: since } },
      ],
    },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    select: { id: true, checkIns: { select: { id: true }, take: 1 } },
  });
}

// ---- writes -------------------------------------------------------------------------------

/**
 * Starts a session on `versionId` with one pending activity per assignment, in plan order.
 * Status and activity status come from initialStatus (C1 ruling 3.4). A second open session
 * for the patient hits the partial unique index (23505); the route answers `session_open`.
 */
export async function insertSession(
  db: DbClient,
  ctx: Scope,
  input: { patientId: string; versionId: string; assignmentIds: string[]; now: Date },
): Promise<string> {
  const session = await db.exerciseSession.create({
    data: {
      organizationId: ctx.orgId,
      patientId: input.patientId,
      carePlanVersionId: input.versionId,
      status: initialStatus.ExerciseSession,
      startedAt: input.now,
      updatedAt: input.now,
    },
    select: { id: true },
  });
  await db.sessionActivity.createMany({
    data: input.assignmentIds.map((assignmentId) => ({
      organizationId: ctx.orgId,
      sessionId: session.id,
      assignmentId,
      status: initialStatus.SessionActivity,
      updatedAt: input.now,
    })),
  });
  return session.id;
}

/**
 * Locks the session row for the rest of the transaction and returns its status, so two
 * concurrent actions on one session apply one after the other.
 */
export async function lockSession(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  sessionId: string,
): Promise<{ status: string; carePlanVersionId: string; startedAt: Date } | null> {
  const rows = await db.$queryRaw<{ status: string; carePlanVersionId: string; startedAt: Date }[]>`
    SELECT status::text AS status, "carePlanVersionId", "startedAt" FROM "ExerciseSession"
    WHERE id = ${sessionId}::uuid AND "organizationId" = ${ctx.orgId}::uuid
      AND "patientId" = ${patientId}::uuid
    FOR UPDATE`;
  return rows[0] ?? null;
}

export async function updateSession(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  sessionId: string,
  data: Prisma.ExerciseSessionUpdateManyMutationInput,
): Promise<void> {
  const res = await db.exerciseSession.updateMany({
    where: { id: sessionId, organizationId: ctx.orgId, patientId },
    data,
  });
  if (res.count !== 1) throw new Error("session update matched no row in scope");
}

export async function findActivity(
  db: DbClient,
  ctx: Scope,
  sessionId: string,
  activityId: string,
) {
  return db.sessionActivity.findFirst({
    where: { id: activityId, sessionId, organizationId: ctx.orgId },
    select: { id: true, status: true, assignment: { select: { position: true } } },
  });
}

export async function updateActivity(
  db: DbClient,
  ctx: Scope,
  sessionId: string,
  activityId: string,
  data: Prisma.SessionActivityUpdateManyMutationInput,
): Promise<void> {
  const res = await db.sessionActivity.updateMany({
    where: { id: activityId, sessionId, organizationId: ctx.orgId },
    data,
  });
  if (res.count !== 1) throw new Error("activity update matched no row in scope");
}

/** Activity statuses in plan order, to place the resume position on the first pending one. */
export async function activityOrder(db: DbClient, ctx: Scope, sessionId: string) {
  const rows = await db.sessionActivity.findMany({
    where: { sessionId, organizationId: ctx.orgId },
    select: { status: true, assignment: { select: { position: true } } },
  });
  return rows.sort((a, b) => a.assignment.position - b.assignment.position);
}

export async function touchPatientActivity(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  at: Date,
): Promise<void> {
  await db.patient.updateMany({
    where: { id: patientId, organizationId: ctx.orgId },
    data: { lastActivityAt: at },
  });
}

/**
 * Sessions of one organization left open longer than `idleSince` (24 hours, PRD section 9).
 * Used by the abandonment job, which runs with a system scope built from job.organizationId.
 */
export async function abandonIdleSessions(
  db: DbClient,
  ctx: Scope,
  idleSince: Date,
  now: Date,
): Promise<number> {
  const res = await db.exerciseSession.updateMany({
    where: {
      organizationId: ctx.orgId,
      status: { in: ["in_progress", "paused"] },
      updatedAt: { lt: idleSince },
    },
    data: { status: "abandoned", updatedAt: now },
  });
  return res.count;
}
