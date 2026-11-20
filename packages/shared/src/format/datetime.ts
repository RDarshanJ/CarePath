/**
 * Dates and times (microcopy guidelines section 5, CD-314). Instants arrive as UTC strings and are
 * shown in the clinic's zone; calendar days arrive as `YYYY-MM-DD` and are never re-derived from
 * the browser clock. Text uses abbreviated months, 12-hour times with AM or PM and no leading zero,
 * and never a numeric-only date.
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

function parseDay(day: string): [number, number, number] | null {
  const [y, m, d] = day.split("-").map(Number);
  return y && m && d ? [y, m, d] : null;
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

/** "Thu, Nov 19" for an instant. */
export function formatDayShort(iso: string, tz: string): string {
  return formatter(tz, { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
}

/** "8:00 to 8:45 AM" style range: both ends in the same zone, no zone repeated. */
export function formatTimeRange(startsAt: string, endsAt: string, tz: string): string {
  return `${formatTime(startsAt, tz)} to ${formatTime(endsAt, tz)}`;
}

/** The calendar day of an instant in a zone, as `YYYY-MM-DD`. */
export function localDayOf(iso: string, tz: string): string {
  const parts = formatter(tz, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(iso),
  );
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The hour (0 to 23) of an instant in a zone. */
export function hourOf(iso: string, tz: string): number {
  const part = formatter(tz, { hour: "numeric", hourCycle: "h23" })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "hour");
  return Number(part?.value ?? "0");
}

export type CalendarDayStyle = "long" | "short" | "weekday" | "full" | "withYear" | "longYear";

/**
 * A calendar day written out. No clock is read.
 * - `short` "Nov 12", `withYear` "Nov 12, 2026"
 * - `long` "Thursday, November 19" (patient prose), `full` "November 19, 2026"
 * - `longYear` "Thursday, Nov 19, 2026", `weekday` "Thursday"
 */
export function formatCalendarDay(day: string, style: CalendarDayStyle = "short"): string {
  const p = parseDay(day);
  if (!p) return day;
  const options: Record<CalendarDayStyle, Intl.DateTimeFormatOptions> = {
    short: { month: "short", day: "numeric" },
    withYear: { month: "short", day: "numeric", year: "numeric" },
    long: { weekday: "long", month: "long", day: "numeric" },
    full: { month: "long", day: "numeric", year: "numeric" },
    longYear: { weekday: "long", month: "short", day: "numeric", year: "numeric" },
    weekday: { weekday: "long" },
  };
  return formatter("UTC", options[style]).format(new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)));
}

/** `2026-11-19` plus `n` calendar days, with no zone involved. */
export function addDays(day: string, n: number): string {
  const p = parseDay(day);
  if (!p) return day;
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
}

/** Calendar days from one `YYYY-MM-DD` to another (to minus from). */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000);
}

/** 0 is Sunday. */
export function weekdayOfDay(day: string): number {
  const p = parseDay(day);
  return p ? new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).getUTCDay() : 0;
}

/** `YYYY-MM-DD` as typed into a date field and accepted by the API. */
export const isLocalDate = (s: string | null | undefined): s is string => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// ---- zone naming -------------------------------------------------------------------------

function zonePart(
  iso: string,
  tz: string,
  style: "short" | "long" | "shortGeneric" | "longGeneric",
) {
  return (
    formatter(tz, { timeZoneName: style })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "timeZoneName")?.value ?? tz
  );
}

/** "MST" or "MDT" at that instant. For clinicians, where it can be misread. */
export function tzAbbreviation(iso: string, tz: string): string {
  return zonePart(iso, tz, "short");
}

/** "Mountain Standard Time" at that instant, the zone named in words. */
export function zoneName(tz: string, iso = "2026-01-15T12:00:00Z"): string {
  return zonePart(iso, tz, "long");
}

/**
 * Zone name that does not change with daylight saving: "Mountain Time" for patients, "MT" for
 * clinicians. A zone with no daylight saving keeps its own name ("Mountain Standard Time" for
 * Phoenix), which is the honest wording there.
 */
export function zoneNameGeneric(tz: string, iso: string, style: "long" | "short"): string {
  return zonePart(iso, tz, style === "long" ? "longGeneric" : "shortGeneric");
}

/** UTC offset of a zone at an instant, in minutes. */
export function zoneOffsetMinutes(iso: string, tz: string): number {
  const d = new Date(iso);
  const parts = formatter(tz, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60_000);
}

// ---- visit time (CD-314, option C) ----------------------------------------------------------

export interface VisitTimeOptions {
  /** The clinic's IANA zone. Every visit time is shown in it, with the zone named. */
  clinicZone: string;
  /** The viewer's zone (browser). Used only for a video visit. */
  viewerZone?: string | null;
  isVideo?: boolean;
  /** Patients get "Mountain Time"; staff get "MT" (`tzAbbreviation` rule). */
  audience: "patient" | "staff";
  /** Put the clinic day in front: "Thu, Nov 19, 9:00 AM Mountain Time". Default false. */
  withDay?: boolean;
}

export interface VisitTime {
  /** "9:00 AM Mountain Time" (day first when `withDay`). Always present. */
  clinic: string;
  /** The viewer's own time for a video visit when it differs: "8:00 AM Pacific Time". */
  viewer: string | null;
  /** The sentence-ready text: clinic time, plus the viewer time when there is one. */
  text: string;
}

/**
 * CD-314 (DR-002 F): instants are stored in UTC; every time is shown in the clinic's zone with the
 * zone named, because a physical visit happens on the clinic's clock. For a video visit the viewer's
 * local time is added when it would differ, with the day when it falls on another calendar day.
 */
export function formatVisitTime(instant: string, o: VisitTimeOptions): VisitTime {
  const style = o.audience === "patient" ? "long" : "short";
  const clinicZoneText = zoneNameGeneric(o.clinicZone, instant, style);
  const clinicTime = `${formatTime(instant, o.clinicZone)} ${clinicZoneText}`;
  const clinic = o.withDay ? `${formatDayShort(instant, o.clinicZone)}, ${clinicTime}` : clinicTime;

  let viewer: string | null = null;
  const vz = o.viewerZone;
  if (
    o.isVideo &&
    vz &&
    vz !== o.clinicZone &&
    zoneOffsetMinutes(instant, vz) !== zoneOffsetMinutes(instant, o.clinicZone)
  ) {
    const dayShift = localDayOf(instant, vz) !== localDayOf(instant, o.clinicZone);
    viewer = `${dayShift ? `${formatDayShort(instant, vz)}, ` : ""}${formatTime(instant, vz)} ${zoneNameGeneric(vz, instant, style)}`;
  }
  const text = viewer
    ? o.audience === "patient"
      ? `${clinic}, which is ${viewer} for you`
      : `${clinic} (${viewer} for you)`
    : clinic;
  return { clinic, viewer, text };
}

/** "Updated 9:12 AM" in the clinic zone. */
export function formatUpdatedAt(iso: string, tz: string): string {
  return `Updated ${formatTime(iso, tz)}`;
}

/** "Record as of 9:12 AM" in the clinic zone. */
export function formatRecordAsOf(iso: string, tz: string): string {
  return `Record as of ${formatTime(iso, tz)}`;
}

/** Birth date for a record header: "Born Mar 4, 1984". */
export function formatBornText(day: string): string {
  return `Born ${formatCalendarDay(day, "withYear")}`;
}
