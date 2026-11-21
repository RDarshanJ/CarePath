import { redirect } from "next/navigation";
import { Button, Heading } from "@carepath/ui";
import { IllustrationFigure } from "../../../../components/illustration";
import { exerciseIllustration } from "../../../../lib/illustrations";
import { StartSession } from "../_components/start-session";
import { getCarePlan, getToday, requirePatient } from "../../_lib/data";
import { doseText, plural, restText } from "../../_lib/format";
import { todaysItems } from "../../_lib/plan";

export const metadata = { title: "Session overview | CarePath" };

/**
 * Before starting (REQ-SES-01, REQ-SES-04): what is in the session and who set it, then the one action.
 * The action comes before the list so it is on the first screen at 375 by 667 (D-WP-10 gate). Only the
 * exercise count and each exercise's own dose are shown, never a total time (DR-002 B, R4). An exercise
 * without a picture of its own is laid out text first (DR-004 U9).
 */
export default async function SessionOverviewPage() {
  const { patientId } = await requirePatient();
  const today = await getToday(patientId);
  if (today.session.openSessionId) redirect(`/session/${today.session.openSessionId}`);
  if (!today.plan) redirect("/today");
  const { plan } = await getCarePlan(patientId);
  if (!plan) redirect("/today");
  const items = todaysItems(plan, today.date);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1.5">
          <p className="text-small font-medium text-ink-muted">Before you start</p>
          <Heading level={1}>Today&apos;s session</Heading>
          <p className="max-w-measure text-body text-ink-muted">
            {plan.title}: {plural(items.length, "exercise")}, set by your care team. You can pause,
            skip an exercise or stop at any point, and your place is saved.
          </p>
        </header>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <StartSession patientId={patientId} />
          <Button href="/today" variant="quiet" className="w-full sm:w-auto">
            Not now
          </Button>
        </div>
        <p className="max-w-measure text-body">
          <span className="font-medium">If something hurts,</span> press &quot;Stop, this
          hurts&quot;. It is on every screen of the session. It ends the session at once and tells
          your therapist.
        </p>
      </div>

      <section aria-labelledby="in-session" className="flex flex-col gap-3">
        <Heading level={3} as="h2" id="in-session">
          In this session
        </Heading>
        <ol className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
          {items.map((item, index) => {
            const picture = exerciseIllustration(item.exercise, "overview");
            return (
              <li
                key={item.position}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-control border border-border font-semibold tabular-nums text-ink"
                  >
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-h4 font-semibold">{item.exercise.name}</p>
                    <p className="text-body">{doseText(item.dose)}</p>
                    <p className="text-small text-ink-muted">{restText(item.dose)}.</p>
                    {item.clinicianInstructions ? (
                      <p className="text-small text-ink">
                        <span className="font-medium">From your therapist:</span>{" "}
                        {item.clinicianInstructions}
                      </p>
                    ) : null}
                  </div>
                </div>
                {picture ? (
                  <IllustrationFigure
                    illustration={picture}
                    priority={index === 0}
                    className="sm:max-w-48 sm:shrink-0"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <p className="rounded-control border border-border bg-surface-sunken p-3 text-small text-ink-muted">
        {plan.contentNotice}
      </p>
    </div>
  );
}
