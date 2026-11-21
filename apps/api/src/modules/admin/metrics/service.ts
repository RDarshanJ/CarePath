import {
  metricListKeys,
  type Metric,
  type MetricKey,
  type MetricRows,
  type MetricWindow,
} from "@carepath/shared/contracts";
import { metricListLabels, metricText } from "@carepath/shared";
import type { RequestCtx } from "../../../core/context.js";
import type { DbClient } from "../../../core/db/repo.js";
import { encodeCursor } from "../../../core/pagination.js";
import { addDays, localDate, startOfLocalDay } from "../../../core/time.js";
import {
  buildActivity,
  buildCancellations,
  buildCarePlan,
  buildEnrollment,
  buildPendingReview,
  buildUtilisation,
  listRoles,
  type Built,
} from "./compute.js";
import {
  loadActivePatients,
  loadBookedAppointments,
  loadDoneActivities,
  loadEnrollment,
  loadPendingTasks,
  loadPlanVersions,
  loadSlots,
  type Span,
} from "./repo.js";

type Scope = Pick<RequestCtx, "orgId">;
const DAY = 86_400_000;
const TRAILING_DAYS = 30;
const ACTIVITY_DAYS = 7;

interface Windows {
  current: Span;
  /** Null for a metric with no earlier window. */
  previous: Span | null;
  days: number | null;
}

function windowsFor(key: MetricKey, now: Date, timeZone: string): Windows {
  if (key === "care_plan_activation" || key === "pending_review_items") {
    return { current: { from: now, to: now, inclusive: true }, previous: null, days: null };
  }
  if (key === "activity_completion") {
    const today = localDate(now, timeZone);
    const first = startOfLocalDay(addDays(today, -(ACTIVITY_DAYS - 1)), timeZone);
    const before = startOfLocalDay(addDays(today, -(2 * ACTIVITY_DAYS - 1)), timeZone);
    return {
      current: { from: first, to: now, inclusive: false },
      previous: { from: before, to: first, inclusive: false },
      days: ACTIVITY_DAYS,
    };
  }
  const from = new Date(now.getTime() - TRAILING_DAYS * DAY);
  const before = new Date(from.getTime() - TRAILING_DAYS * DAY);
  return {
    current: { from, to: now, inclusive: true },
    previous: { from: before, to: from, inclusive: false },
    days: TRAILING_DAYS,
  };
}

async function build(
  db: DbClient,
  scope: Scope,
  key: MetricKey,
  span: Span,
  now: Date,
  timeZone: string,
): Promise<Built> {
  switch (key) {
    case "enrollment_completion":
      return buildEnrollment(await loadEnrollment(db, scope, span), now);
    case "appointment_utilisation":
      return buildUtilisation(await loadSlots(db, scope, span));
    case "cancellations":
      return buildCancellations(await loadBookedAppointments(db, scope, span));
    case "care_plan_activation":
      return buildCarePlan(await loadActivePatients(db, scope), now);
    case "activity_completion": {
      const [versions, done] = await Promise.all([
        loadPlanVersions(db, scope, span.to),
        loadDoneActivities(db, scope, span.from, span.to),
      ]);
      return buildActivity(versions, done, span, timeZone);
    }
    case "pending_review_items":
      return buildPendingReview(await loadPendingTasks(db, scope), now);
  }
}

function toWindow(span: Span, days: number | null, now: Date): MetricWindow {
  return days === null
    ? { kind: "now", days: null, from: null, to: now.toISOString() }
    : { kind: "trailing", days, from: span.from.toISOString(), to: span.to.toISOString() };
}

const ratioOf = (n: number, d: number | null) => (d && d > 0 ? n / d : null);

function listCount(built: Built, key: string) {
  const rows = built.rows.filter((r) => r.lists.includes(key));
  return { count: rows.length, rows };
}

export async function computeMetric(
  db: DbClient,
  scope: Scope,
  key: MetricKey,
  now: Date,
  timeZone: string,
): Promise<Metric> {
  const text = metricText[key];
  const w = windowsFor(key, now, timeZone);
  const built = await build(db, scope, key, w.current, now, timeZone);
  let previous: Metric["previous"] = null;
  if (w.previous) {
    const prev = await build(db, scope, key, w.previous, now, timeZone);
    previous = {
      window: toWindow(w.previous, w.days, now),
      numerator: prev.numerator,
      denominator: prev.denominator,
      ratio: ratioOf(prev.numerator, prev.denominator),
    };
  }
  const labels = metricListLabels[key] as Record<string, string>;
  const roles = listRoles[key] as Record<string, Metric["lists"][number]["role"]>;
  const lists = metricListKeys[key].map((listKey) => {
    const { count, rows } = listCount(built, listKey);
    return {
      key: listKey,
      label: labels[listKey]!,
      role: roles[listKey]!,
      count,
      minutes: text.unit === "minutes" ? rows.reduce((sum, r) => sum + (r.minutes ?? 0), 0) : null,
    };
  });
  const ratio = ratioOf(built.numerator, built.denominator);
  return {
    key,
    name: text.name,
    unit: text.unit,
    numerator: built.numerator,
    numeratorLabel: text.numeratorLabel,
    denominator: built.denominator,
    denominatorLabel: text.denominatorLabel,
    ratio,
    ratioUnavailableReason:
      ratio !== null
        ? null
        : built.denominator === null
          ? "This metric is a count, not a share."
          : `There were no ${text.denominatorLabel?.toLowerCase() ?? "records"} in this window, so the share cannot be calculated.`,
    window: toWindow(w.current, w.days, now),
    windowLabel: text.windowLabel,
    computedAt: now.toISOString(),
    definition: text.definition,
    calculation: text.calculation,
    source: text.source,
    supports: text.supports,
    previous,
    previousNote: previous ? (text.previousCaveat ?? "") : (text.noPreviousReason ?? ""),
    breakdown: built.breakdown,
    lists,
  };
}

export async function computeAll(
  db: DbClient,
  scope: Scope,
  now: Date,
  timeZone: string,
): Promise<Metric[]> {
  const out: Metric[] = [];
  for (const key of Object.keys(metricText) as MetricKey[]) {
    out.push(await computeMetric(db, scope, key, now, timeZone));
  }
  return out;
}

export async function computeRows(
  db: DbClient,
  scope: Scope,
  key: MetricKey,
  listKey: string,
  page: { offset: number; limit: number },
  now: Date,
  timeZone: string,
): Promise<MetricRows | null> {
  if (!(metricListKeys[key] as readonly string[]).includes(listKey)) return null;
  const w = windowsFor(key, now, timeZone);
  const built = await build(db, scope, key, w.current, now, timeZone);
  const { count, rows } = listCount(built, listKey);
  const slice = rows.slice(page.offset, page.offset + page.limit);
  const labels = metricListLabels[key] as Record<string, string>;
  return {
    metric: key,
    list: listKey,
    label: labels[listKey]!,
    computedAt: now.toISOString(),
    timezone: timeZone,
    count,
    minutes:
      metricText[key].unit === "minutes" ? rows.reduce((s, r) => s + (r.minutes ?? 0), 0) : null,
    items: slice.map((r) => r.row),
    nextCursor: page.offset + page.limit < count ? encodeCursor(page.offset + page.limit) : null,
  };
}
