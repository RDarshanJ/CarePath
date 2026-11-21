"use client";

import * as PR from "@radix-ui/react-progress";
import { cx } from "../../lib/cx";

export interface ProgressProps {
  label: string;
  value: number;
  max: number;
  /** Words for the value, for example "3 of 8 exercises". Always shown; the bar is not the only signal. */
  valueText?: string;
  className?: string;
}

/**
 * Position in a process (step 4 of 11, exercise 3 of 6). Always a visible label and value text, never a
 * bare percentage, and never for recovery, pain or goals (CD-214, CD-536). Timers are separate.
 */
export function Progress({ label, value, max, valueText, className }: ProgressProps) {
  const text = valueText ?? `${value} of ${max}`;
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-label">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-ink-muted">{text}</span>
      </div>
      <PR.Root
        value={value}
        max={max}
        getValueLabel={() => text}
        aria-label={label}
        className="relative h-2.5 overflow-hidden rounded-control border border-border-control bg-surface"
      >
        <PR.Indicator
          className="h-full bg-primary motion-base transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </PR.Root>
    </div>
  );
}
