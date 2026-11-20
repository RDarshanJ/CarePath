import { intakeAnswerSchemas, intakeSteps, type IntakeStep } from "@carepath/shared/contracts";

/**
 * Which intake steps are complete. A step is complete when its stored answers parse against
 * the step's contract; `consent` also needs the required consent to be active. `review` is
 * never "missing": submitting is the review.
 */
export function stepComplete(
  step: IntakeStep,
  answers: Record<string, unknown>,
  requiredConsentActive: boolean,
): boolean {
  if (step === "consent" && !requiredConsentActive) return false;
  return intakeAnswerSchemas[step].safeParse(answers[step]).success;
}

export function missingSteps(
  answers: Record<string, unknown>,
  requiredConsentActive: boolean,
): IntakeStep[] {
  return intakeSteps.filter(
    (s) => s !== "review" && !stepComplete(s, answers, requiredConsentActive),
  );
}

export function asAnswers(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}
