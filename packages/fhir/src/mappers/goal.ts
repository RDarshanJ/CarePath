import type { Goal, GoalTarget } from "@medplum/fhirtypes";
import { identifierSystem } from "../config.js";
import { goalStatusFromFhir, goalStatusToFhir } from "../codes.js";
import type { GoalRecord } from "../types.js";
import {
  dateOnly,
  mapIssue,
  ref,
  type FromFhirContext,
  type MapResult,
  type ToFhirContext,
} from "./common.js";

/**
 * Goal (US Core mandatory: lifecycleStatus, description, subject; start date or target due date
 * Must Support). The link to a care plan travels as CarePlan.goal. Goal.addresses (Condition)
 * belongs to batch 2 and is not written, so it can never dangle. achievementStatus is exported as
 * text only: the goal-achievement code system was not verified (research HD section 4, row 7).
 */
export function goalToFhir(g: GoalRecord, ctx: ToFhirContext): Goal {
  const target: GoalTarget = {
    ...(g.measureCode
      ? {
          measure: {
            coding: [
              { ...(g.measureSystem ? { system: g.measureSystem } : {}), code: g.measureCode },
            ],
          },
        }
      : {}),
    ...(g.targetValue !== null
      ? {
          detailQuantity: { value: g.targetValue, ...(g.targetUnit ? { unit: g.targetUnit } : {}) },
        }
      : {}),
    ...(g.dueDate ? { dueDate: g.dueDate } : {}),
  };
  return {
    resourceType: "Goal",
    id: g.id,
    identifier: [{ system: identifierSystem(ctx.orgSlug, "goal"), value: g.id }],
    lifecycleStatus: goalStatusToFhir(g.lifecycleStatus) as Goal["lifecycleStatus"],
    ...(g.achievementStatus ? { achievementStatus: { text: g.achievementStatus } } : {}),
    description: { text: g.description },
    subject: ref("Patient", g.patientId),
    ...(g.startDate ? { startDate: g.startDate } : {}),
    ...(Object.keys(target).length ? { target: [target] } : {}),
  };
}

export function goalFromFhir(r: Goal, ctx: FromFhirContext): MapResult<GoalRecord> {
  const issues = [];
  const status = goalStatusFromFhir(r.lifecycleStatus);
  const subject = ctx.resolve(r.subject, "subject");
  const description = r.description?.text ?? r.description?.coding?.[0]?.display ?? null;
  if (!status)
    issues.push(
      mapIssue(
        "error",
        "code-invalid",
        "map.goal.lifecycleStatus",
        "Goal lifecycleStatus is not one CarePath stores.",
        "lifecycleStatus",
      ),
    );
  if (!description)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.goal.description",
        "Goal needs a description text or display.",
        "description",
      ),
    );
  if (!subject || subject.type !== "Patient")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.goal.subject",
        "Goal subject must be a patient.",
        "subject",
      ),
    );
  if (issues.length) return { record: null, issues };
  const t = r.target?.[0];
  const coding = t?.measure?.coding?.[0];
  return {
    record: {
      id: r.id ?? "",
      patientId: subject!.id,
      description: description!,
      lifecycleStatus: status!,
      achievementStatus:
        r.achievementStatus?.text ?? r.achievementStatus?.coding?.[0]?.code ?? null,
      measureSystem: coding?.system ?? null,
      measureCode: coding?.code ?? null,
      targetValue: t?.detailQuantity?.value ?? null,
      targetUnit: t?.detailQuantity?.unit ?? t?.detailQuantity?.code ?? null,
      startDate: dateOnly(r.startDate),
      dueDate: dateOnly(t?.dueDate),
    },
    issues: [],
  };
}
