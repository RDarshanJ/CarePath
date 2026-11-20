/**
 * Fixed safety copy (PRD section 16, checkpoint C1 ruling 3.7). One constant each, used by the
 * web app and by the copy tests. Not organization settings.
 */

/** Shown in the message composer, the assistant and the pain notice. */
export const EMERGENCY_NOTICE = "Not monitored for emergencies. If this is an emergency, call 911.";

/** Pain notice when the organization has no clinic phone (Organization.phone is null). */
export const CONTACT_CLINIC_FALLBACK = "contact your clinic";

/**
 * Banned diagnostic terms. Applied only to the onboarding review step (AC-A9) and the pain
 * notice (AC-D7), not as a global copy linter: "you have" appears in ordinary sentences.
 */
export const BANNED_DIAGNOSTIC_TERMS = [
  "diagnosis",
  "diagnosed",
  "you have",
  "you may have",
  "injury",
  "tear",
  "sprain",
  "condition is",
  "treatment for",
] as const;

/** Banned terms found in `text` as whole words, case-insensitive. Empty when the text is clean. */
export function findBannedDiagnosticTerms(text: string): string[] {
  return BANNED_DIAGNOSTIC_TERMS.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(text));
}

/** Exercise library, session overview and plan preview (PRD section 16). */
export const EXERCISE_CONTENT_NOTICE =
  "These exercises are fictional and have not been medically reviewed. Do not use them as treatment instructions.";

/**
 * Pain contact notice (PRD section 16, AC-D7), shown above EMERGENCY_NOTICE. With no clinic phone
 * it reads "contact your clinic" (C1 ruling 3.7).
 */
export function painNoticeMessage(painScore: number, clinicPhone: string | null): string {
  const contact = clinicPhone ? `contact your clinic at ${clinicPhone}` : CONTACT_CLINIC_FALLBACK;
  return `You reported pain of ${painScore} out of 10. If you are worried, ${contact}.`;
}
