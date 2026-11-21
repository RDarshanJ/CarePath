"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";

/**
 * Loading rules (CD-446):
 * - under about 1 s: nothing (refetches keep the previous content with `aria-busy`);
 * - 1 to 10 s for one element: the button's loading state, label in words;
 * - 1 to 10 s for a page or list: a skeleton that mirrors the content;
 * - over 10 s: the status changes to "This is taking longer than usual." with a retry control;
 * - never a spinner that replaces content already on screen, never a made-up percentage.
 * The spinner stops under reduced motion, so every loading state also says what is happening in words.
 */

export const SLOW_LOAD_MS = 10_000;

/** True once `loading` has stayed true for `afterMs`. */
export function useSlowLoad(loading: boolean, afterMs = SLOW_LOAD_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!loading) return;
    const id = setTimeout(() => setSlow(true), afterMs);
    return () => clearTimeout(id);
  }, [loading, afterMs]);
  return slow;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "cp-spinner inline-block size-4 shrink-0 rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

/**
 * An inline loading line for one element ("Loading times"): spinner plus words in a status region.
 * After 10 seconds it says so and offers `retry`.
 */
export function LoadingStatus({
  label,
  loading = true,
  retry,
  className,
}: {
  label: string;
  loading?: boolean;
  /** A button, for example "Try loading times again". Shown only when the load is slow. */
  retry?: ReactNode;
  className?: string;
}) {
  const slow = useSlowLoad(loading);
  if (!loading) return null;
  return (
    <div
      role="status"
      className={cx("flex flex-wrap items-center gap-2 text-small text-ink-muted", className)}
    >
      <Spinner />
      <span>{slow ? "This is taking longer than usual." : label}</span>
      {slow && retry ? retry : null}
    </div>
  );
}
