"use client";

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "../../lib/cx";

export const controlClasses =
  "w-full rounded-control border border-border-control bg-surface px-control text-body text-ink placeholder:text-ink-subtle " +
  "motion-fast transition-colors hover:border-ink-muted focus-visible:focus-ring " +
  "aria-[invalid=true]:border-2 aria-[invalid=true]:border-error-ink " +
  "read-only:bg-surface-sunken disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Visible unit after the value ("reps", "seconds", "kg"), inside the same row (CD-110). It is added to
   * the accessible description so the unit is read with the value.
   */
  unit?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, type = "text", unit, ...rest },
  ref,
) {
  const unitId = useId();
  const input = (
    <input
      ref={ref}
      type={type}
      className={cx(controlClasses, "h-control", unit && "min-w-0 flex-1", className)}
      {...rest}
      {...(unit
        ? {
            "aria-describedby":
              [rest["aria-describedby"], unitId].filter(Boolean).join(" ") || undefined,
          }
        : {})}
    />
  );
  if (!unit) return input;
  return (
    <span className="flex w-full items-center gap-2">
      {input}
      <span id={unitId} className="shrink-0 text-body text-ink-muted">
        {unit}
      </span>
    </span>
  );
});

/** Multi-line text. Resizes vertically only; 4 rows by default (CD-531). */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cx(controlClasses, "min-h-24 resize-y py-2", className)}
      {...rest}
    />
  );
});
