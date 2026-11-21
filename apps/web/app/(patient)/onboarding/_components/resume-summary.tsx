"use client";

import { intakeSteps, type IntakeStep } from "@carepath/shared/contracts";
import { Button, Icon } from "@carepath/ui";
import { stepNumber, stepTitles } from "../_lib/onboarding";
import { ChangeButton } from "./steps";

/**
 * The resume summary for a returning patient (A1, the checklist used only here): where they are, what is
 * saved, and one way on. Statuses are words, never colour alone. Each saved step has a Change button.
 */
export function ResumeSummary({
  completed,
  next,
  busy,
  onContinue,
  onChange,
}: {
  completed: ReadonlySet<IntakeStep>;
  next: IntakeStep;
  busy: boolean;
  onContinue: () => void;
  onChange: (step: IntakeStep) => void;
}) {
  return (
    <>
      <ol
        aria-label="Your steps"
        className="flex flex-col divide-y divide-border border-y border-border"
      >
        <Row number="1 and 2" title="Your account" status="Done" />
        {intakeSteps.map((step) => {
          const done = completed.has(step);
          const status = done ? "Done" : step === next ? "Next" : "Not started";
          return (
            <Row
              key={step}
              number={String(stepNumber(step))}
              title={stepTitles[step].title}
              status={status}
              action={
                done && step !== "review" ? (
                  <ChangeButton label={stepTitles[step].title} onClick={() => onChange(step)} />
                ) : null
              }
            />
          );
        })}
      </ol>
      <div className="flex">
        <Button
          type="button"
          loading={busy}
          loadingLabel="Opening"
          onClick={onContinue}
          fullWidthOnPhone
        >
          Continue
        </Button>
      </div>
    </>
  );
}

function Row({
  number,
  title,
  status,
  action,
}: {
  number: string;
  title: string;
  status: "Done" | "Next" | "Not started";
  action?: React.ReactNode;
}) {
  return (
    <li className="flex min-h-target items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-body font-medium">
          <span className="sr-only">Step </span>
          {number}. {title}
        </span>
        <span className="flex items-center gap-1.5 text-small text-ink-muted">
          {status === "Done" ? (
            <Icon name="check-circle" size={16} className="shrink-0 text-success-ink" />
          ) : null}
          {status}
        </span>
      </div>
      {action}
    </li>
  );
}
