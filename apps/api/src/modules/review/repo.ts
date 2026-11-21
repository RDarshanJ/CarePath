import type { Prisma } from "@carepath/db/client";
import { initialStatus } from "@carepath/db";
import type { ReviewRuleKey } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import type { EvidenceItem } from "./rules.js";

/**
 * Review rules and tasks. Every query filters on the organization; patient-level actions also
 * on the patient the route put in scope. Job handlers pass a system scope built from
 * job.organizationId (C1 WP 2.4 defect 7).
 */
type Scope = Pick<RequestCtx, "orgId">;

export async function findRuleByKey(db: DbClient, ctx: Scope, key: ReviewRuleKey) {
  return db.reviewRule.findFirst({
    where: { organizationId: ctx.orgId, key },
    select: { id: true, key: true, enabled: true, priority: true, params: true },
  });
}

export interface NewTask {
  ruleId: string;
  patientId: string;
  dedupeKey: string;
  explanation: string;
  evidence: EvidenceItem[];
  priority: number;
  dueAt: Date | null;
  now: Date;
}

/**
 * Inserts a task unless one already exists for the same rule, patient and source, whatever its
 * status (a resolved pain task is not raised again for the same check-in). The partial unique
 * index on open tasks backs this under concurrency: ON CONFLICT DO NOTHING (AC-D2).
 * Returns the new id, or null when nothing was inserted.
 */
