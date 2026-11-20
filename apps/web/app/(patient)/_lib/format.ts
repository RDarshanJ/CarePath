import type { Dose } from "@carepath/shared/contracts";

/** Weekday names for plan schedules: 0 is Sunday (contracts/care-plan.ts). */
export const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Monday first, the order patients expect in a week. */
export const weekdayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A calendar day from the API (`YYYY-MM-DD`, already in the clinic's time zone) written out. No clock is read. */
export function formatLocalDate(
  date: string,
  style: "long" | "short" | "weekday" | "full" = "long",
): string {
  const d = new Date(`${date}T12:00:00Z`);
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", month: "long", day: "numeric" }
      : style === "short"
        ? { month: "short", day: "numeric" }
        : style === "full"
          ? { month: "long", day: "numeric", year: "numeric" }
          : { weekday: "long" };
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(d);
}

/** An instant shown as a date in the clinic's time zone. */
export function formatInstantDate(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(instant));
}

export function formatInstantDateTime(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(instant));
}

export function weekdayOfLocalDate(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function secondsText(total: number): string {
  if (total < 60) return plural(total, "second");
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? plural(m, "minute") : `${plural(m, "minute")} ${plural(s, "second")}`;
}

/** "00:45" style for a running timer. */
export function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** What the care team prescribed, in words. */
export function doseText(dose: Dose): string {
  const parts: string[] = [];
  if (dose.sets && dose.reps)
    parts.push(
      `${dose.sets} ${dose.sets === 1 ? "set" : "sets"} of ${plural(dose.reps, "repetition")}`,
    );
  else if (dose.reps) parts.push(plural(dose.reps, "repetition"));
  else if (dose.sets && (dose.holdSeconds || dose.durationSeconds))
    parts.push(plural(dose.sets, "set"));
  if (dose.holdSeconds) parts.push(`hold ${secondsText(dose.holdSeconds)}`);
  if (dose.durationSeconds) parts.push(`${secondsText(dose.durationSeconds)} each`);
  return parts.join(", ");
}

export function restText(dose: Dose): string {
  return dose.restSeconds > 0
    ? `Rest ${secondsText(dose.restSeconds)} between sets`
    : "No rest timer";
}

export function daysText(days: number[]): string {
  if (days.length === 7) return "Every day";
  return weekdayOrder
    .filter((d) => days.includes(d))
    .map((d) => weekdayNames[d]!.slice(0, 3))
    .join(", ");
}

/** "Lower back" from the stored lower-case body area. */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export { plural };
