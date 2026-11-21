"use client";

import { useEffect, useRef } from "react";
import { cx } from "../../lib/cx";
import { LiveRegion, useAnnouncer } from "../../lib/live-region";
import { formatClock, spokenDuration, timerMilestone, useCountdown } from "../../lib/timer";

/**
 * A hold or rest timer (CD-126). The clock is `role="timer"` with `aria-live="off"`; milestones (start,
 * ten seconds left, done) go to a polite status line. It never moves the person on by itself: `onDone`
 * lets the screen show a Continue control, nothing more.
 */
export function Timer({
  label,
  seconds,
  running,
  noun = "Timer",
  onDone,
  className,
}: {
  /** "Hold", "Rest". */
  label: string;
  seconds: number;
  running: boolean;
  noun?: string;
  onDone?: () => void;
  className?: string;
}) {
  const { remaining } = useCountdown({ seconds, running, onDone });
  const { message, announce } = useAnnouncer(0);
  const prev = useRef<number | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!running && !started.current) return;
    const m = timerMilestone(seconds, started.current ? prev.current : null, remaining, noun);
    started.current = true;
    prev.current = remaining;
    if (m) announce(m);
  }, [remaining, running, seconds, noun, announce]);
  return (
    <div className={cx("flex flex-col items-start gap-1", className)}>
      <span className="text-label font-medium text-ink-muted">{label}</span>
      <span
        role="timer"
        aria-live="off"
        aria-label={`${label}, ${spokenDuration(remaining)} left`}
        className="text-data-value-lg font-medium text-ink tabular-nums"
      >
        {formatClock(remaining)}
      </span>
      <LiveRegion message={message} />
    </div>
  );
}