export async function insertRuleTask(db: DbClient, ctx: Scope, t: NewTask): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO "ReviewTask" ("organizationId", "patientId", "ruleId", "dedupeKey", explanation,
      evidence, priority, status, "dueAt", "createdAt", "updatedAt")
    SELECT ${ctx.orgId}::uuid, ${t.patientId}::uuid, ${t.ruleId}::uuid, ${t.dedupeKey},
      ${t.explanation}, ${JSON.stringify(t.evidence)}::jsonb, ${t.priority}::int,
      ${initialStatus.ReviewTask}::"ReviewTaskStatus", ${t.dueAt}::timestamptz,
      ${t.now}::timestamptz, ${t.now}::timestamptz
    WHERE NOT EXISTS (
      SELECT 1 FROM "ReviewTask"
      WHERE "organizationId" = ${ctx.orgId}::uuid AND "ruleId" = ${t.ruleId}::uuid
        AND "patientId" = ${t.patientId}::uuid AND "dedupeKey" = ${t.dedupeKey})
    ON CONFLICT ("ruleId", "patientId", "dedupeKey") WHERE status IN ('open', 'in_review')
    DO NOTHING
    RETURNING id`;
  return rows[0]?.id ?? null;
}

export type TaskJson = Prisma.JsonValue;

const eventOrder: Prisma.ReviewTaskEventOrderByWithRelationInput[] = [
  { occurredAt: "asc" },
  { seq: "asc" },
];

export const taskSelect = {
  id: true,
  status: true,
  patientId: true,
  explanation: true,
  evidence: true,
  priority: true,
  createdAt: true,
  dueAt: true,
  resolvedAt: true,
  resolutionNote: true,
  patient: { select: { id: true, givenName: true, familyName: true, mrn: true } },
  rule: { select: { id: true, key: true, name: true } },
  assignedTo: {
    select: { id: true, userId: true, givenName: true, familyName: true, credentials: true },
  },
  resolvedBy: {
    select: {
      user: { select: { id: true, displayName: true, practitioner: { select: { id: true } } } },
    },
  },
  // CR-11: the task's history, oldest first.
  events: {
    orderBy: eventOrder,
    select: {
      id: true,
      kind: true,
      occurredAt: true,
      note: true,
      actor: {
        select: {
          user: {
            select: { id: true, displayName: true, practitioner: { select: { id: true } } },
          },
        },
      },
      practitioner: {
        select: { id: true, userId: true, givenName: true, familyName: true, credentials: true },
      },
    },
  },
} as const;

export type TaskRow = Prisma.ReviewTaskGetPayload<{ select: typeof taskSelect }>;

export const activeTaskStatuses = ["open", "in_review"] as const;

const statusFilter: Record<string, readonly ("open" | "in_review" | "resolved" | "dismissed")[]> = {
  active: activeTaskStatuses,
  open: ["open"],
  in_review: ["in_review"],
  resolved: ["resolved"],
  dismissed: ["dismissed"],
  closed: ["resolved", "dismissed"],
};

export interface TaskListFilter {
  status: keyof typeof statusFilter;
  /** null: unassigned only; undefined: any. */
  assignedPractitionerId?: string | null;
  ruleKey?: string;
  patientIds?: string[];
}

function taskWhere(ctx: Scope, filter: TaskListFilter): Prisma.ReviewTaskWhereInput {
  return {
    organizationId: ctx.orgId,
    status: { in: [...(statusFilter[filter.status] ?? activeTaskStatuses)] },
    ...(filter.assignedPractitionerId !== undefined
      ? { assignedPractitionerId: filter.assignedPractitionerId }
      : {}),
    ...(filter.ruleKey ? { rule: { key: filter.ruleKey } } : {}),
    ...(filter.patientIds ? { patientId: { in: filter.patientIds } } : {}),
  };
}

/**
 * CR-10: tasks per rule for the queue's scope. The rule filter is left out on purpose, so every
 * rule keeps its count while one is selected. Every rule of the organization appears, with zero
 * when it has no task in scope; highest rule priority first.
 */
export async function ruleTotals(
  db: DbClient,
  ctx: Scope,
  filter: Omit<TaskListFilter, "ruleKey">,
) {
  return countRuleTotals(db, ctx, taskWhere(ctx, { ...filter }));
}

/** CR-10 for one patient's task list (every status). */
export async function patientRuleTotals(db: DbClient, ctx: Scope, patientId: string) {
  return countRuleTotals(db, ctx, { organizationId: ctx.orgId, patientId });
}

async function countRuleTotals(db: DbClient, ctx: Scope, where: Prisma.ReviewTaskWhereInput) {
  const [rules, groups] = await Promise.all([
    db.reviewRule.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: [{ priority: "desc" }, { key: "asc" }],
      select: { id: true, key: true, name: true },
    }),
    db.reviewTask.groupBy({ by: ["ruleId"], where, _count: { _all: true } }),
  ]);
  const counts = new Map(groups.map((g) => [g.ruleId, g._count._all]));
  return rules.map((r) => ({ ...r, total: counts.get(r.id) ?? 0 }));
}

/** Highest priority first, then oldest. */
export async function listTasks(
  db: DbClient,
  ctx: Scope,
  filter: TaskListFilter,
  offset: number,
  take: number,
): Promise<TaskRow[]> {
  return db.reviewTask.findMany({
    where: taskWhere(ctx, filter),
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    skip: offset,
    take,
    select: taskSelect,
  });
}

/** Count for listTasks: same WHERE and scope, cursor ignored (CR-3). */
export async function countTasks(
  db: DbClient,
  ctx: Scope,
  filter: TaskListFilter,
): Promise<number> {
  return db.reviewTask.count({ where: taskWhere(ctx, filter) });
}

/** Count for listPatientTasks: same WHERE and scope, cursor ignored (CR-3). */
export async function countPatientTasks(
  db: DbClient,
  ctx: Scope,
  patientId: string,
): Promise<number> {
  return db.reviewTask.count({ where: { organizationId: ctx.orgId, patientId } });
}

/** Every task of one patient, newest first. */
export async function listPatientTasks(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  offset: number,
  take: number,
): Promise<TaskRow[]> {
  return db.reviewTask.findMany({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: offset,
    take,
    select: taskSelect,
  });
}

export async function findTask(db: DbClient, ctx: Scope, patientId: string, taskId: string) {
  return db.reviewTask.findFirst({
    where: { id: taskId, organizationId: ctx.orgId, patientId },
    select: taskSelect,
  });
}

/** Completion time of the last successful time-rule run for the organization. */
export async function rulesLastRunAt(
  db: DbClient,
  ctx: Scope,
  queue: string,
): Promise<Date | null> {
  const row = await db.job.findFirst({
    where: { organizationId: ctx.orgId, queue, status: "succeeded" },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });
  return row?.completedAt ?? null;
}

// ---- task actions and rules (delivery step 5) -------------------------------------------------

/** Locks the task row for an action and returns what the action needs to decide. */
export async function lockTask(db: DbClient, ctx: Scope, patientId: string, taskId: string) {
  const rows = await db.$queryRaw<{ assignedPractitionerId: string | null; status: string }[]>`
    SELECT "assignedPractitionerId", status::text AS status FROM "ReviewTask"
    WHERE id = ${taskId}::uuid AND "organizationId" = ${ctx.orgId}::uuid
      AND "patientId" = ${patientId}::uuid
    FOR UPDATE`;
  return rows[0] ?? null;
}

export type TaskEventKind = "assigned" | "unassigned" | "reviewed" | "resolved" | "dismissed";

/** Appends to the task's history (CR-11). Call it in the transaction of the change it records. */
export async function insertTaskEvent(
  db: DbClient,
  ctx: Scope,
  e: {
    taskId: string;
    kind: TaskEventKind;
    actorUserId: string;
    practitionerId?: string | null;
    note?: string | null;
    at: Date;
  },
): Promise<void> {
  await db.reviewTaskEvent.create({
    data: {
      organizationId: ctx.orgId,
      taskId: e.taskId,
      kind: e.kind,
      actorUserId: e.actorUserId,
      practitionerId: e.practitionerId ?? null,
      note: e.note ?? null,
      occurredAt: e.at,
    },
  });
}

/** Open and in-review tasks of the patient that read this check-in (evidence source). */
export async function activeTaskIdsForCheckIn(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  checkInId: string,
): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ReviewTask"
    WHERE "organizationId" = ${ctx.orgId}::uuid AND "patientId" = ${patientId}::uuid
      AND status IN ('open', 'in_review')
      AND evidence @> jsonb_build_array(
        jsonb_build_object('type', 'PatientCheckIn', 'id', ${checkInId}::text))
    ORDER BY "createdAt", id`;
  return rows.map((r) => r.id);
}

