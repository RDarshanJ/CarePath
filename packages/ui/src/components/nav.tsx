import type { ElementType, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  current?: boolean;
  /** Work-list count shown beside the label. */
  count?: number;
}

interface NavProps {
  items: NavItem[];
  label: string;
  /** Link element, so apps can pass next/link without this package depending on Next. */
  linkAs?: ElementType;
  className?: string;
}

/** Patient bottom tab bar: four text-labelled destinations, 56 px tall, current page marked with a bar and aria-current. */
export function BottomTabBar({ items, label, linkAs: Link = "a", className }: NavProps) {
  return (
    <nav aria-label={label} className={cx("border-t border-border bg-surface", className)}>
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={it.current ? "page" : undefined}
              className={cx(
                "relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-small motion-fast transition-colors focus-visible:focus-ring",
                it.current
                  ? "font-semibold text-primary"
                  : "font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {it.current ? (
                <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 bg-primary" />
              ) : null}
              <Icon name={it.icon} size={22} />
              <span>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Clinician and admin left rail. Current page: filled subtle row, 2 px bar and aria-current. */
export function SideNav({
  items,
  label,
  linkAs: Link = "a",
  className,
  footer,
}: NavProps & { footer?: ReactNode }) {
  return (
    <nav
      aria-label={label}
      className={cx("flex flex-col gap-1 border-r border-border bg-surface p-2", className)}
    >
      <ul className="flex flex-col gap-0.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={it.current ? "page" : undefined}
              className={cx(
                "relative flex h-control items-center gap-2.5 rounded-control px-2.5 text-label motion-fast transition-colors focus-visible:focus-ring",
                it.current
                  ? "bg-primary-subtle font-semibold text-primary"
                  : "font-medium text-ink hover:bg-surface-sunken",
              )}
            >
              {it.current ? (
                <span aria-hidden="true" className="absolute inset-y-1 left-0 w-0.5 bg-primary" />
              ) : null}
              <Icon name={it.icon} size={18} />
              <span className="flex-1">{it.label}</span>
              {typeof it.count === "number" ? <CountBadge count={it.count} /> : null}
            </Link>
          </li>
        ))}
      </ul>
      {footer ? <div className="mt-auto border-t border-border pt-2">{footer}</div> : null}
    </nav>
  );
}

/** Numeric count, tabular figures. The accessible name carries the unit, for example "12 to review". */
export function CountBadge({ count, unit }: { count: number; unit?: string }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-control border border-border bg-surface-sunken px-1.5 text-caption font-medium tabular-nums text-ink">
      {count}
      {unit ? <span className="sr-only"> {unit}</span> : null}
    </span>
  );
}
