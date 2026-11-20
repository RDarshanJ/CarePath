import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx } from "../lib/cx";
import { Icon } from "./icons";

/** Scroll container with an accessible name and a required caption. Rows are 36 px in the clinician theme. */
export function Table({
  caption,
  children,
  className,
}: {
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cx(
        "overflow-x-auto rounded-container border border-border bg-surface focus-visible:focus-ring",
        className,
      )}
    >
      <table className="w-full border-collapse text-table tabular-nums">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-surface-sunken" {...p} />
);
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;

export function Tr({
  selected,
  className,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cx(
        "h-row border-b border-border last:border-b-0 hover:bg-surface-sunken [&>:first-child]:border-l-2",
        selected
          ? "bg-primary-subtle hover:bg-primary-subtle [&>:first-child]:border-primary"
          : "[&>:first-child]:border-transparent",
        className,
      )}
      {...rest}
    />
  );
}

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  sort?: "ascending" | "descending" | "none";
  onSort?: () => void;
}

export function Th({ numeric, sort, onSort, className, children, ...rest }: ThProps) {
  const icon =
    sort === "ascending" ? "arrow-up" : sort === "descending" ? "arrow-down" : "arrows-sort";
  return (
    <th
      scope="col"
      aria-sort={sort}
      className={cx(
        "px-3 py-1.5 text-left text-label font-semibold whitespace-nowrap text-ink",
        numeric && "text-right",
        className,
      )}
      {...rest}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className={cx(
            "inline-flex items-center gap-1 rounded-control font-semibold focus-visible:focus-ring",
            numeric && "flex-row-reverse",
          )}
        >
          {children}
          <Icon
            name={icon}
            size={14}
            className={sort === "none" || !sort ? "text-ink-muted" : "text-ink"}
          />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Td({
  numeric,
  mono,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean; mono?: boolean }) {
  return (
    <td
      className={cx(
        "px-3 py-1 align-middle whitespace-nowrap",
        numeric && "text-right tabular-nums",
        mono && "font-mono",
        className,
      )}
      {...rest}
    />
  );
}
