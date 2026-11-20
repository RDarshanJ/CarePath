import { plural } from "./number.js";
import { secondsText } from "./duration.js";
import { weekdayOfDay } from "./datetime.js";

/** Structural, so the clinician draft (nullable fields) and the patient plan share one formatter. */
export interface DoseLike {
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  durationSeconds: number | null;
  restSeconds: number;
}

/**
 * What the care team prescribed, in words (CD-301): "3 sets of 10 repetitions, hold 5 seconds".
 * Units are spelled out. Rest is part of the clinician summary line; the patient sees it as its
 * own sentence (`restText`), so `rest: false` leaves it out there.
 */
export function doseText(d: DoseLike, options: { rest?: boolean } = {}): string {
  const parts: string[] = [];
  if (d.sets && d.reps) parts.push(`${plural(d.sets, "set")} of ${plural(d.reps, "repetition")}`);
  else if (d.reps) parts.push(plural(d.reps, "repetition"));
  else if (d.sets) parts.push(plural(d.sets, "set"));
  if (d.holdSeconds) parts.push(`hold ${secondsText(d.holdSeconds)}`);
  if (d.durationSeconds) parts.push(`${secondsText(d.durationSeconds)} each`);
  if (options.rest !== false && d.restSeconds > 0) parts.push(`rest ${secondsText(d.restSeconds)}`);
  return parts.join(", ");
}

/** "Rest 30 seconds between sets", or "No rest timer". */
export function restText(d: Pick<DoseLike, "restSeconds">): string {
  return d.restSeconds > 0 ? `Rest ${secondsText(d.restSeconds)} between sets` : "No rest timer";
}

/** Raw field keys never reach the UI (plan diff): the words a person would use. */
export const doseFieldLabels = {
  sets: "sets",
  reps: "repetitions",
  holdSeconds: "hold time",
  durationSeconds: "duration",
  restSeconds: "rest time",
} as const satisfies Record<keyof DoseLike, string>;

export const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
export const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Monday first, the order patients expect in a week. */
export const weekdayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

/** "Mon, Wed, Fri", or "Every day". Monday first. */
export function daysText(days: number[]): string {
  if (days.length === 7) return "Every day";
  return weekdayOrder
    .filter((d) => days.includes(d))
    .map((d) => weekdayShort[d])
    .join(", ");
}

/** Staff schedule text: "Mon, Wed, Fri, once a day". */
export function scheduleText(daysOfWeek: number[], timesPerDay: number): string {
  const days = [...daysOfWeek].sort((a, b) => a - b);
  const per = timesPerDay === 1 ? "once a day" : `${timesPerDay} times a day`;
  return `${days.length === 7 ? "Every day" : days.map((d) => weekdayShort[d] ?? "").join(", ")}, ${per}`;
}

export { weekdayOfDay };
