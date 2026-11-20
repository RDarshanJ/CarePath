/**
 * Formatting for the patient app. The formatters live in `@carepath/shared` (microcopy guidelines
 * section 5); this file keeps the names the patient screens already import.
 */
import {
  doseText as sharedDoseText,
  formatCalendarDay,
  formatDate,
  formatDateTime,
  weekdayOfDay,
} from "@carepath/shared";
import type { Dose } from "@carepath/shared/contracts";

export {
  clock,
  daysText,
  listWords,
  plural,
  restText,
  secondsText,
  weekdayNames,
  weekdayOrder,
} from "@carepath/shared";

/** A calendar day from the API (`YYYY-MM-DD`, already in the clinic's time zone) written out. */
export function formatLocalDate(
  date: string,
  style: "long" | "short" | "weekday" | "full" = "long",
): string {
  return formatCalendarDay(date, style);
}

/** An instant shown as a date in the clinic's time zone. */
export const formatInstantDate = formatDate;

export const formatInstantDateTime = formatDateTime;

export const weekdayOfLocalDate = weekdayOfDay;

/** What the care team prescribed, in words. Rest is its own sentence for patients (`restText`). */
export function doseText(dose: Dose): string {
  return sharedDoseText(dose, { rest: false });
}

/** "Lower back" from the stored lower-case body area. */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