export async function setTaskAssignee(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  taskId: string,
  practitionerId: string | null,
  at: Date,
): Promise<boolean> {
  const res = await db.reviewTask.updateMany({
    where: {
      id: taskId,
      organizationId: ctx.orgId,
      patientId,
      status: { in: [...activeTaskStatuses] },
    },
    data: {
      assignedPractitionerId: practitionerId,
      status: practitionerId ? "in_review" : "open",
      updatedAt: at,
    },
  });
  return res.count === 1;
}

/** Closes an open or in-review task with a note. Returns false when it was already closed. */
export async function closeTask(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  taskId: string,
  input: { status: "resolved" | "dismissed"; userId: string; note: string; at: Date },
): Promise<boolean> {
  const res = await db.reviewTask.updateMany({
    where: {
      id: taskId,
      organizationId: ctx.orgId,
      patientId,
      status: { in: [...activeTaskStatuses] },
    },
    data: {
      status: input.status,
      resolvedAt: input.at,
      resolvedByUserId: input.userId,
      resolutionNote: input.note,
      updatedAt: input.at,
    },
  });
  return res.count === 1;
}

export async function activePractitioner(db: DbClient, ctx: Scope, practitionerId: string) {
  return db.practitioner.findFirst({
    where: { id: practitionerId, organizationId: ctx.orgId, active: true },
    select: { id: true },
  });
}

const ruleSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  enabled: true,
  priority: true,
  params: true,
  updatedAt: true,
} as const;

export async function listRules(db: DbClient, ctx: Scope) {
  return db.reviewRule.findMany({
    where: { organizationId: ctx.orgId },
    orderBy: [{ priority: "desc" }, { key: "asc" }],
    select: ruleSelect,
  });
}

export async function findRule(db: DbClient, ctx: Scope, ruleId: string) {
  return db.reviewRule.findFirst({
    where: { id: ruleId, organizationId: ctx.orgId },
    select: ruleSelect,
  });
}

export async function updateRule(
  db: DbClient,
  ctx: Scope,
  ruleId: string,
  data: { enabled: boolean; params: Prisma.InputJsonValue; at: Date },
): Promise<void> {
  const res = await db.reviewRule.updateMany({
    where: { id: ruleId, organizationId: ctx.orgId },
    data: { enabled: data.enabled, params: data.params, updatedAt: data.at },
  });
  if (res.count !== 1) throw new Error("rule update matched no row in scope");
}

// ---- time-based rule inputs (job handlers, scoped by job.organizationId) ----------------------

/** Unreviewed check-ins of patients with an active care team, submitted before `before`. */
export async function staleUnreviewedCheckIns(db: DbClient, ctx: Scope, before: Date) {
  return db.patientCheckIn.findMany({
    where: {
      organizationId: ctx.orgId,
      reviewedAt: null,
      submittedAt: { lte: before },
      patient: { careTeam: { status: "active" } },
    },
    select: { id: true, patientId: true, submittedAt: true },
  });
}

export async function upcomingFollowUps(db: DbClient, ctx: Scope, from: Date, to: Date) {
  return db.appointment.findMany({
    where: {
      organizationId: ctx.orgId,
      type: { in: ["follow_up", "video_follow_up"] },
      status: "booked",
      startsAt: { gt: from, lte: to },
    },
    select: { id: true, patientId: true, startsAt: true },
  });
}

export async function staleIntakes(db: DbClient, ctx: Scope, createdBefore: Date) {
  return db.intakeAssessment.findMany({
    where: {
      organizationId: ctx.orgId,
      status: "in_progress",
      patient: { status: "intake_incomplete", createdAt: { lte: createdBefore } },
    },
    select: {
      id: true,
      patientId: true,
      answers: true,
      patient: { select: { createdAt: true } },
    },
  });
}

/** Active patients with an active plan, and their current version id. */
export async function activePlanPatients(db: DbClient, ctx: Scope) {
  return db.carePlan.findMany({
    where: {
      organizationId: ctx.orgId,
      status: "active",
      currentVersionId: { not: null },
      patient: { status: "active" },
    },
    select: { patientId: true, currentVersionId: true },
  });
}

export async function hasActiveTask(db: DbClient, ctx: Scope, ruleId: string, patientId: string) {
  const row = await db.reviewTask.findFirst({
    where: {
      organizationId: ctx.orgId,
      ruleId,
      patientId,
      status: { in: [...activeTaskStatuses] },
    },
    select: { id: true },
  });
  return row !== null;
}

export async function activeConsentPatients(db: DbClient, ctx: Scope, patientIds: string[]) {
  const rows = await db.consent.findMany({
    where: {
      organizationId: ctx.orgId,
      patientId: { in: patientIds },
      type: "treatment_and_data_use",
      status: "active",
    },
    select: { patientId: true },
  });
  return new Set(rows.map((r) => r.patientId));
}
