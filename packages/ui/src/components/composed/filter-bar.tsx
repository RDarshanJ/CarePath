"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cx } from "../../lib/cx";
import { isSearchShortcut } from "../../lib/keyboard";
import { Button, IconButton } from "../primitives/button";
import { Icon } from "../primitives/icons";
import { controlClasses } from "../primitives/inputs";

/*
 * Filter bar (CD-331, CD-532, CD-342, CD-343). A `form` with `role="search"` and a name: the search
 * field first, one labelled control per filter, a result-count status line, and "Clear filters" only
 * when something is active. Controls apply at once (no Apply button); typing applies after a short
 * pause. Filters and sort belong in the URL; the search text never does (DR-002 R2), so the screen keeps
 * it in memory. Below 768 px the fields stack; with more than two filters they sit in a "Filters" panel
 * that opens inline, not as an overlay.
 */

export function FilterBar({
  label,
  children,
  resultText,
  activeCount = 0,
  onClear,
  className,
}: {
  /** Accessible name of the search landmark: "Search and filter patients". */
  label: string;
  children: ReactNode;
  /** "12 patients", "No patients match": a polite status line. */
  resultText?: string;
  activeCount?: number;
  /** Resets filters and search, keeps the sort; the caller moves focus to the search field. */
  onClear?: () => void;
  className?: string;
}) {
  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={(e: FormEvent) => e.preventDefault()}
      className={cx("flex flex-col gap-3", className)}
    >
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">{children}</div>
      {resultText !== undefined || (activeCount > 0 && onClear) ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {resultText !== undefined ? (
            <p role="status" className="text-small text-ink-muted tabular-nums">
              {resultText}
            </p>
          ) : null}
          {activeCount > 0 && onClear ? (
            <Button variant="quiet" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

/** A labelled filter control. The label is always visible; the default is stated in the control. */
export function FilterField({
  label,
  id: fixedId,
  children,
  className,
}: {
  label: string;
  /** Fixed control id; pass it to the control when children is a node. */
  id?: string;
  children: ReactNode | ((control: { id: string }) => ReactNode);
  className?: string;
}) {
  const auto = useId();
  const id = fixedId ?? auto;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1 md:w-56", className)}>
      <label htmlFor={id} className="text-label font-medium text-ink">
        {label}
      </label>
      {typeof children === "function" ? children({ id }) : children}
    </div>
  );
}

/**
 * Search with a visible label (CD-342). The placeholder may hold an example ("Name or MRN"), never the
 * label. Changes are passed on after `debounceMs`; Enter passes them at once. "/" focuses it when
 * `shortcut` is set (and the hint says so). A clear button appears when there is text.
 */
export function SearchField({
  label,
  value,
  onSearch,
  placeholder,
  hint,
  shortcut = false,
  debounceMs = 300,
  inputRef,
  className,
}: {
  label: string;
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  hint?: string;
  shortcut?: boolean;
  debounceMs?: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  const id = useId();
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  const [text, setText] = useState(value);
  const latest = useRef(onSearch);
  latest.current = onSearch;
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => latest.current(text), debounceMs);
    return () => clearTimeout(t);
  }, [text, value, debounceMs]);
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (isSearchShortcut({ ...e, target: e.target as HTMLElement | null })) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut, ref]);
  const hintText = hint ?? (shortcut ? "Press / to search." : undefined);
  return (
    <div className={cx("flex min-w-0 flex-col gap-1 md:w-80", className)}>
      <label htmlFor={id} className="text-label font-medium text-ink">
        {label}
      </label>
      {hintText ? (
        <p id={`${id}-hint`} className="text-small text-ink-muted">
          {hintText}
        </p>
      ) : null}
      <div className="relative flex items-center">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute left-2.5 text-ink-muted"
        />
        <input
          ref={ref}
          id={id}
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={text}
          placeholder={placeholder}
          aria-describedby={hintText ? `${id}-hint` : undefined}
          onChange={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              latest.current(text);
            }
          }}
          className={cx(
            controlClasses,
            "h-control pr-10 pl-9 [&::-webkit-search-cancel-button]:hidden",
          )}
        />
        {text ? (
          <IconButton
            label="Clear search"
            icon="x"
            size="sm"
            tooltip={false}
            className="absolute right-1"
            onClick={() => {
              setText("");
              latest.current("");
              ref.current?.focus();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The "Filters" disclosure: the button names how many are active ("Filters, 2 active"); the panel opens
 * inline; Escape inside it closes it and returns focus to the button.
 */
export function FilterPanel({
  activeCount,
  children,
  defaultOpen,
}: {
  activeCount: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen ?? activeCount > 0);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        ref={button}
        variant="neutral"
        iconLeft="filter"
        iconRight={open ? "chevron-up" : "chevron-down"}
        aria-expanded={open}
        aria-controls={id}
        className="self-start"
        onClick={() => setOpen((o) => !o)}
      >
        Filters{activeCount > 0 ? `, ${activeCount} active` : ""}
      </Button>
      <div
        id={id}
        hidden={!open}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            button.current?.focus();
          }
        }}
        className="flex flex-col gap-3 rounded-container border border-border bg-surface-sunken p-3 md:flex-row md:flex-wrap md:items-end"
      >
        {children}
      </div>
    </div>
  );
}

export interface ActiveFilter {
  id: string;
  /** "Status: Active". */
  label: string;
  onRemove: () => void;
}

/** Removable chips for applied filters, in a labelled list. Focus moves to the next chip on removal. */
export function ActiveFilterChips({
  filters,
  onClear,
}: {
  filters: readonly ActiveFilter[];
  onClear?: () => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  const clear = useRef<HTMLButtonElement>(null);
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul ref={list} aria-label="Active filters" className="flex flex-wrap gap-2">
        {filters.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              aria-label={`Remove filter ${f.label}`}
              onClick={() => {
                f.onRemove();
                requestAnimationFrame(() => {
                  const buttons = list.current?.querySelectorAll("button");
                  const next = buttons?.[Math.min(i, (buttons?.length ?? 1) - 1)];
                  (next ?? clear.current)?.focus();
                });
              }}
              className="inline-flex min-h-target items-center gap-1.5 rounded-control border border-border-control bg-surface px-2.5 text-label text-ink hover:bg-primary-subtle focus-visible:focus-ring"
            >
              {f.label}
              <Icon name="x" size={14} />
            </button>
          </li>
        ))}
      </ul>
      {onClear ? (
        <Button ref={clear} variant="quiet" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
