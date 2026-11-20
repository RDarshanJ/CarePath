import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

const sizes = {
  1: "text-h1",
  2: "text-h2",
  3: "text-h3",
  4: "text-h4",
} as const;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Visual level, which selects the size from the active theme's scale. */
  level: 1 | 2 | 3 | 4;
  /** Rendered element. Defaults to the matching h-tag; set it to keep document order correct. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
}

/** Patient theme: Source Serif 4, 600. Clinician theme: IBM Plex Sans, 600. The font comes from the token. */
export function Heading({ level, as, className, ...rest }: HeadingProps) {
  const Tag = (as ?? `h${level}`) as ElementType;
  return (
    <Tag className={cx("font-heading font-semibold text-ink", sizes[level], className)} {...rest} />
  );
}

/** IDs, timestamps and dosage-like figures: IBM Plex Mono with tabular numerals. */
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
