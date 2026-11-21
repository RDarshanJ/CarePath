import { useId, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { remainingCharacters } from "../../lib/forms";
import { Icon } from "./icons";

/**
 * The one inline error (CD-531, CD-441): icon, a visually hidden "Error:" prefix and the message. Used by
 * `Field` and `FieldGroup`, and on its own where an error belongs to something that is not a single
 * field (a dialog row, a pain scale, a list row). `live` makes it `role="alert"` for an error that
 * appears without a submit and without moving focus.
 */
export function FieldError({
  id,
  children,
  live = false,
  className,
}: {
  id?: string;
  children: ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <p
      id={id}
      role={live ? "alert" : undefined}
      className={cx("flex items-start gap-1.5 text-small font-medium text-error-ink", className)}
    >
      <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
      <span>
        <span className="sr-only">Error: </span>
        {children}
      </span>
    </p>
  );
}

export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
}

export type Requirement = "required" | "optional";

/** "(required)" or "(optional)" in words, never inside the label string (CD-531). */
export function RequirementWord({ requirement }: { requirement: Requirement }) {
  return <span className="font-normal text-ink-muted">({requirement})</span>;
}

export interface FieldProps {
  label: string;
  /** Required versus optional is always said in words. */
  requirement: Requirement;
  /** Why this is collected and who sees it (patient and clinical fields). */
  why?: string;
  /** Format or example. Never put these in the placeholder. */
  hint?: string;
  /** What is wrong and how to fix it, repeating the field's wording. */
  error?: string;
  /** Use a fixed id for the control, so an ErrorSummary can link to it. */
  id?: string;
  /** Counted fields: the characters-left line appears near the limit and is announced politely. */
  count?: { length: number; max: number };
  /** Visually hide the label (only where the same words are visible next to the control). */
  hideLabel?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * The only label, hint and error wrapper (CD-531). Order: label, why, hint, error, control (the error
 * sits above the input, as GOV.UK places it); `aria-describedby` lists why, hint, then error.
 */
export function Field({
  label,
  requirement,
  why,
  hint,
  error,
  id: fixedId,
  count,
  hideLabel,
  className,
  children,
}: FieldProps) {
  const auto = useId();
  const id = fixedId ?? auto;
  const whyId = `${id}-why`;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const countId = `${id}-count`;
  const counter = count ? remainingCharacters(count.length, count.max) : null;
  const describedBy =
    [why ? whyId : null, hint ? hintId : null, error ? errId : null, counter?.show ? countId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cx("text-label font-medium text-ink", hideLabel && "sr-only")}>
        {label} <RequirementWord requirement={requirement} />
      </label>
      {why ? (
        <p id={whyId} className="max-w-measure text-small text-ink-muted">
          {why}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="max-w-measure text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errId}>{error}</FieldError> : null}
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": requirement === "required" ? true : undefined,
      })}
      {counter ? (
        <p
          id={countId}
          aria-live="polite"
          className={cx(
            "text-small",
            counter.over ? "font-medium text-error-ink" : "text-ink-muted",
            !counter.show && "sr-only",
          )}
        >
          {counter.show ? counter.text : ""}
        </p>
      ) : null}
    </div>
  );
}

/** Radios and checkboxes: a fieldset with a legend and the same requirement word. */
export function FieldGroup({
  legend,
  requirement,
  hint,
  error,
  id: fixedId,
  liveError = false,
  hideLegend,
  children,
  className,
}: {
  legend: string;
  requirement: Requirement;
  hint?: string;
  error?: string;
  /** Prefix for the hint and error ids (`<id>-hint`, `<id>-err`). */
  id?: string;
  /** Announce the error as it appears (for groups that validate without a submit). */
  liveError?: boolean;
  hideLegend?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const auto = useId();
  const id = fixedId ?? auto;
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset
      id={fixedId}
      aria-describedby={describedBy}
      className={cx("flex min-w-0 flex-col gap-2 border-0 p-0", className)}
    >
      <legend className={cx("mb-1 text-label font-medium text-ink", hideLegend && "sr-only")}>
        {legend} <RequirementWord requirement={requirement} />
      </legend>
      {hint ? (
        <p id={`${id}-hint`} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <FieldError id={`${id}-err`} live={liveError}>
          {error}
        </FieldError>
      ) : null}
      {children}
    </fieldset>
  );
}
