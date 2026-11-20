import type { WeeklyProgress } from "@carepath/shared/contracts";
import { formatLocalDate } from "../_lib/format";

/**
 * Hand-built SVG charts (no chart library). Colour comes from chart tokens only, and identity never
 * rests on colour: assigned is an outline, completed is solid, and every value is printed. Each chart
 * is paired with a table of the same values (AC-C7), rendered by the page next to it.
 */

/**
 * Drawing width in pixels. The SVG never renders wider than this, so axis text stays at caption size on
 * wide screens (checkpoint C2, 1.5.3); on a narrow phone it scales down by a few percent at most.
 */
const W = 360;
const PAD = { top: 16, right: 12, bottom: 34, left: 30 };

function niceMax(n: number): number {
  if (n <= 4) return 4;
  return Math.ceil(n / 2) * 2;
}

export function WeeklyBars({ weeks }: { weeks: WeeklyProgress[] }) {
  const H = 210;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = niceMax(
    Math.max(1, ...weeks.map((w) => Math.max(w.assignedSessions, w.completedSessions))),
  );
  const ticks = [0, max / 2, max];
  const slot = plotW / weeks.length;
  const barW = Math.min(18, slot / 2 - 4);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const summary = weeks
    .map(
      (w) =>
        `Week of ${formatLocalDate(w.weekStart, "short")}: ${w.completedSessions} of ${w.assignedSessions} sessions completed`,
    )
    .join(". ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Sessions assigned and completed per week. ${summary}.`}
      style={{ maxWidth: W }}
      className="block h-auto w-full"
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
            x={PAD.left - 6}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-ink-muted text-caption"
          >
            {t}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const cx = PAD.left + slot * i + slot / 2;
        const aH = (w.assignedSessions / max) * plotH;
        const cH = (w.completedSessions / max) * plotH;
        return (
          <g key={w.weekStart}>
            <rect
              x={cx - barW - 1}
              y={y(w.assignedSessions)}
              width={barW}
              height={Math.max(aH, 0)}
              rx={3}
              className="fill-surface stroke-chart-1"
              strokeWidth={2}
            />
            <rect
              x={cx + 1}
              y={y(w.completedSessions)}
              width={barW}
              height={Math.max(cH, 0)}
              rx={3}
              className="fill-chart-1"
            />
            <text
              x={cx - barW / 2 - 1}
              y={y(w.assignedSessions) - 4}
              textAnchor="middle"
              className="fill-ink text-caption"
            >
              {w.assignedSessions}
            </text>
            <text
              x={cx + barW / 2 + 1}
              y={y(w.completedSessions) - 4}
              textAnchor="middle"
              className="fill-ink text-caption"
            >
              {w.completedSessions}
            </text>
            <text x={cx} y={H - 14} textAnchor="middle" className="fill-ink-muted text-caption">
              {formatLocalDate(w.weekStart, "short")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BarsLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ink">
      <li className="flex items-center gap-2">
        <svg width="16" height="16" aria-hidden="true">
          <rect
            x="1"
            y="1"
            width="14"
            height="14"
            rx="3"
            className="fill-surface stroke-chart-1"
            strokeWidth={2}
          />
        </svg>
        Assigned (outline)
      </li>
      <li className="flex items-center gap-2">
        <svg width="16" height="16" aria-hidden="true">
          <rect x="1" y="1" width="14" height="14" rx="3" className="fill-chart-1" />
        </svg>
        Completed (solid)
      </li>
    </ul>
  );
}

export interface PainPoint {
  date: string;
  painScore: number;
}

/** Patient-reported pain, 0 to 10, one point per check-in. No trend line, arrow or verdict is drawn. */
export function PainLine({ points }: { points: PainPoint[] }) {
  const H = 210;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const times = points.map((p) => new Date(`${p.date}T12:00:00Z`).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (i: number) =>
    PAD.left + (t1 === t0 ? plotW / 2 : ((times[i]! - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / 10) * plotH;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.painScore).toFixed(1)}`)
    .join(" ");
  const label = points.length <= 8;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Patient-reported pain from ${points.length} check-ins, on a scale of 0 to 10. Values are in the table below.`}
      style={{ maxWidth: W }}
      className="block h-auto w-full"
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
            x={PAD.left - 6}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-ink-muted text-caption"
          >
            {t}
          </text>
        </g>
      ))}
      {points.length > 1 ? (
        <path
          d={path}
          fill="none"
          className="stroke-chart-1"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ) : null}
      {points.map((p, i) => (
        <g key={`${p.date}-${i}`}>
          <circle
            cx={x(i)}
            cy={y(p.painScore)}
            r={5}
            className="fill-chart-1 stroke-surface"
            strokeWidth={2}
          />
          {label ? (
            <text
              x={x(i)}
              y={y(p.painScore) - 10}
              textAnchor="middle"
              className="fill-ink text-caption"
            >
              {p.painScore}
            </text>
          ) : null}
        </g>
      ))}
      <text x={PAD.left} y={H - 12} textAnchor="start" className="fill-ink-muted text-caption">
        {formatLocalDate(points[0]!.date, "short")}
      </text>
      {points.length > 1 ? (
        <text x={W - PAD.right} y={H - 12} textAnchor="end" className="fill-ink-muted text-caption">
          {formatLocalDate(points[points.length - 1]!.date, "short")}
        </text>
      ) : null}
    </svg>
  );
}
