"use client";

import { useId, useState } from "react";
import { cx } from "../../lib/cx";
import {
  MONTH_NAMES,
  checkDateOfBirth,
  type DatePart,
  type DateParts,
} from "../../lib/date-of-birth";
import { FieldError, RequirementWord, type Requirement } from "../primitives/field";
import { controlClasses } from "../primitives/inputs";

export interface DateOfBirthFieldProps {
  legend?: string;
  requirement?: Requirement;
  /** "For example, 18 10 1962" unless clinical copy review says otherwise. */
  hint?: string;
  /** Why it is asked: "The clinic uses it to match you to your record." */
  why?: string;
  value: DateParts;
  onChange: (parts: DateParts) => void;
  /** Called on blur of the whole group with the checked value (`YYYY-MM-DD`) or null. */
  onCheck?: (value: string | null, error: string | null) => void;
  /** Today in the clinic zone, `YYYY-MM-DD`, for the "in the past" rule. */
  today: string;
  /** Error from the form (submit): overrides the blur check. */
  error?: string;
  /** Which parts the form's error is about; all three when omitted. */
  errorParts?: DatePart[];
  /** Id prefix: the inputs are `<id>-day`, `<id>-month`, `<id>-year` (link the summary to `<id>-day`). */
  id?: string;
  className?: string;
}

/**
 * Date of birth as three parts (CD-102): day text, month names in a native select, year text, in a
 * fieldset with a legend and hint. Birth-date autocomplete tokens; numeric keyboard for day and year;
 * no auto-advance; validated on blur of the group and on submit; entered parts are never cleared.
 * Stays on one row at 320 px and wraps at large text.
 */
export function DateOfBirthField({
  legend = "Date of birth",
  requirement = "required",
  hint = "For example, 18 10 1962",
  why,
  value,
  onChange,
  onCheck,
  today,
  error: formError,
  errorParts,
  id: fixedId,
  className,
}: DateOfBirthFieldProps) {
  const auto = useId();
  const id = fixedId ?? auto;
  const [blurCheck, setBlurCheck] = useState<{ error: string; parts: DatePart[] } | null>(null);
  const error = formError ?? blurCheck?.error;
  const parts = formError ? (errorParts ?? ["day", "month", "year"]) : (blurCheck?.parts ?? []);
  const describedBy =
    [why ? `${id}-why` : null, hint ? `${id}-hint` : null, error ? `${id}-err` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const set = (part: DatePart, v: string) => {
    const next = { ...value, [part]: v };
    onChange(next);
    if (blurCheck) {
      const c = checkDateOfBirth(next, today, legend);
      setBlurCheck(c.error ? { error: c.error, parts: c.parts } : null);
    }
  };
  const invalid = (p: DatePart) => (error && parts.includes(p) ? true : undefined);
  const inputClass = cx(controlClasses.replace("w-full ", ""), "h-control");
  return (
    <fieldset
      aria-describedby={describedBy}
      className={cx("flex min-w-0 flex-col gap-1.5 border-0 p-0", className)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (!value.day && !value.month && !value.year) return;
        const c = checkDateOfBirth(value, today, legend);
        setBlurCheck(c.error ? { error: c.error, parts: c.parts } : null);
        onCheck?.(c.value, c.error);
      }}
    >
      <legend className="mb-1 text-label font-medium text-ink">
        {legend} <RequirementWord requirement={requirement} />
      </legend>
      {why ? (
        <p id={`${id}-why`} className="max-w-measure text-small text-ink-muted">
          {why}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-err`}>{error}</FieldError> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-day`} className="text-small font-medium text-ink">
            Day
          </label>
          <input
            id={`${id}-day`}
            type="text"
            inputMode="numeric"
            autoComplete="bday-day"
            maxLength={2}
            value={value.day}
            aria-invalid={invalid("day")}
            onChange={(e) => set("day", e.currentTarget.value)}
            className={cx(inputClass, "w-16")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-month`} className="text-small font-medium text-ink">
            Month
          </label>
          <select
            id={`${id}-month`}
            autoComplete="bday-month"
            value={value.month}
            aria-invalid={invalid("month")}
            onChange={(e) => set("month", e.currentTarget.value)}
            className={cx(inputClass, "w-40")}
          >
            <option value="">Choose month</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-year`} className="text-small font-medium text-ink">
            Year
          </label>
          <input
            id={`${id}-year`}
            type="text"
            inputMode="numeric"
            autoComplete="bday-year"
            maxLength={4}
            value={value.year}
            aria-invalid={invalid("year")}
            onChange={(e) => set("year", e.currentTarget.value)}
            className={cx(inputClass, "w-24")}
          />
        </div>
      </div>
    </fieldset>
  );
}
