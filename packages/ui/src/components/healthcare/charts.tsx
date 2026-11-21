"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  daysBetween,
  formatAgeHours,
  formatCalendarDay,
  weekdayNames,
  weekdayOfDay,
  weekdayShort,
} from "@carepath/shared";
import type { WeeklyProgress } from "@carepath/shared/contracts";
import { cx } from "../../lib/cx";
import { Banner } from "../composed/banner";
import { Table, TBody, THead, Td, Th, Tr } from "../composed/table";
import { Button } from "../primitives/button";
import { Icon, type IconName } from "../primitives/icons";
import { Skeleton } from "../primitives/surfaces";
import { Heading } from "../primitives/text";
import {
  dayStatusWords,
  gapText,
  painRows,
  painSegments,
  weeklyRows,
  type DayStatus,
  type DayStripDay,
  type PainPointInput,
  type PlanUpdateMark,
  type WeeklyRow,
} from "./chart-data";

/*
 * Charts (CD-211 to CD-218). Hand-built SVG, chart tokens only, a second channel for every series
 * (outline versus solid, dashed for a partial week, printed values), no tooltip as an access path and
 * no animation. Each chart sits in a `ChartFigure` with a caption sentence and the equal table.
 */

const PAD = { top: 24, right: 16, bottom: 44, left: 32 };

/**
 * Draws the chart at its real pixel width (up to `max`), so axis text keeps the theme's caption size
 * at every width instead of scaling with the SVG. Server render and first paint use `max`.
 */
