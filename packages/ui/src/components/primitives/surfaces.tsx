import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";

/** Bordered container, radius 10, no shadow. Depth comes from the 1 px border and the surface step. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-container border border-border bg-surface p-4", className)}
      {...rest}
    />
  );
}

/** One block of a loading skeleton. Static on purpose: no shimmer (CD-446). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx("block rounded-control bg-surface-sunken", className)} />
  );
}

/**
 * Skeletons mirror the final layout and are used only for loads over about a second (CD-446). The group
 * is a status region with a visually hidden "Loading {noun}"; never a skeleton for a failure.
 */
export function SkeletonGroup({
  label = "Loading",
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Square-cornered initials, hidden from assistive technology. Always beside a name and role in text. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-subtle text-label font-semibold text-accent-ink",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Persistent line required by the plan: every app shell shows it. */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cx(
        "border-b border-border bg-surface-sunken px-gutter py-1.5 text-caption text-ink-muted",
        className,
      )}
    >
      Demonstration product. Synthetic data. Not for clinical use.
    </p>
  );
}

/** Skip link (CD-127, CD-507): the first focusable element of every shell; target `main#main`. */
export function SkipLink({
  href = "#main",
  children = "Skip to main content",
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only rounded-control bg-surface px-3 py-2 text-label font-medium text-link underline focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus-visible:focus-ring"
    >
      {children}
    </a>
  );
}
