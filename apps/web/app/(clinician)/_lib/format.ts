/**
 * Date and number formatting for the clinician workspace. The formatters live in
 * `@carepath/shared` (microcopy guidelines section 5): instants come from the API as UTC strings
 * and are shown in the organization's time zone, calendar days arrive as `YYYY-MM-DD`. This file
 * keeps the names the clinician screens already import.
 */
import { formatCalendarDay, weekdayShort } from "@carepath/shared";

export {
  addDays,
  doseText,
  formatAgeHours,
  formatDate,
  formatDateTime,
  formatDayShort,
  formatTime,
  isLocalDate,
  localDayOf,
  plural,
  scheduleText,
  tzAbbreviation,
} from "@carepath/shared";

/** "Nov 12" from `2026-11-12`, or "Nov 12, 2026" with the year. */
export function formatLocalDate(day: string, withYear = false): string {
  return formatCalendarDay(day, withYear ? "withYear" : "short");
}

/** "Thursday, Nov 19, 2026" from `2026-11-19`. */
export function formatLongDay(day: string): string {
  return formatCalendarDay(day, "longYear");
}

export function fullName(p: { givenName: string; familyName: string }): string {
  return `${p.givenName} ${p.familyName}`;
}

export const weekdayLabels = weekdayShort;
