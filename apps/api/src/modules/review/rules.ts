import {
  defaultReviewRuleParams,
  reviewRuleParamsSchemas,
  type ReviewRuleKey,
  type ReviewRuleParams,
} from "@carepath/shared/contracts";

/**
 * Rule explanations (PRD section 10). Every task stores the sentence plus a structured first
 * evidence item with the value, threshold and unit, so the queue can show why it appeared
 * without parsing text (REQ-RVQ-02).
 */
export interface EvidenceItem {
  type: "PatientCheckIn" | "CarePlanVersion" | "Appointment" | "IntakeAssessment";
  id: string;
  field: string;
  value?: number;
  threshold?: number;
  unit?: string;
}

export const ruleUnits: Record<ReviewRuleKey, string> = {
  reported_pain: "of 10",
  missed_sessions: "sessions",
  unreviewed_checkin: "hours",
  upcoming_followup: "hours",
  missing_intake: "days",
};

export function explain(key: ReviewRuleKey, value: number, threshold: number, extra = ""): string {
  switch (key) {
    case "reported_pain":
      return `Reported pain ${value} of 10. Clinic rule: ${threshold} or higher.`;
    case "missed_sessions":
      return `Missed ${value} sessions in 7 days. Clinic rule: ${threshold} or more.`;
    case "unreviewed_checkin":
      return `Not reviewed for ${value} hours. Clinic rule: ${threshold}.`;
    case "upcoming_followup":
      return `Follow-up in ${value} hours. Clinic rule: within ${threshold}.`;
    case "missing_intake":
      return `Intake incomplete for ${value} days. Missing: ${extra}.`;
  }
}

/** Stored params, falling back to the demo defaults when a stored value does not parse. */
export function paramsFor<K extends ReviewRuleKey>(key: K, stored: unknown): ReviewRuleParams[K] {
  const parsed = reviewRuleParamsSchemas[key].safeParse(stored);
  return (parsed.success ? parsed.data : defaultReviewRuleParams[key]) as ReviewRuleParams[K];
}

export function isReviewRuleKey(key: string): key is ReviewRuleKey {
  return Object.hasOwn(defaultReviewRuleParams, key);
}
