"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cx } from "../../lib/cx";
import { errorTitle } from "../../lib/forms";
import { Icon } from "../primitives/icons";

export interface SummaryError {
  /** The id of the control to focus: the input, or the first option of a radio or checkbox group. */
  targetId?: string;
  /** Custom focus for fields without a single id (the screen finds the control itself). */
  onSelect?: () => void;
  /** Same words as the inline message. */
  message: string;
}

/**
 * Error summary (CD-441, CD-108). Shown above the form after a failed submit, never beside a banner for
 * the same failure. It takes focus, is `role="alert"`, and each line is a link that moves focus to its
 * field. While it shows, the document title starts with "Error: ".
 */
export const ErrorSummary = forwardRef<
  HTMLDivElement,
  {
    errors: readonly SummaryError[];
    /** Patients: "Fix these before you continue". Staff: the relevant verb ("before you save"). */
    title?: string;
    /** Bump to move focus again after another failed submit. */
    focusKey?: unknown;
    /** Prefix document.title with "Error: " while shown (default true). */
    prefixTitle?: boolean;
    className?: string;
  }
>(function ErrorSummary(
  { errors, title = "Fix these before you continue", focusKey, prefixTitle = true, className },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => root.current as HTMLDivElement);
  const has = errors.length > 0;

  useEffect(() => {
    if (has) root.current?.focus();
  }, [has, focusKey]);

  useEffect(() => {
    if (!prefixTitle || !has) return;
    const apply = () => {
      const next = errorTitle(document.title, true);
      if (document.title !== next) document.title = next;
    };
    apply();
    // The framework may set the title again after this effect (streamed metadata): keep the prefix.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = errorTitle(document.title, false);
    };
  }, [has, prefixTitle]);

  if (!has) return null;
  return (
    <div
      ref={root}
      tabIndex={-1}
      role="alert"
      aria-labelledby="cp-error-summary-title"
      className={cx(
        "rounded-container border-2 border-error-ink bg-surface p-4 focus-visible:focus-ring",
        className,
      )}
    >
      <p
        id="cp-error-summary-title"
        className="flex items-center gap-2 text-label font-semibold text-error-ink"
      >
        <Icon name="alert-circle" size={20} className="shrink-0" />
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {errors.map((e) => (
          <li key={(e.targetId ?? "") + e.message}>
            <a
              href={`#${e.targetId ?? ""}`}
              onClick={(ev) => {
                if (e.onSelect) {
                  ev.preventDefault();
                  e.onSelect();
                  return;
                }
                const el = e.targetId ? document.getElementById(e.targetId) : null;
                if (!el) return;
                ev.preventDefault();
                el.focus();
                el.scrollIntoView({ block: "center" });
              }}
              className="inline-flex min-h-target items-center rounded-control text-body font-medium text-error-ink underline underline-offset-2 focus-visible:focus-ring"
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});
