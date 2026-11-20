"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "../lib/cx";

const control =
  "w-full rounded-control border border-border-control bg-surface px-control text-body text-ink placeholder:text-ink-muted " +
  "motion-fast transition-colors hover:border-ink-muted focus-visible:focus-ring " +
  "aria-[invalid=true]:border-2 aria-[invalid=true]:border-error-ink " +
  "read-only:bg-surface-sunken disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, type = "text", ...rest }, ref) {
    return (
      <input ref={ref} type={type} className={cx(control, "h-control", className)} {...rest} />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return (
    <textarea ref={ref} rows={rows} className={cx(control, "min-h-24 py-2", className)} {...rest} />
  );
});
