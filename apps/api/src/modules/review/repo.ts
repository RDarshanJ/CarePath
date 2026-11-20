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

/** Highest priority first, then oldest. */
export async function listTasks(
  db: DbClient,
  ctx: Scope,
  filter: TaskListFilter,
  offset: number,
  take: number,
): Promise<TaskRow[]> {
  return db.reviewTask.findMany({
    where: {
      organizationId: ctx.orgId,
      status: { in: [...(statusFilter[filter.status] ?? activeTaskStatuses)] },
      ...(filter.assignedPractitionerId !== undefined
        ? { assignedPractitionerId: filter.assignedPractitionerId }
        : {}),
      ...(filter.ruleKey ? { rule: { key: filter.ruleKey } } : {}),
      ...(filter.patientIds ? { patientId: { in: filter.patientIds } } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    skip: offset,
    take,
    select: taskSelect,
  });
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
