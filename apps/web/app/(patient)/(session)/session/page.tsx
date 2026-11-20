import { redirect } from "next/navigation";
import { Heading } from "@carepath/ui";
import { IllustrationFigure } from "../../../../components/illustration";
import { exerciseIllustration } from "../../../../lib/illustrations";
import { ButtonLink } from "../../_components/button-link";
import { StartSession } from "../../_components/start-session";
import { getCarePlan, getToday, requirePatient } from "../../_lib/data";
import { doseText, plural, restText } from "../../_lib/format";
import { todaysItems } from "../../_lib/plan";

export const metadata = { title: "Session overview | CarePath" };

/** Overview before starting: what is in the session, who set it, the fictional-content notice (REQ-SES-01, REQ-SES-04). */
export default async function SessionOverviewPage() {
  const { patientId } = await requirePatient();
  const today = await getToday(patientId);
  if (today.session.openSessionId) redirect(`/session/${today.session.openSessionId}`);
  if (!today.plan) redirect("/today");
  const { plan } = await getCarePlan(patientId);
  if (!plan) redirect("/today");
  const items = todaysItems(plan, today.date);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-small font-medium text-ink-muted">Before you start</p>
        <Heading level={1}>Today&apos;s session</Heading>
        <p className="text-body text-ink-muted">
          {plan.title}: {plural(items.length, "exercise")}, set by your care team. You can pause,
          skip an exercise or stop at any point, and your place is saved.
        </p>
      </header>

      <p className="rounded-control border border-border bg-surface-sunken p-3 text-small text-ink-muted">
        {plan.contentNotice}
      </p>

      <ol className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
        {items.map((item, index) => {
          const picture = exerciseIllustration(item.exercise);
          return (
            <li key={item.position} className="flex gap-3 p-4">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-control bg-primary-subtle font-semibold tabular-nums text-primary"
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-heading text-h4 font-semibold">{item.exercise.name}</p>
                <p className="text-body">{doseText(item.dose)}</p>
                <p className="text-small text-ink-muted">
                  {restText(item.dose)}. Set by your care team.
                </p>
                {item.clinicianInstructions ? (
                  <p className="text-small text-ink">
                    <span className="font-medium">From your therapist:</span>{" "}
                    {item.clinicianInstructions}
                  </p>
                ) : null}
                {picture ? (
                  <IllustrationFigure
                    illustration={picture}
                    priority={index === 0}
                    className="mt-2"
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="stop-heading" className="flex flex-col gap-1 text-body">
        <Heading level={4} as="h2" id="stop-heading">
          If something hurts
        </Heading>
        <p className="max-w-measure text-ink-muted">
          Every exercise has a &quot;Stop, this hurts&quot; button. It ends the session, asks how
          much it hurts and lets your therapist know.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <StartSession patientId={patientId} />
        <ButtonLink href="/today" variant="quiet">
          Not now
        </ButtonLink>
      </div>
    </div>
  );
}
