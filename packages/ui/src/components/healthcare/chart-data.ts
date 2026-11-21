import {
  addDays,
  daysBetween,
  formatCalendarDay,
  ofTotal,
  painStaffText,
  plural,
  weekdayOfDay,
} from "@carepath/shared";
import type { WeeklyProgress } from "@carepath/shared/contracts";

/*
 * Chart data rules (CD-211 to CD-218, data-visualization-guidelines.md). The marks and the equal
 * table are both built from the row functions below, so a chart and its table cannot disagree
 * (AC-C2, AC-C7). No smoothing, interpolation, target, band or verdict word anywhere.
 */

/** A check-in pain value as the progress contract returns it (`ProgressView.pain.points`). */
export interface PainPointInput {
  checkInId: string;
  /** Clinic-zone day of the check-in. */
  date: string;
  painScore: number;
}

/** A plan version that started on a day (clinician ticks; a table row for both audiences). */
export interface PlanUpdateMark {
  date: string;
  versionNumber: number;
}

/** Consecutive check-ins further apart than this are not joined by a line (CD-211, E1 value). */
export const PAIN_GAP_DAYS = 7;

export interface PainGap {
  /** First day without a check-in. */
  from: string;
  /** Last day without a check-in. */
  to: string;
}

/** Splits the points into runs that may be joined, and the gaps between them. */
export function painSegments(
  points: PainPointInput[],
  maxGapDays = PAIN_GAP_DAYS,
): { segments: PainPointInput[][]; gaps: PainGap[] } {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const segments: PainPointInput[][] = [];
  const gaps: PainGap[] = [];
  for (const p of sorted) {
    const run = segments[segments.length - 1];
    const prev = run?.[run.length - 1];
    if (run && prev && daysBetween(prev.date, p.date) <= maxGapDays) run.push(p);
    else {
      if (prev) gaps.push({ from: addDays(prev.date, 1), to: addDays(p.date, -1) });
      segments.push([p]);
    }
  }
  return { segments, gaps };
}

/** "No check-ins Nov 3 to Nov 18" (CD-217). */
export function gapText(gap: PainGap): string {
  return gap.from === gap.to
    ? `No check-ins on ${formatCalendarDay(gap.from)}`
    : `No check-ins ${formatCalendarDay(gap.from)} to ${formatCalendarDay(gap.to)}`;
}

export type PainTableRow =
  | {
      kind: "check-in";
      key: string;
      date: string;
      dateText: string;
      value: number;
      valueText: string;
    }
  | {
      kind: "plan";
      key: string;
      date: string;
      dateText: string;
      versionNumber: number;
      valueText: string;
    };

/** Table rows, oldest first: one per check-in, plus "Plan updated" rows when marks are passed. */
export function painRows(
  points: PainPointInput[],
  planUpdates: PlanUpdateMark[] = [],
): PainTableRow[] {
  const rows: PainTableRow[] = [
    ...points.map((p): PainTableRow => ({
      kind: "check-in",
      key: p.checkInId,
      date: p.date,
      dateText: formatCalendarDay(p.date, "withYear"),
      value: p.painScore,
      valueText: ofTotal(p.painScore, 10),
    })),
    ...planUpdates.map((u): PainTableRow => ({
      kind: "plan",
      key: `plan-${u.versionNumber}`,
      date: u.date,
      dateText: formatCalendarDay(u.date, "withYear"),
      versionNumber: u.versionNumber,
      valueText: `Plan updated, version ${u.versionNumber}`,
    })),
  ];
  // Stable: a plan row on the same day as a check-in follows it.
  return rows.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === "plan" ? 1 : -1),
  );
}

/** "Pain ratings from Oct 27 to Nov 19: 9 check-ins, lowest 3, highest 7." Counts and dates only. */
export function painCaption(points: PainPointInput[]): string {
  if (points.length === 0) return "No check-ins in this period.";
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (sorted.length === 1) {
    return `Pain rating on ${formatCalendarDay(first.date)}: 1 check-in, ${ofTotal(first.painScore, 10)}.`;
  }
  const values = sorted.map((p) => p.painScore);
  return `Pain ratings from ${formatCalendarDay(first.date)} to ${formatCalendarDay(last.date)}: ${plural(sorted.length, "check-in")}, lowest ${Math.min(...values)}, highest ${Math.max(...values)}.`;
}

