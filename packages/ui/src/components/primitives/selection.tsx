"use client";

import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import * as R from "@radix-ui/react-radio-group";
import { cx } from "../../lib/cx";
import { Icon } from "./icons";
import { RequirementWord, type Requirement } from "./field";

/*
 * Selection controls that are not plain radios or checkboxes. Selected state everywhere: the
 * `selected-bg` fill, `selected-ink` text and a check mark, never fill alone (design-tokens section 3).
 */

const chipBase =
  "inline-flex min-h-target items-center justify-center gap-1.5 rounded-control border px-control text-label font-medium motion-fast transition-colors";

/* ---------- SegmentedControl (CD-532) ---------- */

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Two or three exclusive options that change a list at once. Built as a radio group, so it is one tab
 * stop and the arrow keys move and select. More than three options: use Select.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  hideLabel = false,
  className,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <span id={id} className={cx("text-label font-medium text-ink", hideLabel && "sr-only")}>
        {label}
      </span>
      <R.Root
        aria-labelledby={id}
        orientation="horizontal"
        value={value}
        onValueChange={(v) => onValueChange(v as T)}
        className="inline-flex w-fit max-w-full flex-wrap rounded-control border border-border-control bg-surface p-0.5"
      >
        {options.map((o) => (
          <R.Item
            key={o.value}
            value={o.value}
            className={cx(
              "group relative inline-flex min-h-target items-center gap-1.5 rounded-control px-control text-label font-medium text-ink motion-fast transition-colors",
              "hover:bg-primary-subtle focus-visible:focus-ring",
              "data-[state=checked]:bg-selected-bg data-[state=checked]:font-semibold data-[state=checked]:text-selected-ink",
            )}
          >
            <Icon
              name="check"
              size={16}
              className="hidden shrink-0 group-data-[state=checked]:inline"
            />
            {o.label}
            <span
              aria-hidden="true"
              className="absolute inset-x-2 bottom-0 hidden h-0.5 bg-selected-edge group-data-[state=checked]:block"
            />
          </R.Item>
        ))}
      </R.Root>
    </div>
  );
}

/* ---------- ToggleChip (CD-311, CD-534) ---------- */

/**
 * A group of independent on and off filters (booking days and times of day), in a fieldset with a
 * legend. Each chip is a toggle button with `aria-pressed` (CD-311); its state shows as fill plus a
 * check mark, not colour alone. CD-534 proposed a styled checkbox instead; the toggle button keeps the
 * behaviour the booking specs assert and is recorded as a deviation for the advisor.
 */
export function ToggleChipGroup({
  legend,
  requirement,
  hint,
  hideLegend,
  children,
  className,
}: {
  legend: string;
  requirement?: Requirement;
  hint?: string;
  hideLegend?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <fieldset
      aria-describedby={hint ? `${id}-hint` : undefined}
      className={cx("flex min-w-0 flex-col gap-2 border-0 p-0", className)}
    >
      <legend className={cx("mb-1 text-label font-medium text-ink", hideLegend && "sr-only")}>
        {legend}
        {requirement ? (
          <>
            {" "}
            <RequirementWord requirement={requirement} />
          </>
        ) : null}
      </legend>
      {hint ? (
        <p id={`${id}-hint`} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </fieldset>
  );
}

export interface ToggleChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onChange"
> {
  /** Full words, the accessible name ("Monday"). */
  label: string;
  /** Visible short form ("Mon"); the name still starts with it, so speech input works. */
  shortLabel?: string;
  /** Extra words for screen readers ("8 AM to noon"). */
  description?: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}

export const ToggleChip = forwardRef<HTMLButtonElement, ToggleChipProps>(function ToggleChip(
  { label, shortLabel, description, pressed, onPressedChange, className, onClick, ...rest },
  ref,
) {
  return (
    <li>
      <button
        ref={ref}
        type="button"
        aria-pressed={pressed}
        onClick={(e) => {
          onPressedChange(!pressed);
          onClick?.(e);
        }}
        className={cx(
          chipBase,
          "min-w-14 focus-visible:focus-ring",
          "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink",
          pressed
            ? "border-selected-edge bg-selected-bg text-selected-ink"
            : "border-border-control bg-surface text-ink hover:bg-primary-subtle",
          className,
        )}
        {...rest}
      >
        {pressed ? <Icon name="check" size={16} className="shrink-0" /> : null}
        {shortLabel ? (
          <>
            <span aria-hidden="true">{shortLabel}</span>
            <span className="sr-only">{label}</span>
          </>
        ) : (
          label
        )}
        {description ? <span className="sr-only"> ({description})</span> : null}
      </button>
    </li>
  );
});

/* ---------- SlotButton (CD-311) ---------- */

export interface SlotButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The visible time ("9:00 AM"). The zone is in the list heading. */
  time: string;
  /** Full date and time for the accessible name ("Friday, November 20, 9:00 AM"). */
  fullLabel: string;
  /** The slot chosen earlier, shown again after Back: says "Selected" in words. */
  selected?: boolean;
}

/**
 * A time slot. Choosing one is an action that moves the booking on, so it is a button, not a radio.
 * Times never truncate. Disabled only while a request is in flight, with the reason in the status text
 * around the list.
 */
export const SlotButton = forwardRef<HTMLButtonElement, SlotButtonProps>(function SlotButton(
  { time, fullLabel, selected = false, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      // The name contains the visible text "9:00 AM Selected" (WCAG 2.5.3): no comma before "selected" here, and a space before "Selected" in the markup. Found by axe in Storybook.
      aria-label={selected ? `${fullLabel} selected` : fullLabel}
      className={cx(
        chipBase,
        "tabular-nums whitespace-nowrap focus-visible:focus-ring active:scale-98",
        "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink",
        selected
          ? "border-selected-edge bg-selected-bg text-selected-ink"
          : "border-secondary-border bg-surface text-link hover:bg-secondary-hover-bg active:bg-selected-bg",
        className,
      )}
      {...rest}
    >
      {selected ? <Icon name="check" size={16} className="shrink-0" /> : null}
      <span>{time}</span>
      {selected ? <span className="text-small font-semibold"> Selected</span> : null}
    </button>
  );
});
