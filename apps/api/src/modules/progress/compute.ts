import type { WeeklyProgress } from "@carepath/shared/contracts";
import { addDays, localDate, mondayOf, startOfLocalDay, weekday } from "../../core/time.js";

/**
 * Progress arithmetic shared by patient progress, Today, the clinician overview and the
 * missed-sessions rule, so every screen counts the same way (AC-C2). Definitions are in the
 * ProgressView contract.
 */
export interface ScheduleVersion {
  id: string;
  versionNumber: number;
  publishedAt: Date;
  assignments: { daysOfWeek: number[]; timesPerDay: number }[];
}

export interface ProgressSession {
  id: string;
  status: string;
  startedAt: Date;
  activities: { status: string }[];
}

/** The version in force at the end of a local day: the last one published before the next midnight. */
export function versionOn(
  date: string,
  timeZone: string,
  versions: ScheduleVersion[],
): ScheduleVersion | null {
  const end = startOfLocalDay(addDays(date, 1), timeZone).getTime();
  let found: ScheduleVersion | null = null;
  for (const v of versions) {
    if (v.publishedAt.getTime() < end) {
      if (!found || v.publishedAt.getTime() >= found.publishedAt.getTime()) found = v;
    }
  }
  return found;
}

/** Sessions assigned on a day: the largest timesPerDay among exercises scheduled that day. */
export function assignedOn(date: string, timeZone: string, versions: ScheduleVersion[]): number {
  const v = versionOn(date, timeZone, versions);
  if (!v) return 0;
  const day = weekday(date);
  return v.assignments
    .filter((a) => a.daysOfWeek.includes(day))
    .reduce((max, a) => Math.max(max, a.timesPerDay), 0);
}

export interface DayTotals {
  assignedSessions: number;
  completedSessions: number;
  stoppedSessions: number;
  completedActivities: number;
  skippedActivities: number;
}

/** Totals over the local days from..to inclusive. */
export function totalsBetween(
  from: string,
  to: string,
  timeZone: string,
  versions: ScheduleVersion[],
  sessions: ProgressSession[],
): DayTotals {
  const totals: DayTotals = {
    assignedSessions: 0,
    completedSessions: 0,
    stoppedSessions: 0,
    completedActivities: 0,
    skippedActivities: 0,
  };
  for (let d = from; d <= to; d = addDays(d, 1)) {
    totals.assignedSessions += assignedOn(d, timeZone, versions);
  }
  for (const s of sessions) {
    const day = localDate(s.startedAt, timeZone);
    if (day < from || day > to) continue;
    if (s.status === "completed") totals.completedSessions += 1;
    if (s.status === "stopped_discomfort") totals.stoppedSessions += 1;
    if (s.status === "completed" || s.status === "stopped_discomfort") {
      totals.completedActivities += s.activities.filter((a) => a.status === "completed").length;
      totals.skippedActivities += s.activities.filter((a) => a.status === "skipped").length;
    }
  }
  return totals;
}

/** Weekly buckets (Monday to Sunday), oldest first, counting days up to and including today. */
export function weeklyProgress(
  today: string,
  weeks: number,
  timeZone: string,
  versions: ScheduleVersion[],
  sessions: ProgressSession[],
): WeeklyProgress[] {
  const out: WeeklyProgress[] = [];
  const thisMonday = mondayOf(today);
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(thisMonday, -7 * w);
    const weekEnd = addDays(weekStart, 6);
    const to = weekEnd < today ? weekEnd : today;
    out.push({ weekStart, weekEnd, ...totalsBetween(weekStart, to, timeZone, versions, sessions) });
  }
  return out;
}

/** First instant the weekly window needs, for fetching sessions and check-ins. */
export function windowStart(today: string, weeks: number, timeZone: string): Date {
  return startOfLocalDay(addDays(mondayOf(today), -7 * (weeks - 1)), timeZone);
}
