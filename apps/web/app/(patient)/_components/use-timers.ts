"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Seconds counted by a one-second interval, not by reading the wall clock, so a paused tab or a
 * fixed test clock cannot invent time. `base` is what the server already stored.
 */
export function useElapsed(running: boolean, base: number) {
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setExtra((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    // A new stored value (after pause, resume or reload) restarts the count from it.
    setExtra(0);
  }, [base]);
  return base + extra;
}

/** A countdown for rest and for timed holds. `onDone` runs once when it reaches zero. */
export function useCountdown(onDone: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => (r === null ? r : Math.max(0, r - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) {
      setRunning(false);
      doneRef.current();
    }
  }, [running, remaining]);

  const start = useCallback((seconds: number) => {
    setRemaining(seconds);
    setRunning(true);
  }, []);
  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(null);
  }, []);
  return { remaining, running, start, toggle, reset };
}
