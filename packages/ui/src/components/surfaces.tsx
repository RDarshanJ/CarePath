import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "./icons";
import { Heading } from "./text";

/** Bordered container, radius 10, no shadow. Depth comes from the 1 px border and the surface/background step. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("rounded-container border border-border bg-surface p-4", className)}
      {...rest}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx("block rounded-control bg-surface-sunken", className)} />
  );
}

/** Skeletons mirror the final layout. Static on purpose: no shimmer. */
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

export function EmptyState({
  icon = "list",
  title,
  children,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  /** Say why it is empty and what will fill it. */
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-start gap-3 rounded-container border border-dashed border-border-control p-6",
        className,
      )}
    >
      <Icon name={icon} size={24} className="text-ink-muted" />
      <Heading level={4} as="h3">
        {title}
      </Heading>
      <p className="max-w-measure text-body text-ink-muted">{children}</p>
      {action}
    </div>
  );
}

/** Square-cornered initials. Always shown beside a name and role in text. */
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
        "inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-primary-subtle text-label font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Link({
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      className={cx(
        "rounded-control text-primary underline underline-offset-2 hover:decoration-2 focus-visible:focus-ring",
        className,
      )}
      {...rest}
    />
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
