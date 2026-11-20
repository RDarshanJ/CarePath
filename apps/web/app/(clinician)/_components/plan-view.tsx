"use client";

import type { CarePlanView } from "@carepath/shared/contracts";
import { Muted, StatusChip, Tag } from "@carepath/ui";
import { doseText, formatDate, formatLocalDate, plural, scheduleText } from "../_lib/format";
import { useClinician } from "../_lib/context";

/**
 * The patient-facing plan exactly as the API serializes it (the same serializer serves the
 * patient's own plan, REQ-PLN-05). Shown to clinicians for the current plan, a past version and
 * the draft preview.
 */
export function PlanView({ plan }: { plan: CarePlanView }) {
  const { timezone } = useClinician();
  const diff = plan.diffFromPrevious;
  return (
    <article
      aria-label={`${plan.title}, version ${plan.version.number}`}
      className="flex flex-col gap-4"
    >
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-h3 font-semibold text-ink">{plan.title}</h3>
          {plan.preview ? (
            <StatusChip tone="info" icon="info">
              Preview, not published
            </StatusChip>
          ) : plan.version.isCurrent ? (
            <StatusChip tone="success">Current version</StatusChip>
          ) : (
            <Tag>Earlier version</Tag>
          )}
        </div>
        <p className="text-small text-ink-muted">
          Version {plan.version.number}
          {plan.version.publishedAt
            ? `, published ${formatDate(plan.version.publishedAt, timezone)} by ${plan.version.publishedBy.name}`
            : ", unpublished"}
        </p>
      </header>

      {plan.version.changeNoteForPatient ? (
        <div className="rounded-container border border-border bg-surface-sunken p-3">
          <p className="text-label font-semibold text-ink">Note to the patient</p>
          <p className="mt-1 max-w-3xl text-body text-ink">{plan.version.changeNoteForPatient}</p>
        </div>
      ) : null}

      {diff ? (
        <div className="rounded-container border border-border p-3">
          <p className="text-label font-semibold text-ink">
            Changes from version {diff.previousVersionNumber}
          </p>
          {diff.added.length + diff.removed.length + diff.changed.length === 0 ? (
            <p className="mt-1 text-small text-ink-muted">No exercise changes.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-0.5 text-body">
              {diff.added.map((e) => (
                <li key={`a${e.exerciseId}`}>Added: {e.name}</li>
              ))}
              {diff.removed.map((e) => (
                <li key={`r${e.exerciseId}`}>Removed: {e.name}</li>
              ))}
              {diff.changed.map((e) => (
                <li key={`c${e.exerciseId}`}>
                  Changed: {e.name} <Muted>({e.fields.join(", ")})</Muted>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {plan.instructions ? (
        <div>
          <p className="text-label font-semibold text-ink">Plan instructions</p>
          <p className="mt-1 max-w-3xl whitespace-pre-line text-body text-ink">
            {plan.instructions}
          </p>
        </div>
      ) : null}

      <div>
        <h4 className="text-label font-semibold text-ink">
          Exercises{" "}
          <span className="font-normal text-ink-muted">
            {plural(plan.items.length, "exercise")}
          </span>
        </h4>
        <ol className="mt-2 flex flex-col divide-y divide-border rounded-container border border-border">
          {plan.items.map((item, i) => (
            <li key={`${item.exercise.id}`} className="flex flex-col gap-1 p-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-label font-semibold text-ink">
                  {i + 1}. {item.exercise.name}
                </span>
                <Muted className="text-small">
                  {item.exercise.bodyArea}, {item.exercise.category}
                </Muted>
              </div>
              <p className="text-body text-ink">
                <span className="font-medium">Set by your care team:</span> {doseText(item.dose)}
              </p>
              <p className="text-body text-ink">
                <span className="font-medium">Set by your care team:</span>{" "}
                {scheduleText(item.schedule.daysOfWeek, item.schedule.timesPerDay)}
              </p>
              {item.clinicianInstructions ? (
                <p className="text-body text-ink">
                  <span className="font-medium">From your therapist:</span>{" "}
                  {item.clinicianInstructions}
                </p>
              ) : null}
              <p className="max-w-3xl text-small text-ink-muted">{item.exercise.description}</p>
            </li>
          ))}
        </ol>
      </div>

      {plan.goals.length > 0 ? (
        <div>
          <h4 className="text-label font-semibold text-ink">Goals</h4>
          <ul className="mt-1 flex flex-col gap-1 text-body">
            {plan.goals.map((g, i) => (
              <li key={g.id ?? i}>
                {g.description}
                {g.targetValue !== null ? (
                  <Muted>
                    {" "}
                    (target {g.targetValue}
                    {g.targetUnit ? ` ${g.targetUnit}` : ""}
                    {g.dueDate ? `, by ${formatLocalDate(g.dueDate, true)}` : ""})
                  </Muted>
                ) : g.dueDate ? (
                  <Muted> (by {formatLocalDate(g.dueDate, true)})</Muted>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-small text-ink-muted">{plan.contentNotice}</p>
    </article>
  );
}
