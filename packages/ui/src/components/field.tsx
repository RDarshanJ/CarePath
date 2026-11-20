import { useId, type ReactNode } from "react";
import { cx } from "../lib/cx";
import { Icon } from "./icons";

export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
}

export interface FieldProps {
  label: string;
  /** Required versus optional is always said in words (interaction principle 3). */
  requirement: "required" | "optional";
  /** Why this is collected and who sees it (interaction principle 2). */
  why?: string;
  hint?: string;
  /** Error text: what is wrong and what to do. Shown with an icon, never colour alone. */
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

export function Field({ label, requirement, why, hint, error, className, children }: FieldProps) {
  const id = useId();
  const whyId = `${id}-why`;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy =
    [why ? whyId : null, hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label font-medium text-ink">
        {label}{" "}
        <span className="font-normal text-ink-muted">
          ({requirement === "required" ? "required" : "optional"})
        </span>
      </label>
      {why ? (
        <p id={whyId} className="text-small text-ink-muted max-w-measure">
          {why}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": requirement === "required" ? true : undefined,
      })}
      {error ? (
        <p id={errId} className="flex items-start gap-1.5 text-small font-medium text-error-ink">
          <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="sr-only">Error: </span>
            {error}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Group wrapper for radios and checkboxes: fieldset with a legend, same word-based requirement label. */
export function FieldGroup({
  legend,
  requirement,
  hint,
  error,
  children,
  className,
}: {
  legend: string;
  requirement: "required" | "optional";
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cx("flex flex-col gap-2 border-0 p-0", className)}>
      <legend className="mb-1 text-label font-medium text-ink">
        {legend} <span className="font-normal text-ink-muted">({requirement})</span>
      </legend>
      {hint ? <p className="text-small text-ink-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-small font-medium text-error-ink">
          <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
          <span>
            <span className="sr-only">Error: </span>
            {error}
          </span>
        </p>
      ) : null}
    </fieldset>
  );
}
