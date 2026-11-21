"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx";

const sizes = {
  1: "text-h1 font-semibold",
  2: "text-h2 font-semibold",
  3: "text-h3 font-semibold",
  // design-tokens section 5: patient h4 is 500, clinician h4 600 (font-h4 reads the theme's weight).
  4: "text-h4 font-h4",
} as const;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Visual level, which selects the size from the active theme's scale. */
  level: 1 | 2 | 3 | 4;
  /** Rendered element. Defaults to the matching h-tag; set it to keep document order correct. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
  /**
   * Focus this heading when it mounts, for a view that replaced another one without a page load (a
   * step, a phase, a confirmation). Not for the first render of a page (CD-120).
   */
  focusOnMount?: boolean;
}

/** IBM Plex Sans in both themes (DR-001); size and weight come from the theme scale. */
export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level, as, className, focusOnMount, tabIndex, ...rest },
  ref,
) {
  const Tag = (as ?? `h${level}`) as ElementType;
  const inner = useRef<HTMLHeadingElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLHeadingElement);
  useEffect(() => {
    if (focusOnMount) inner.current?.focus();
  }, [focusOnMount]);
  return (
    <Tag
      ref={inner}
      tabIndex={tabIndex ?? (focusOnMount ? -1 : undefined)}
      className={cx(
        "font-heading text-ink",
        sizes[level],
        // A programmatically focused heading is not interactive: no ring on it (CD-120).
        (focusOnMount || tabIndex === -1) && "focus:outline-none",
        className,
      )}
      {...rest}
    />
  );
});

/** IDs, record numbers and audit hashes only: IBM Plex Mono with tabular numerals (DR-001). */
export function Mono({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx("font-mono tabular-nums", className)} {...rest} />;
}

/** Running text with the theme's line-length limit (60 characters for patients). */
export function Prose({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("max-w-measure space-y-3 text-body text-ink", className)}>{children}</div>
  );
}

export function Muted({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx("text-ink-muted", className)} {...rest} />;
}
