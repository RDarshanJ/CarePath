import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx } from "../../lib/cx";
import { Icon } from "../primitives/icons";

/*
 * Tables (CD-338 to CD-340). A native table with a caption, `th scope` and one header row (`Tr header`);
 * not a grid. Each row has at most a primary link in the first cell and a menu button; a whole-row
 * click is a pointer convenience only where that link exists. Long values wrap (two lines in dense
 * cells); `title` tooltips are not used for information.
 */

export function Table({
  caption,
  captionHelp,
  showCaption = false,
  children,
  className,
  captionId,
  busy = false,
}: {
  /** Accessible name. Also the focus target after a page change (TablePagination). */
  caption: string;
  /** Keyboard note or default sort ("Sorted by last activity, newest first."), visible. */
  captionHelp?: string;
  showCaption?: boolean;
  children: ReactNode;
  className?: string;
  captionId?: string;
  /** Refetch in progress: previous rows stay, marked busy. */
  busy?: boolean;
}) {
  return (
    <div
      role="region"
      aria-label={caption}
      aria-busy={busy || undefined}
      tabIndex={0}
      className={cx(
        "relative overflow-x-auto rounded-container border border-border bg-surface focus-visible:focus-ring",
        busy && "opacity-70",
        className,
      )}
    >
      <table className="w-full border-collapse text-table tabular-nums">
        <caption
          id={captionId}
          tabIndex={-1}
          className={cx(
            showCaption || captionHelp ? "px-3 pt-3 pb-2 text-left" : "sr-only",
            "focus:outline-none",
          )}
        >
          <span className={cx(showCaption ? "text-label font-semibold text-ink" : "sr-only")}>
            {caption}
          </span>
          {captionHelp ? (
            <span className="block text-small font-normal text-ink-muted">{captionHelp}</span>
          ) : null}
        </caption>
        {children}
      </table>
    </div>
  );
}

export const THead = ({ className, ...p }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cx("bg-surface-sunken", className)} {...p} />
);
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;

/**
 * A row. `header` for the one header row (no hover, no edge). Selected: `selected-bg` plus the
 * `selected-edge` bar on the first cell, with `aria-selected`; hover: `primary-subtle` only when the row
 * responds to a pointer (`interactive`).
 */
export function Tr({
  selected,
  header,
  interactive,
  className,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & {
  selected?: boolean;
  header?: boolean;
  interactive?: boolean;
}) {
  if (header) {
    return <tr className={cx("border-b border-border", className)} {...rest} />;
  }
  const clickable = interactive ?? typeof rest.onClick === "function";
  return (
    <tr
      aria-selected={selected || undefined}
      className={cx(
        "h-row border-b border-border last:border-b-0 [&>:first-child]:border-l-2",
        clickable && "cursor-pointer hover:bg-primary-subtle",
        selected
          ? "bg-selected-bg hover:bg-selected-bg [&>:first-child]:border-selected-edge"
          : "[&>:first-child]:border-transparent",
        className,
      )}
      {...rest}
    />
  );
}

export type SortDirection = "ascending" | "descending" | "none";

export interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  /** Only API-sortable columns get a sort button; other headers are plain text (CD-340). */
  sort?: SortDirection;
  onSort?: () => void;
  /** Spoken direction words, for example "newest first". */
  sortWords?: { ascending: string; descending: string };
}

/** Accessible name of a sortable header button. */
export function sortButtonLabel(
  label: string,
  sort: SortDirection | undefined,
  words: { ascending: string; descending: string } = {
    ascending: "ascending",
    descending: "descending",
  },
): string {
  if (!sort || sort === "none") return `${label}, sortable`;
  return `${label}, sortable, currently sorted ${words[sort]}`;
}

export function Th({ numeric, sort, onSort, sortWords, className, children, ...rest }: ThProps) {
  const icon =
    sort === "ascending" ? "arrow-up" : sort === "descending" ? "arrow-down" : "arrows-sort";
  return (
    <th
      scope="col"
      aria-sort={onSort && sort && sort !== "none" ? sort : undefined}
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
          aria-label={
            typeof children === "string" ? sortButtonLabel(children, sort, sortWords) : undefined
          }
          className={cx(
            "inline-flex min-h-target items-center gap-1 rounded-control font-semibold hover:text-link focus-visible:focus-ring",
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
  wrap = false,
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & {
  numeric?: boolean;
  /** Identifiers only (MRN, record ids). */
  mono?: boolean;
  /** Long text: wraps up to two lines; the full value is in the detail view (CD-341). */
  wrap?: boolean;
}) {
  return (
    <td
      className={cx(
        // Links and name buttons in a cell get a 24 px minimum hit height; the 36 px row is unchanged
        // (DR-004 U5).
        "px-3 py-1 align-middle [&_a[href]]:inline-flex [&_a[href]]:min-h-6 [&_a[href]]:items-center [&_button]:min-h-6",
        wrap ? "max-w-80 whitespace-normal" : "whitespace-nowrap",
        numeric && "text-right tabular-nums",
        mono && "font-mono",
        className,
      )}
      {...rest}
    >
      {wrap ? <div className="line-clamp-2">{children}</div> : children}
    </td>
  );
}
