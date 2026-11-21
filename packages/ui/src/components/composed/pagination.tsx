"use client";

import { useEffect, useId, useLayoutEffect, useRef, type RefObject } from "react";
import { cx } from "../../lib/cx";
import { focusStatic } from "../../lib/focus";
import { useAnnouncer, LiveRegion } from "../../lib/live-region";
import { Button } from "../primitives/button";
import { Select } from "../primitives/select";
import { FieldError } from "../primitives/field";

/* ---------- TablePagination (CD-334) ---------- */

/** "Patients 26 to 50 of 87": the range line and the only status a page change announces. */
export function rangeText(noun: string, start: number, end: number, total: number | null): string {
  if (total === 0) return `No ${noun.toLowerCase()}`;
  const tail = total === null ? "" : ` of ${total}`;
  return `${noun} ${start} to ${end}${tail}`;
}

export interface TablePaginationProps {
  /** Plural noun with a capital, "Patients". The nav is labelled "Pagination of patients". */
  noun: string;
  /** 1-based first and last row shown. */
  start: number;
  end: number;
  total: number | null;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  pageSize: number;
  pageSizes?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  /** Inline error for a failed page load; previous rows stay. */
  error?: string;
  /** Focus target after a page change: the table caption. */
  focusTarget?: RefObject<HTMLElement | null> | (() => HTMLElement | null);
  className?: string;
}

/**
 * Cursor paging for tables a clinician compares rows in. Previous and Next are hidden at the ends, not
 * disabled without a reason; no page numbers (the API cannot jump). A page change keeps sort and filters,
 * moves focus to the table caption and announces the new range; changing rows per page returns to the
 * first page (the caller resets the cursor). One page: no nav, the range line stays.
 */
export function TablePagination({
  noun,
  start,
  end,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  pageSize,
  pageSizes = [25, 50, 100],
  onPageSizeChange,
  loading = false,
  error,
  focusTarget,
  className,
}: TablePaginationProps) {
  const range = rangeText(noun, start, end, total);
  const { message, announce } = useAnnouncer();
  const moved = useRef(false);
  const prevRange = useRef(range);
  useEffect(() => {
    if (range === prevRange.current) return;
    prevRange.current = range;
    if (!moved.current) return;
    moved.current = false;
    announce(range);
    const el = typeof focusTarget === "function" ? focusTarget() : focusTarget?.current;
    focusStatic(el);
  }, [range, announce, focusTarget]);
  const go = (fn: () => void) => () => {
    moved.current = true;
    fn();
  };
  const showNav = hasPrevious || hasNext;
  const sizeId = useId();
  return (
    <div
      className={cx(
        "flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between",
        className,
      )}
    >
      <p className="text-small text-ink-muted tabular-nums">{range}</p>
      <LiveRegion message={message} />
      {error ? <FieldError live>{error}</FieldError> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {showNav ? (
          <nav aria-label={`Pagination of ${noun.toLowerCase()}`} className="flex gap-2">
            {hasPrevious ? (
              <Button
                variant="neutral"
                iconLeft="chevron-left"
                className="flex-1 md:flex-none"
                disabled={loading}
                onClick={go(onPrevious)}
              >
                Previous page
              </Button>
            ) : null}
            {hasNext ? (
              <Button
                variant="neutral"
                iconRight="chevron-right"
                className="flex-1 md:flex-none"
                disabled={loading}
                onClick={go(onNext)}
              >
                Next page
              </Button>
            ) : null}
          </nav>
        ) : null}
        {onPageSizeChange ? (
          <div className="flex items-center gap-2 text-small text-ink-muted">
            <label htmlFor={sizeId} className="whitespace-nowrap">
              Rows per page
            </label>
            <Select
              id={sizeId}
              className="w-24"
              value={String(pageSize)}
              options={pageSizes.map((n) => ({ value: String(n), label: String(n) }))}
              onValueChange={(v) => {
                moved.current = true;
                onPageSizeChange(Number(v));
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- LoadMore (CD-335) ---------- */

export interface LoadMoreProps {
  /** Names what loads and in which direction: "Show more tasks", "Show earlier messages". */
  label: string;
  /** Plural noun for the status line: "tasks" gives "5 more tasks loaded". */
  noun: string;
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
  /** Inline error with retry; items already shown remain. */
  error?: string;
  /** Items currently shown, and the total when known ("Showing 25 of 87"). */
  shown: number;
  total?: number | null;
  /** The list whose children are the items; the first new child takes focus after a load. */
  listRef?: RefObject<HTMLElement | null>;
  /** "End of the list" by default; never a disabled button. */
  endText?: string;
  /** Earlier items load above (messages): the button sits before the list. */
  className?: string;
}

/**
 * The one "show more" control for feeds and task lists (CD-335, CD-530): a secondary medium button,
 * full width below 600 px. After a load, focus moves to the first new item and a polite status says how
 * many arrived; at the end the button is replaced by text.
 */
export function LoadMore({
  label,
  noun,
  onLoadMore,
  hasMore,
  loading = false,
  error,
  shown,
  total = null,
  listRef,
  endText = "End of the list",
  className,
}: LoadMoreProps) {
  const { message, announce } = useAnnouncer();
  const before = useRef<number | null>(null);
  const sawLoading = useRef(false);
  useLayoutEffect(() => {
    const from = before.current;
    if (from === null) return;
    if (loading) {
      sawLoading.current = true;
      return;
    }
    const added = shown - from;
    if (added <= 0) {
      if (sawLoading.current) {
        before.current = null;
        sawLoading.current = false;
      }
      return;
    }
    before.current = null;
    sawLoading.current = false;
    announce(`${added} more ${noun} loaded`);
    const first = listRef?.current?.children[from] as HTMLElement | undefined;
    if (first) {
      const target = first.querySelector<HTMLElement>("a[href], button:not([disabled])") ?? first;
      focusStatic(target);
    }
  }, [loading, shown, noun, announce, listRef]);
  return (
    <div className={cx("flex flex-col items-stretch gap-2 min-[600px]:items-start", className)}>
      {total !== null ? (
        <p className="text-small text-ink-muted tabular-nums">
          Showing {shown} of {total}
        </p>
      ) : null}
      {error ? <FieldError live>{error}</FieldError> : null}
      {hasMore ? (
        <Button
          variant="secondary"
          loading={loading}
          loadingLabel="Loading"
          className="w-full min-[600px]:w-auto"
          onClick={() => {
            before.current = shown;
            sawLoading.current = false;
            onLoadMore();
          }}
        >
          {error ? `Try again: ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label}
        </Button>
      ) : shown > 0 ? (
        <p className="text-small text-ink-muted">{endText}</p>
      ) : null}
      <LiveRegion message={message} />
    </div>
  );
}
