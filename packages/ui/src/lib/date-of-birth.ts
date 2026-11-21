/**
 * Date of birth rules (CD-102). Three parts, validated on blur of the group and on submit: complete,
 * a real date, not in the future, year from 1900. Error priority: incomplete, then impossible, then out
 * of range. Entered parts are never cleared by validation.
 */

export interface DateParts {
  day: string;
  /** "1" to "12", or "" when no month is chosen. */
  month: string;
  year: string;
}

export type DatePart = "day" | "month" | "year";

export interface DateCheck {
  /** `YYYY-MM-DD` when the date is valid. */
  value: string | null;
  error: string | null;
  /** The parts the error is about, for the red border and the summary link (first one). */
  parts: DatePart[];
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const EARLIEST_BIRTH_YEAR = 1900;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Splits a stored `YYYY-MM-DD` into parts for the three inputs (empty parts for null). */
export function partsFromIso(iso: string | null | undefined): DateParts {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return { day: "", month: "", year: "" };
  return { day: String(Number(m[3])), month: String(Number(m[2])), year: m[1]! };
}

/** `today` is a local calendar date `YYYY-MM-DD` (pass the clinic-zone date). */
export function checkDateOfBirth(
  parts: DateParts,
  today: string,
  label = "Date of birth",
): DateCheck {
  const day = parts.day.trim();
  const month = parts.month.trim();
  const year = parts.year.trim();
  const missing: DatePart[] = [];
  if (!day) missing.push("day");
  if (!month) missing.push("month");
  if (!year) missing.push("year");
  if (missing.length === 3) {
    return { value: null, error: `Enter your ${label.toLowerCase()}`, parts: ["day"] };
  }
  if (missing.length) {
    const words = missing.map((p) =>
      p === "day" ? "a day" : p === "month" ? "a month" : "a year",
    );
    const list = words.length === 2 ? `${words[0]} and ${words[1]}` : words[0];
    return { value: null, error: `${label} must include ${list}`, parts: missing };
  }
  if (!/^\d{1,2}$/.test(day)) {
    return { value: null, error: `Enter the day as a number, for example 18`, parts: ["day"] };
  }
  if (!/^\d{4}$/.test(year)) {
    return { value: null, error: `Enter the year as 4 numbers, for example 1962`, parts: ["year"] };
  }
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const real = new Date(Date.UTC(y, m - 1, d));
  if (
    !(m >= 1 && m <= 12) ||
    real.getUTCFullYear() !== y ||
    real.getUTCMonth() !== m - 1 ||
    real.getUTCDate() !== d
  ) {
    return { value: null, error: `${label} must be a real date`, parts: ["day", "month", "year"] };
  }
  const iso = `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
  if (iso > today) {
    return { value: null, error: `${label} must be in the past`, parts: ["day", "month", "year"] };
  }
  if (y < EARLIEST_BIRTH_YEAR) {
    return {
      value: null,
      error: `${label} must be after ${EARLIEST_BIRTH_YEAR}`,
      parts: ["year"],
    };
  }
  return { value: iso, error: null, parts: [] };
}

/** Read-back for the review page: "18 October 1962". */
export function formatDateOfBirth(iso: string): string {
  const p = partsFromIso(iso);
  if (!p.year) return iso;
  return `${p.day} ${MONTH_NAMES[Number(p.month) - 1]} ${p.year}`;
}
