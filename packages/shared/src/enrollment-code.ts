/**
 * Demo eligibility codes (AC-A3). Server-only: import from "@carepath/shared/enrollment-code",
 * never from the package root, so the web bundle never pulls in node:crypto.
 *
 * Codes are pasteable (WCAG 3.3.8): surrounding spaces, inner spaces and letter case are
 * ignored. Only the SHA-256 hex digest of the normalised code is stored
 * (EnrollmentCode.codeHash); the seed and the API both hash through this file.
 */
import { createHash } from "node:crypto";

export function normalizeEnrollmentCode(code: string): string {
  return code.normalize("NFKC").replace(/\s+/g, "").toUpperCase();
}

export function hashEnrollmentCode(code: string): string {
  return createHash("sha256").update(normalizeEnrollmentCode(code)).digest("hex");
}

/** Non-secret label for staff lists: the last four characters of the normalised code. */
export function enrollmentCodeLabel(code: string): string {
  return normalizeEnrollmentCode(code).slice(-4);
}
