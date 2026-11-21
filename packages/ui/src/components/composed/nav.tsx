import type { ElementType, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../primitives/icons";
import { CountBadge } from "../primitives/status";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  current?: boolean;
  /** Work-list count shown beside the label; only a true API total (CD-508). */
  count?: number;
  /** Words read with the count: "unread", "open". */
  countUnit?: string;
}

interface NavProps {
  items: NavItem[];
  label: string;
  /** Link element, so apps can pass next/link without this package depending on Next. */
  linkAs?: ElementType;
  className?: string;
}

/** Bottom tab bar: text-labelled destinations, 64 px tall; current page: selected fill, edge bar and aria-current. */
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
                  ? "bg-selected-bg font-semibold text-selected-ink"
                  : "font-medium text-ink-muted hover:bg-primary-subtle hover:text-ink",
              )}
            >
              {it.current ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 top-0 h-0.5 bg-selected-edge"
                />
              ) : null}
              <span className="relative">
                <Icon name={it.icon} size={22} />
                {typeof it.count === "number" ? (
                  <CountBadge
                    count={it.count}
                    unit={it.countUnit ?? "new"}
                    className="absolute -top-2 left-4"
                  />
                ) : null}
              </span>
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
                  ? "bg-selected-bg font-semibold text-selected-ink"
                  : "font-medium text-ink hover:bg-primary-subtle",
              )}
            >
              {it.current ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1 left-0 w-0.5 bg-selected-edge"
                />
              ) : null}
              <Icon name={it.icon} size={18} />
              <span className="flex-1">{it.label}</span>
              {typeof it.count === "number" ? (
                <CountBadge count={it.count} unit={it.countUnit ?? "new"} />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {footer ? <div className="mt-auto border-t border-border pt-2">{footer}</div> : null}
    </nav>
  );
}
