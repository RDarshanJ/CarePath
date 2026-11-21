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

export interface Countdown {
  /** Seconds left, or null before the first start. */
  remaining: number | null;
  /** The length it was started with, plus any time added. */
  total: number;
  running: boolean;
  start: (seconds: number) => void;
  toggle: () => void;
  reset: () => void;
  /** Adds time to a running or paused countdown (rest: "Add 15 seconds"). */
  add: (seconds: number) => void;
}

/**
 * A countdown for rest and for timed holds (CD-126). It counts one-second ticks, like `useElapsed`, so
 * the fixed clock of the end-to-end tests does not freeze it. `onDone` runs once when it reaches zero;
 * nothing is saved and the screen never moves the patient on by itself.
 */
export function useCountdown(onDone: () => void): Countdown {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
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
    setTotal(seconds);
    setRemaining(seconds);
    setRunning(true);
  }, []);
  const toggle = useCallback(() => setRunning((r) => !r), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(null);
    setTotal(0);
  }, []);
  const add = useCallback((seconds: number) => {
    setTotal((t) => t + seconds);
    setRemaining((r) => (r === null ? r : r + seconds));
  }, []);
  return { remaining, total, running, start, toggle, reset, add };
}

/**
 * Asks the browser to keep the screen on while the patient exercises (DR-002 C, item 4). Returns
 * "on" while the lock is held, "unavailable" when the browser has no wake lock or refused it (the
 * screen then shows a plain line instead), and "idle" when not requested. The lock is released on
 * pause, on leaving the page and when the tab is hidden, and asked for again when it is shown.
 */
export function useWakeLock(active: boolean): "on" | "unavailable" | "idle" {
  const [state, setState] = useState<"on" | "unavailable" | "idle">("idle");
  useEffect(() => {
    if (!active) {
      setState("idle");
      return;
    }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    if (!nav.wakeLock) {
      setState("unavailable");
      return;
    }
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      nav
        .wakeLock!.request("screen")
        .then((l) => {
          if (cancelled) void l.release();
          else {
            lock = l;
            setState("on");
          }
        })
        .catch(() => {
          if (!cancelled) setState("unavailable");
        });
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, [active]);
  return state;
}
