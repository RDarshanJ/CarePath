"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Timer helpers (CD-126). Hold and rest timers are informational: they never cut the patient off and
 * never move on by themselves. The visible clock is `role="timer"` with `aria-live="off"`; only
 * milestones are announced through the screen's status region, never every second.
 */

/** "0:45", "1:05", "12:00". Negative values read as 0:00. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** "45 seconds", "1 minute 5 seconds": the spoken form of a duration. */
export function spokenDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const parts: string[] = [];
  if (m) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  if (r || !m) parts.push(`${r} ${r === 1 ? "second" : "seconds"}`);
  return parts.join(" ");
}

/**
 * The milestone to announce when the remaining time crosses one, else null. Milestones: start, ten
 * seconds left (only for timers longer than 20 seconds), done.
 */
export function timerMilestone(
  total: number,
  previousRemaining: number | null,
  remaining: number,
  noun = "Timer",
): string | null {
  const r = Math.max(0, Math.ceil(remaining));
  const p = previousRemaining === null ? null : Math.max(0, Math.ceil(previousRemaining));
  if (p === null) return `${noun} started, ${spokenDuration(total)}.`;
  if (p > 0 && r === 0) return `${noun} done.`;
  if (total > 20 && p > 10 && r <= 10 && r > 0) return "10 seconds left.";
  return null;
}

/**
 * A countdown that does not drift: it reads the clock on each tick instead of counting ticks. Pausing
 * keeps the remaining time. `onDone` fires once when it reaches zero; nothing else happens on its own.
 */
export function useCountdown({
  seconds,
  running,
  onDone,
  tickMs = 250,
}: {
  seconds: number;
  running: boolean;
  onDone?: () => void;
  tickMs?: number;
}): { remaining: number; reset: () => void } {
  const [remaining, setRemaining] = useState(seconds);
  const left = useRef(seconds);
  const done = useRef(false);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    left.current = seconds;
    done.current = false;
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running || done.current) return;
    let base = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      left.current = Math.max(0, left.current - (now - base) / 1000);
      base = now;
      setRemaining(left.current);
      if (left.current === 0 && !done.current) {
        done.current = true;
        clearInterval(id);
        cb.current?.();
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [running, tickMs]);

  return {
    remaining,
    reset: () => {
      left.current = seconds;
      done.current = false;
      setRemaining(seconds);
    },
  };
}
