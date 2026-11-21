import { formatBornText, formatCalendarDay, plural } from "@carepath/shared";
import type { PatientHeader } from "@carepath/shared/contracts";

/*
 * Identity wording (CD-201, CD-202). Pure functions: the banner and list rows render these strings and
 * the tests read them. Age is computed from `birthDate` and the clinic-zone day the caller passes as
 * `today` (never the browser clock), and is never stored.
 */

/** The word for a value the product does not hold (CD-202, CD-217). Never a dash or a question mark. */
export const NOT_RECORDED = "Not recorded";

function parts(day: string): [number, number, number] {
  const [y = 0, m = 0, d = 0] = day.split("-").map(Number);
  return [y, m, d];
}

/** Whole months from `birthDate` to `today` (both `YYYY-MM-DD`). */
export function ageInMonths(birthDate: string, today: string): number {
  const [by, bm, bd] = parts(birthDate);
  const [ty, tm, td] = parts(today);
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  return Math.max(0, months);
}

/** Whole years from `birthDate` to `today`; a birthday counts on the day itself. */
export function ageInYears(birthDate: string, today: string): number {
  return Math.floor(ageInMonths(birthDate, today) / 12);
}

/** "37 years"; under two years the age is in months ("18 months"), as CD-201 asks. */
export function ageText(birthDate: string, today: string): string {
  const months = ageInMonths(birthDate, today);
  if (months < 24) return plural(months, "month");
  return plural(Math.floor(months / 12), "year");
}

/** "Born Mar 3, 1989 (37 years)" (CD-201, month as a word in the shared date style). */
export function bornWithAgeText(birthDate: string, today: string): string {
  return `${formatBornText(birthDate)} (${ageText(birthDate, today)})`;
}

/** The spoken form: month spelled out and "age 37" ("born March 3, 1989, age 37 years"). */
export function bornSpokenText(birthDate: string, today: string): string {
  return `born ${formatCalendarDay(birthDate, "full")}, age ${ageText(birthDate, today)}`;
}

/** Gender for Zone 2 only; `unknown` reads "Not recorded" (CD-202). */
export const genderLabels: Record<PatientHeader["gender"], string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  unknown: NOT_RECORDED,
};

/** Given name first, as stored, no case change (CD-202). */
export function patientName(p: { givenName: string; familyName: string }): string {
  return `${p.givenName} ${p.familyName}`.trim();
}

/** Zone 2 value, or "Not recorded" when blank. */
export function orNotRecorded(value: string | null | undefined): string {
  return value && value.trim() ? value : NOT_RECORDED;
}

/** Preferred language as stored ("en", "es-MX") in words where the runtime knows the code. */
export function languageText(code: string): string {
  if (!code.trim()) return NOT_RECORDED;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}
