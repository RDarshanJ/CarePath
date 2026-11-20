import { defaultReviewRuleParams } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { findRuleByKey, insertRuleTask } from "./repo.js";
import { explain, paramsFor, ruleUnits } from "./rules.js";

const H = 3_600_000;

/**
 * The reported-pain rule, evaluated inside the check-in transaction (C1 section 5.4). Pain at or
 * above the clinic threshold creates at most one task for the check-in (AC-D1, AC-D2); one below
 * creates none (AC-D3). The threshold is read on every call, so an admin change applies to the
 * next check-in (AC-D4). A disabled rule creates no task, but the patient still sees the contact
 * notice at the threshold: the notice is safety copy, not a review task.
 */
export async function evaluatePainRule(
  tx: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  input: { patientId: string; checkInId: string; painScore: number; now: Date },
): Promise<{ threshold: number; atOrAbove: boolean; taskId: string | null }> {
  const rule = await findRuleByKey(tx, ctx, "reported_pain");
  const threshold = rule
    ? paramsFor("reported_pain", rule.params).threshold
    : defaultReviewRuleParams.reported_pain.threshold;
  const atOrAbove = input.painScore >= threshold;
  if (!rule || !rule.enabled || !atOrAbove) return { threshold, atOrAbove, taskId: null };
  const taskId = await insertRuleTask(tx, ctx, {
    ruleId: rule.id,
    patientId: input.patientId,
    dedupeKey: `checkin:${input.checkInId}`,
    explanation: explain("reported_pain", input.painScore, threshold),
    evidence: [
      {
        type: "PatientCheckIn",
        id: input.checkInId,
        field: "painScore",
        value: input.painScore,
        threshold,
        unit: ruleUnits.reported_pain,
      },
    ],
    priority: rule.priority,
    dueAt: new Date(input.now.getTime() + 24 * H),
    now: input.now,
  });
  return { threshold, atOrAbove, taskId };
}
