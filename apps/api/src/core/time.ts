/**
 * Calendar days in an organization's time zone (route table rule 9). Instants are UTC; a "local
 * date" is a `YYYY-MM-DD` string in the named zone. Uses Intl only (no date library, C1 section 2).
 */
const D = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Offset of the zone from UTC at `at`, in milliseconds (positive east of Greenwich). */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts["year"]),
    Number(parts["month"]) - 1,
    Number(parts["day"]),
    Number(parts["hour"]),
    Number(parts["minute"]),
    Number(parts["second"]),
  );
  return asUtc - (at.getTime() - at.getMilliseconds());
}

/** The local calendar date of an instant. */
export function localDate(at: Date, timeZone: string): string {
  return new Date(at.getTime() + zoneOffsetMs(at, timeZone)).toISOString().slice(0, 10);
}

/** The instant a local date starts (local midnight), DST-aware. */
export function startOfLocalDay(date: string, timeZone: string): Date {
  const guess = Date.parse(`${date}T00:00:00Z`);
  let at = guess - zoneOffsetMs(new Date(guess), timeZone);
  // A second pass settles days where the offset changes between the guess and the answer.
  at = guess - zoneOffsetMs(new Date(at), timeZone);
  return new Date(at);
}

/** The instant a local wall-clock time (`HH:MM`) on a local date occurs in the zone, DST-aware. */
export function localInstant(date: string, time: string, timeZone: string): Date {
  const guess = Date.parse(`${date}T${time}:00Z`);
  let at = guess - zoneOffsetMs(new Date(guess), timeZone);
  at = guess - zoneOffsetMs(new Date(at), timeZone);
  return new Date(at);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * D).toISOString().slice(0, 10);
}

/** 0 is Sunday, matching ExerciseAssignment.daysOfWeek. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

/** Whole days from `a` to `b` (b minus a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / D);
}
