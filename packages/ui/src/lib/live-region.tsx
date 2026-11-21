"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "./cx";

/**
 * Status messages (CD-126, WCAG 4.1.3). One polite `role="status"` region per screen for saved, sent and
 * loaded messages; `role="alert"` only for an error that does not move focus, never for success.
 *
 * The region is rendered empty first and filled afterwards, because screen readers announce changes to
 * a live region, not its initial content.
 */
export function LiveRegion({
  message,
  politeness = "polite",
  visible = false,
  className,
  id,
}: {
  message: string | null | undefined;
  politeness?: "polite" | "assertive";
  /** Visible status line (a count, "Saved at 9:12 AM"); otherwise visually hidden. */
  visible?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <p
      id={id}
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
      className={cx(visible ? "text-small text-ink-muted" : "sr-only", className)}
    >
      {message ?? ""}
    </p>
  );
}

/**
 * Holds the current announcement. `announce` the same text twice and it is read twice (a zero-width
 * suffix makes the second one a change). Debounced so a burst of updates is announced once.
 */
export function useAnnouncer(debounceMs = 150): {
  message: string;
  announce: (text: string) => void;
  clear: () => void;
} {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef("");
  const announce = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const next = text === last.current.replace(/\u200b$/, "") ? `${text}\u200b` : text;
        last.current = next;
        setMessage(next);
      }, debounceMs);
    },
    [debounceMs],
  );
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    last.current = "";
    setMessage("");
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return { message, announce, clear };
}
