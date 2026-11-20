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