function useChartWidth(max: number): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(max);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry?.contentRect.width ?? max);
      if (w > 0) setWidth(Math.max(240, Math.min(max, w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);
  return [ref, width];
}

export interface PainChartProps {
  points: PainPointInput[];
  /** First and last day of the window, so the time axis shows the whole period asked for. */
  range?: { from: string; to: string };
  /** Plan versions inside the window. Drawn as ticks only when `showPlanTicks` (clinician, DR-002 E). */
  planUpdates?: PlanUpdateMark[];
  showPlanTicks?: boolean;
  /** Short accessible name; the values are in the table. */
  label: string;
  /** Largest drawing width in px; narrower containers draw narrower, text stays at caption size. */
  width?: number;
}

/**
 * Patient-reported pain over time (CD-211): fixed 0 to 10 axis with ticks at 0, 5 and 10, points at
 * their dates, a line only between check-ins at most 7 days apart, a break otherwise. No smoothing,
 * target, band or colour by value.
 */
export function PainChart({
  points,
  range,
  planUpdates = [],
  showPlanTicks = false,
  label,
  width = 360,
}: PainChartProps) {
  const H = 220;
  const [box, W] = useChartWidth(width);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const from = range?.from ?? sorted[0]?.date ?? "";
  const to = range?.to ?? sorted[sorted.length - 1]?.date ?? from;
  const span = Math.max(0, daysBetween(from, to));
  const x = (day: string) =>
    PAD.left + (span === 0 ? plotW / 2 : (daysBetween(from, day) / span) * plotW);
  const y = (v: number) => PAD.top + plotH - (Math.min(10, Math.max(0, v)) / 10) * plotH;
  const { segments } = painSegments(sorted);
  const labelled = sorted.length <= 12;
  return (
    <div ref={box} className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={label}
        style={{ maxWidth: W }}
        className="block h-auto w-full"
        data-chart="pain"
      >
        {[0, 5, 10].map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-ink-muted text-caption"
            >
              {t}
            </text>
          </g>
        ))}
        {segments
          .filter((s) => s.length > 1)
          .map((s) => (
            <path
              key={s[0]!.checkInId}
              data-mark="segment"
              d={s
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)} ${y(p.painScore).toFixed(1)}`,
                )
                .join(" ")}
              fill="none"
              className="stroke-chart-1"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ))}
        {sorted.map((p) => (
          <g key={p.checkInId} data-mark="point" data-value={p.painScore} data-date={p.date}>
            <circle
              cx={x(p.date)}
              cy={y(p.painScore)}
              r={4.5}
              className="fill-chart-1 stroke-surface"
              strokeWidth={2}
            />
            {labelled ? (
              <text
                x={x(p.date)}
                y={y(p.painScore) - 10}
                textAnchor="middle"
                className="fill-ink text-caption font-medium tabular-nums"
              >
                {p.painScore}
              </text>
            ) : null}
          </g>
        ))}
        {showPlanTicks
          ? planUpdates
              .filter((u) => u.date >= from && u.date <= to)
              .map((u) => (
                <g key={u.versionNumber} data-mark="plan-tick">
                  <line
                    x1={x(u.date)}
                    x2={x(u.date)}
                    y1={y(0) - 6}
                    y2={y(0) + 6}
                    className="stroke-ink-muted"
                    strokeWidth={1.5}
                  />
                  <text
                    x={x(u.date)}
                    y={y(0) + 18}
                    textAnchor="middle"
                    className="fill-ink-muted text-caption"
                  >
                    v{u.versionNumber}
                  </text>
                </g>
              ))
          : null}
        {from ? (
          <text x={PAD.left} y={H - 6} textAnchor="start" className="fill-ink-muted text-caption">
            {formatCalendarDay(from)}
          </text>
        ) : null}
        {to && to !== from ? (
          <text
            x={W - PAD.right}
            y={H - 6}
            textAnchor="end"
            className="fill-ink-muted text-caption"
          >
            {formatCalendarDay(to)}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

/** The gaps under the pain chart, in words (CD-217). */
export function PainGapList({ points }: { points: PainPointInput[] }) {
  const { gaps } = painSegments(points);
  if (gaps.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5 text-small text-ink-muted">
      {gaps.map((g) => (
        <li key={g.from}>{gapText(g)}</li>
      ))}
    </ul>
  );
}

function niceMax(n: number): number {
  if (n <= 4) return 4;
  return Math.ceil(n / 2) * 2;
}

export interface WeeklySessionsChartProps {
  weeks: WeeklyProgress[];
  /** Clinic-zone day; the week containing it is drawn as partial ("so far"). */
  today: string;
  label: string;
  width?: number;
}

/**
 * Assigned versus completed sessions per week (CD-212): grouped bars, assigned as an outline and
 * completed solid, values printed, the current week dashed with "so far". No percentage, streak or
 * target line; stops are words, not a coloured segment.
 */
export function WeeklySessionsChart({
  weeks,
  today,
  label,
  width = 360,
}: WeeklySessionsChartProps) {
  const rows = weeklyRows(weeks, today);
  const H = 230;
  const [box, W] = useChartWidth(width);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(1, ...rows.map((r) => Math.max(r.assigned, r.completed))));
  const ticks = [0, max / 2, max];
  const slot = plotW / Math.max(1, rows.length);
  const barW = Math.max(6, Math.min(18, slot / 2 - 4));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const everyOther = rows.length > 8;
  const roomy = rows.length <= 6;
  return (
    <div ref={box} className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={label}
        style={{ maxWidth: W }}
        className="block h-auto w-full"
        data-chart="weekly"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-ink-muted text-caption"
            >
              {t}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx0 = PAD.left + slot * i + slot / 2;
          return (
            <g
              key={r.key}
              data-mark="week"
              data-week={r.weekStart}
              data-assigned={r.assigned}
              data-completed={r.completed}
            >
              <rect
                x={cx0 - barW - 1}
                y={y(r.assigned)}
                width={barW}
                height={Math.max(0, y(0) - y(r.assigned))}
                rx={2}
                className="fill-surface stroke-chart-1"
                strokeWidth={2}
                strokeDasharray={r.current ? "4 3" : undefined}
              />
              <rect
                x={cx0 + 1}
                y={y(r.completed)}
                width={barW}
                height={Math.max(0, y(0) - y(r.completed))}
                rx={2}
                className={r.current ? "fill-chart-1 stroke-chart-1" : "fill-chart-1"}
                strokeDasharray={r.current ? "4 3" : undefined}
              />
              <text
                x={cx0 - barW / 2 - 1}
                y={y(r.assigned) - 5}
                textAnchor="middle"
                className="fill-ink text-caption tabular-nums"
              >
                {r.assigned}
              </text>
              <text
                x={cx0 + barW / 2 + 1}
                y={y(r.completed) - 5}
                textAnchor="middle"
                className="fill-ink text-caption font-medium tabular-nums"
              >
                {r.completed}
              </text>
              {!everyOther || i % 2 === rows.length % 2 || r.current ? (
                <text
                  x={cx0}
                  y={H - 24}
                  textAnchor="middle"
                  className="fill-ink-muted text-caption"
                >
                  {formatCalendarDay(r.weekStart)}
                </text>
              ) : null}
              {r.current ? (
                <text x={cx0} y={H - 8} textAnchor="middle" className="fill-ink text-caption">
                  so far
                </text>
              ) : roomy && r.stopped > 0 ? (
                <text x={cx0} y={H - 8} textAnchor="middle" className="fill-ink text-caption">
                  {r.stopped} stopped
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Swatch({ kind }: { kind: "outline" | "solid" | "dashed" }) {
  return (
    <svg width="16" height="16" aria-hidden="true" className="shrink-0">
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        className={kind === "solid" ? "fill-chart-1" : "fill-surface stroke-chart-1"}
        strokeWidth={2}
        strokeDasharray={kind === "dashed" ? "4 3" : undefined}
      />
    </svg>
  );
}

/** Legend for the weekly chart, always in the same place (above the chart). Words carry the meaning. */
export function SessionsLegend({ partialWeek = true }: { partialWeek?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ink">
      <li className="flex items-center gap-2">
        <Swatch kind="outline" />
        Assigned (outline)
      </li>
      <li className="flex items-center gap-2">
        <Swatch kind="solid" />
        Completed (solid)
      </li>
      {partialWeek ? (
        <li className="flex items-center gap-2">
          <Swatch kind="dashed" />
          This week so far (dashed)
        </li>
      ) : null}
    </ul>
  );
}

/** The pain values as a real table, same rows as the chart (CD-218). */
export function PainTable({
  points,
  planUpdates = [],
  caption = "Patient-reported pain ratings, 0 to 10",
}: {
  points: PainPointInput[];
  planUpdates?: PlanUpdateMark[];
  caption?: string;
}) {
  const rows = painRows(points, planUpdates);
  return (
    <Table caption={caption} showCaption>
      <THead>
        <Tr header>
          <Th>Date</Th>
          <Th>Pain, 0 to 10</Th>
        </Tr>
      </THead>
      <TBody>
        {rows.map((r) => (
          <Tr key={r.key} data-row={r.kind}>
            <Td>{r.dateText}</Td>
            <Td className={r.kind === "plan" ? "text-ink-muted" : undefined}>{r.valueText}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

/** The weekly counts as a real table, same rows as the bars (CD-212, CD-218). */
export function WeeklySessionsTable({
  weeks,
  today,
  caption = "Sessions assigned and completed per week",
}: {
  weeks: WeeklyProgress[];
  today: string;
  caption?: string;
}) {
  const rows: WeeklyRow[] = weeklyRows(weeks, today);
  return (
    <Table caption={caption} showCaption>
      <THead>
        <Tr header>
          <Th>Week</Th>
          <Th numeric>Assigned</Th>
          <Th numeric>Completed</Th>
          <Th numeric>Stopped for discomfort</Th>
        </Tr>
      </THead>
      <TBody>
        {rows.map((r) => (
          <Tr key={r.key} data-row="week">
            <Td>
              {r.weekText}
              {r.current ? <span className="text-ink-muted">, so far</span> : null}
            </Td>
            <Td numeric>{r.assigned}</Td>
            <Td numeric>{r.completed}</Td>
            <Td numeric>{r.stopped}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export type ChartFigureState = "ready" | "loading" | "empty" | "error";

export interface ChartFigureProps {
  /** Chart title, naming the data class and scale ("Patient-reported pain, 0 to 10"). */
  title: string;
  headingLevel?: 2 | 3 | 4;
  /** The window in words ("Last 4 weeks"); always stated (data-visualization-guidelines section 3). */
  windowText: string;
  /** Data-class label shown with the title (CD-210): "Patient-reported", "Session activity". */
  sourceLabel: string;
  state?: ChartFigureState;
  /** The SVG chart; ready state only. */
  chart?: ReactNode;
  /** Legend, above the chart. */
  legend?: ReactNode;
  /** Text under the chart (gaps). */
  notes?: ReactNode;
  /** Neutral count sentence (no evaluative words, tested). */
  caption?: string;
  /** The equal table. */
  table?: ReactNode;
  /** "pain ratings": the toggle reads "Show pain ratings as a table". */
  tableName: string;
  /** Clinicians see the table by default (CD-216); patients get a toggle and the table stays in the DOM. */
  tableMode?: "visible" | "toggle";
  /** Empty state sentence ("No check-ins yet. Ratings appear here after your first check-in."). */
  emptyText?: string;
  emptyAction?: ReactNode;
  /** Error state: what could not load ("check-ins"), with a retry. */
  errorNoun?: string;
  onRetry?: () => void;
  /** Stale data line (CD-217), shown above the chart. */
  stale?: ReactNode;
  className?: string;
}

/**
 * A chart with its two-part text alternative (CD-218): `figure` > chart (`role="img"`, short label) and
 * `figcaption` with the count sentence, followed by the real table. Missing, partial, failed and stale
 * data each say so in words (CD-217).
 */
export function ChartFigure({
  title,
  headingLevel = 3,
  windowText,
  sourceLabel,
  state = "ready",
  chart,
  legend,
  notes,
  caption,
  table,
  tableName,
  tableMode = "toggle",
  emptyText,
  emptyAction,
  errorNoun = "this data",
  onRetry,
  stale,
  className,
}: ChartFigureProps) {
  const [open, setOpen] = useState(false);
  const tableId = useId();
  const headingId = useId();
  const visibleTable = tableMode === "visible";
  return (
    <section
      aria-labelledby={headingId}
      className={cx("@container flex min-w-0 flex-col gap-3", className)}
    >
      <div className="flex flex-col gap-0.5">
        <Heading level={headingLevel} id={headingId}>
          {title}
        </Heading>
        <p className="text-small text-ink-muted">
          <span className="font-medium text-ink">{sourceLabel}</span>. {windowText}.
        </p>
      </div>
      {state === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <p className="sr-only">Loading {title}</p>
          <Skeleton className="h-40 w-full max-w-sm" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : state === "error" ? (
        <Banner
          tone="error"
          title={`Could not load ${errorNoun}`}
          action={
            onRetry ? (
              <Button variant="neutral" size="sm" onClick={onRetry}>
                Try again
              </Button>
            ) : undefined
          }
        >
          Nothing on this page was changed.
        </Banner>
      ) : state === "empty" ? (
        <div className="flex flex-col items-start gap-2 rounded-container border border-border bg-surface p-4">
          <p className="text-body text-ink">{emptyText ?? "Nothing recorded in this period."}</p>
          {emptyAction}
        </div>
      ) : (
        <>
          {stale}
          <div className={cx("grid gap-4", visibleTable && "@4xl:grid-cols-2 @4xl:items-start")}>
            <figure className="flex min-w-0 flex-col gap-2">
              {legend}
              {chart}
              {notes}
              {caption ? <figcaption className="text-small text-ink">{caption}</figcaption> : null}
            </figure>
            {visibleTable ? (
              <div className="order-first min-w-0 @4xl:order-none">{table}</div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <Button
                    variant="neutral"
                    size="sm"
                    aria-expanded={open}
                    aria-controls={tableId}
                    onClick={() => setOpen((v) => !v)}
                    iconRight={open ? "chevron-up" : "chevron-down"}
                  >
                    {open ? `Hide ${tableName} table` : `Show ${tableName} as a table`}
                  </Button>
                </div>
                <div id={tableId} hidden={!open}>
                  {table}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/** "Check-in data is 3 hours old" with Refresh (CD-217). Ages under an hour are not stale. */
export function staleText(noun: string, ageHours: number): string {
  return `${noun} is ${formatAgeHours(ageHours)} old`;
}

export function DataStaleLine({
  noun,
  ageHours,
  onRefresh,
  refreshing = false,
}: {
  /** "Check-in data" */
  noun: string;
  ageHours: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  if (ageHours < 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink">
      <span className="flex items-center gap-1.5">
        <Icon name="clock" size={16} className="text-ink-muted" />
        {staleText(noun, ageHours)}
      </span>
      {onRefresh ? (
        <Button
          variant="neutral"
          size="sm"
          onClick={onRefresh}
          loading={refreshing}
          loadingLabel="Refreshing"
        >
          Refresh
        </Button>
      ) : null}
    </div>
  );
}

const dayIcon: Record<DayStatus, IconName> = {
  done: "check-circle",
  stopped: "alert-triangle",
  planned: "calendar",
  rest: "minus",
  not_done: "dot",
};

/**
 * This week as an ordered list of seven days with a word and an icon (CD-213). Neutral words ("Not
 * done"), no grid of unmarked days. A list below 640 px, seven columns above.
 */
export function DayStrip({ days, label = "This week" }: { days: DayStripDay[]; label?: string }) {
  return (
    <ol aria-label={label} className="grid grid-cols-1 gap-1 sm:grid-cols-7 sm:gap-2">
      {days.map((d) => {
        const wd = weekdayOfDay(d.date);
        return (
          <li
            key={d.date}
            data-status={d.status}
            aria-current={d.today ? "date" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-control border px-3 py-2 sm:flex-col sm:items-start sm:gap-1 sm:px-2",
              d.today ? "border-selected-edge bg-selected-bg" : "border-border bg-surface",
            )}
          >
            <span className="min-w-24 text-label font-medium text-ink sm:min-w-0">
              <span className="sm:hidden">{weekdayNames[wd]}</span>
              <span className="hidden sm:inline">{weekdayShort[wd]}</span>{" "}
              <span className="font-normal text-ink-muted">{formatCalendarDay(d.date)}</span>
              {d.today ? (
                <span className="block text-caption font-medium text-selected-ink">Today</span>
              ) : null}
            </span>
            <span
              className={cx(
                "flex items-center gap-1.5 text-small",
                d.status === "done" && "text-success-ink",
                d.status === "stopped" &&
                  "rounded-control bg-warning-bg px-1.5 font-medium text-warning-ink",
                (d.status === "planned" || d.status === "not_done" || d.status === "rest") &&
                  "text-ink",
              )}
            >
              <Icon
                name={dayIcon[d.status]}
                size={16}
                className={cx(
                  "shrink-0",
                  (d.status === "rest" || d.status === "not_done") && "text-ink-muted",
                )}
              />
              {dayStatusWords[d.status]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
