import { versionText } from "@carepath/shared";
import { Heading, EmptyState, Prose, Tag } from "@carepath/ui";
import { IllustrationFigure } from "../../../../components/illustration";
import { exerciseIllustration } from "../../../../lib/illustrations";
import { DiffList } from "../../_components/diff-list";
import { getCarePlan, getToday, getVersionList, requirePatient } from "../../_lib/data";
import {
  daysText,
  doseText,
  formatInstantDate,
  formatLocalDate,
  restText,
  sentenceCase,
} from "../../_lib/format";

export const metadata = { title: "Care plan | CarePath" };

export default async function PlanPage() {
  const { patientId } = await requirePatient();
  const [{ plan }, today, versions] = await Promise.all([
    getCarePlan(patientId),
    getToday(patientId),
    getVersionList(patientId),
  ]);

  if (!plan) {
    return (
      <div className="flex flex-col gap-5">
        <Heading level={1}>Care plan</Heading>
        <EmptyState icon="clipboard" title="No plan published yet">
          Your therapist writes your plan and publishes it. It appears here, with a note about
          anything that changes later.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <Heading level={1}>Care plan</Heading>
        <p className="text-body text-ink-muted">
          {plan.title}. Version {plan.version.number}, published{" "}
          {plan.version.publishedAt
            ? formatInstantDate(plan.version.publishedAt, today.timezone)
            : ""}{" "}
          by {plan.version.publishedBy.name}.
        </p>
      </header>

      {plan.instructions ? (
        <Prose>
          <p>{plan.instructions}</p>
        </Prose>
      ) : null}

      <section aria-labelledby="exercises-heading" className="flex flex-col gap-3">
        <Heading level={3} id="exercises-heading">
          Exercises
        </Heading>
        <p className="text-small text-ink-muted">{plan.contentNotice}</p>
        <ol className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
          {plan.items.map((item, index) => {
            const picture = exerciseIllustration(item.exercise);
            return (
              <li key={item.position} className="flex flex-col gap-1.5 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-h4 font-heading font-semibold">{item.exercise.name}</p>
                  <Tag>{sentenceCase(item.exercise.bodyArea)}</Tag>
                </div>
                <p className="text-body">
                  {doseText(item.dose)}. {restText(item.dose)}.
                </p>
                <p className="text-small text-ink-muted">
                  {daysText(item.schedule.daysOfWeek)}, {item.schedule.timesPerDay}{" "}
                  {item.schedule.timesPerDay === 1 ? "time" : "times"} a day. Set by your care team.
                </p>
                {item.clinicianInstructions ? (
                  <p className="text-body">
                    <span className="font-medium">From your therapist:</span>{" "}
                    {item.clinicianInstructions}
                  </p>
                ) : null}
                {picture ? (
                  <IllustrationFigure
                    illustration={picture}
                    priority={index === 0}
                    className="mt-1"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      {plan.goals.length > 0 ? (
        <section aria-labelledby="goals-heading" className="flex flex-col gap-2">
          <Heading level={3} id="goals-heading">
            Goals set by your care team
          </Heading>
          <ul className="list-disc pl-5 text-body">
            {plan.goals.map((g, i) => (
              <li key={g.id ?? i}>
                {g.description}
                {g.targetValue !== null
                  ? ` (target ${g.targetValue}${g.targetUnit ? ` ${g.targetUnit}` : ""})`
                  : ""}
                {g.dueDate ? `, by ${formatLocalDate(g.dueDate)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="history-heading"
        className="flex flex-col gap-3 border-t border-border pt-5"
      >
        <Heading level={3} id="history-heading">
          Plan history
        </Heading>
        <p className="text-small text-ink-muted">
          Every version stays here. Published versions are never edited.
        </p>
        <ol className="flex flex-col gap-4">
          {versions.items.map((v) => (
            <li key={v.id} className="flex flex-col gap-1">
              <p className="text-body font-medium">{versionText(v.number, v.isCurrent)}</p>
              <p className="text-small text-ink-muted">
                Published {formatInstantDate(v.publishedAt, today.timezone)} by {v.publishedBy.name}
              </p>
              {v.changeNoteForPatient ? (
                <p className="max-w-measure text-body">{v.changeNoteForPatient}</p>
              ) : null}
            </li>
          ))}
        </ol>
        {plan.diffFromPrevious ? (
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-label font-medium">
              Changes in version {plan.version.number} (from version{" "}
              {plan.diffFromPrevious.previousVersionNumber})
            </p>
            <DiffList diff={plan.diffFromPrevious} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
