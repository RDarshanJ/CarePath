/**
 * Date and number formatting for the clinician workspace. Instants come from the API as UTC
 * strings and are shown in the organization's time zone (route table rule 9); calendar days
 * arrive as `YYYY-MM-DD` and are never re-derived from the browser clock.
 */
const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = tz + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, ...options });
    cache.set(key, f);
  }
  return f;
}

/** "Nov 18, 9:01 AM" */
export function formatDateTime(iso: string, tz: string): string {
  return formatter(tz, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "Nov 18, 2026" */
export function formatDate(iso: string, tz: string): string {
  return formatter(tz, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

/** "9:01 AM" */
export function formatTime(iso: string, tz: string): string {
  return formatter(tz, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** The calendar day of an instant in the organization's zone, as `YYYY-MM-DD`. */
export function localDayOf(iso: string, tz: string): string {
  const parts = formatter(tz, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(iso),
  );
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "Nov 12" from `2026-11-12`. */
export function formatLocalDate(day: string, withYear = false): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return formatter("UTC", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function tzAbbreviation(iso: string, tz: string): string {
  return (
    formatter(tz, { timeZoneName: "short" })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "timeZoneName")?.value ?? tz
  );
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "19 hours" or "2 days" from a whole number of hours. */
export function formatAgeHours(hours: number): string {
  if (hours < 1) return "under an hour";
  if (hours < 48) return plural(hours, "hour");
  return plural(Math.floor(hours / 24), "day");
}

export function fullName(p: { givenName: string; familyName: string }): string {
  return `${p.givenName} ${p.familyName}`;
}

const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const weekdayLabels = weekdayShort;

export function scheduleText(daysOfWeek: number[], timesPerDay: number): string {
  const days = [...daysOfWeek].sort((a, b) => a - b);
  const names = days.map((d) => weekdayShort[d] ?? "");
  const everyDay = days.length === 7;
  const per = timesPerDay === 1 ? "once a day" : `${timesPerDay} times a day`;
  return `${everyDay ? "Every day" : names.join(", ")}, ${per}`;
}

export function doseText(d: {
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  durationSeconds: number | null;
  restSeconds: number;
}): string {
  const parts: string[] = [];
  if (d.sets && d.reps) parts.push(`${d.sets} sets of ${d.reps} repetitions`);
  else if (d.sets && d.durationSeconds)
    parts.push(`${d.sets} sets of ${d.durationSeconds} seconds`);
  else if (d.sets) parts.push(plural(d.sets, "set"));
  else if (d.reps) parts.push(`${d.reps} repetitions`);
  else if (d.durationSeconds) parts.push(`${d.durationSeconds} seconds`);
  if (d.holdSeconds) parts.push(`hold ${d.holdSeconds} seconds`);
  if (d.restSeconds) parts.push(`rest ${d.restSeconds} seconds`);
  return parts.join(", ");
}

/** `2026-11-19` plus `n` calendar days, with no zone involved. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "Thursday, Nov 19, 2026" from `2026-11-19`. */
export function formatLongDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return formatter("UTC", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Thu, Nov 19" for an instant, in the organization's zone. */
export function formatDayShort(iso: string, tz: string): string {
  return formatter(tz, { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
}

/** `YYYY-MM-DD` as typed into a date field and accepted by the API. */
export const isLocalDate = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