export interface WeeklyRow {
  key: string;
  weekStart: string;
  weekEnd: string;
  /** "Nov 16 to Nov 22" */
  weekText: string;
  /** The week that contains `today`: its counts are week to date. */
  current: boolean;
  assigned: number;
  completed: number;
  stopped: number;
}

/** One row per week, oldest first, the current week flagged (CD-212 partial-week treatment). */
export function weeklyRows(weeks: WeeklyProgress[], today: string): WeeklyRow[] {
  return weeks.map((w) => ({
    key: w.weekStart,
    weekStart: w.weekStart,
    weekEnd: w.weekEnd,
    weekText: `${formatCalendarDay(w.weekStart)} to ${formatCalendarDay(w.weekEnd)}`,
    current: w.weekStart <= today && today <= w.weekEnd,
    assigned: w.assignedSessions,
    completed: w.completedSessions,
    stopped: w.stoppedSessions,
  }));
}

/** Completed-of-assigned in words, with "so far this week" for the current week. */
export function weeklyCellText(row: WeeklyRow): string {
  return `${row.completed} of ${plural(row.assigned, "session")}${row.current ? " so far this week" : ""}`;
}

/** "1 stopped for discomfort", or null for none. */
export function stoppedText(n: number): string | null {
  return n > 0 ? `${n} stopped for discomfort` : null;
}

/** Neutral count sentence for the weekly sessions figure. */
export function weeklyCaption(rows: WeeklyRow[]): string {
  if (rows.length === 0) return "No weeks in this period.";
  const done = rows.reduce((n, r) => n + r.completed, 0);
  const assigned = rows.reduce((n, r) => n + r.assigned, 0);
  const stopped = rows.reduce((n, r) => n + r.stopped, 0);
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const stop = stopped > 0 ? `, ${stopped} stopped for discomfort` : "";
  return `Sessions from ${formatCalendarDay(first.weekStart)} to ${formatCalendarDay(last.weekEnd)}: ${done} completed of ${assigned} assigned${stop}.${last.current ? " The last week is counted so far." : ""}`;
}

/**
 * Words a chart caption or table caption must never contain (data-visualization-guidelines section 6).
 * Returns the words found, whole-word and case-insensitive.
 */
export const EVALUATIVE_WORDS = [
  "improve",
  "improved",
  "improving",
  "better",
  "worse",
  "recover",
  "recovered",
  "progress",
  "on track",
  "good",
  "bad",
] as const;

export function findEvaluativeWords(text: string): string[] {
  return EVALUATIVE_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
}

// ---- day strip (CD-213) ---------------------------------------------------------------------

export type DayStatus = "done" | "stopped" | "planned" | "rest" | "not_done";

export const dayStatusWords: Record<DayStatus, string> = {
  done: "Done",
  stopped: "Stopped",
  planned: "Planned",
  rest: "Rest",
  not_done: "Not done",
};

export interface DayStripDay {
  date: string;
  status: DayStatus;
  today: boolean;
}

/**
 * Seven days from `weekStart` (a Monday). A completed session makes the day Done, a stop makes it
 * Stopped; otherwise a scheduled day is Planned (today or later) or Not done (earlier), and an
 * unscheduled day is Rest. `sessions` carry clinic-zone days.
 */
export function dayStripDays(input: {
  weekStart: string;
  today: string;
  /** Weekdays the current plan schedules, 0 is Sunday. */
  scheduledWeekdays: number[];
  sessions: { date: string; status: "completed" | "stopped_discomfort" | "abandoned" }[];
}): DayStripDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(input.weekStart, i);
    const on = input.sessions.filter((s) => s.date === date);
    const scheduled = input.scheduledWeekdays.includes(weekdayOfDay(date));
    let status: DayStatus;
    if (on.some((s) => s.status === "completed")) status = "done";
    else if (on.some((s) => s.status === "stopped_discomfort")) status = "stopped";
    else if (!scheduled) status = "rest";
    else status = date >= input.today ? "planned" : "not_done";
    return { date, status, today: date === input.today };
  });
}

/**
 * List-row summary (CD-215): "Pain 6 of 10 (patient-reported), Nov 18. 5 check-ins in 14 days." Plain
 * text, no sparkline. With no check-in in the window: "No check-ins in 14 days."
 */
export function painListSummaryText(
  latest: { date: string; painScore: number } | null,
  count: number,
  windowDays: number,
): string {
  if (!latest || count === 0) return `No check-ins in ${windowDays} days.`;
  return `${painStaffText(latest.painScore, latest.date)}. ${plural(count, "check-in")} in ${windowDays} days.`;
}
