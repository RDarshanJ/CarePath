import {
  clinicalReviewRuleKeys,
  type ReviewRuleKey,
  type ReviewTask,
  type ReviewTaskSource,
} from "@carepath/shared/contracts";
import { practitionerRef, userRef } from "../../core/people.js";
import type { TaskRow } from "./repo.js";
import type { EvidenceItem } from "./rules.js";

const H = 3_600_000;

function apiPath(patientId: string, e: EvidenceItem): string | null {
  switch (e.type) {
    case "PatientCheckIn":
      return `/patients/${patientId}/check-ins/${e.id}`;
    case "CarePlanVersion":
      return `/patients/${patientId}/care-plan/versions/${e.id}`;
    case "IntakeAssessment":
      return `/patients/${patientId}/intake`;
    case "Appointment":
      // Appointment routes arrive in Phase 4.
      return null;
  }
}

function evidenceOf(row: TaskRow): EvidenceItem[] {
  return Array.isArray(row.evidence) ? (row.evidence as unknown as EvidenceItem[]) : [];
}

export function ruleKind(key: string): "clinical" | "administrative" {
  return clinicalReviewRuleKeys.includes(key as ReviewRuleKey) ? "clinical" : "administrative";
}

/** A task with why it appeared: rule, value, threshold, explanation and source links. */
export function toReviewTask(row: TaskRow, now: Date): ReviewTask {
  const evidence = evidenceOf(row);
  const measured = evidence.find((e) => typeof e.value === "number");
  const sources: ReviewTaskSource[] = evidence.map((e) => ({
    type: e.type,
    id: e.id,
    field: e.field,
    apiPath: apiPath(row.patientId, e),
  }));
  return {
    id: row.id,
    status: row.status,
    patient: row.patient,
    rule: { id: row.rule.id, key: row.rule.key as ReviewRuleKey, name: row.rule.name },
    kind: ruleKind(row.rule.key),
    explanation: row.explanation,
    value: measured?.value ?? null,
    threshold: measured?.threshold ?? null,
    unit: measured?.unit ?? null,
    sources,
    priority: row.priority,
    assignedTo: row.assignedTo ? practitionerRef(row.assignedTo) : null,
    createdAt: row.createdAt.toISOString(),
    dueAt: row.dueAt?.toISOString() ?? null,
    ageHours: Math.max(0, Math.floor((now.getTime() - row.createdAt.getTime()) / H)),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedBy: userRef(row.resolvedBy?.user ?? null),
    resolutionNote: row.resolutionNote,
  };
}
