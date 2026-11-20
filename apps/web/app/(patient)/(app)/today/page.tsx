import type { ReactNode } from "react";
import type { CarePlanView, TodayView } from "@carepath/shared/contracts";
import { Heading, Icon, Progress } from "@carepath/ui";
import { MomentImage } from "../../../../components/illustration";
import { moments } from "../../../../lib/illustrations";
import { ButtonLink } from "../../_components/button-link";
import { TextLink } from "../../_components/text-link";
import { PlanChangeNote } from "../../_components/plan-change-note";
import {
  getCarePlan,
  getClinic,
  getToday,
  getVersionDetail,
  requirePatient,
} from "../../_lib/data";
import { formatInstantDate, formatLocalDate, plural } from "../../_lib/format";
import { nextScheduledDay, todaysItems } from "../../_lib/plan";
import {
  daysBetweenLocal,
  firstPart,
  formatClock,
  formatRange,
  typeLabels,
  zoneName,
} from "../../_lib/scheduling";
import { ContactCareTeam } from "../../_components/patient-frame";

export const metadata = { title: "Today | CarePath" };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-border pt-5">
      <Heading level={3} id={id}>
        {title}
      </Heading>
      {children}
    </section>
  );
}

export default async function TodayPage() {
  const { patientId } = await requirePatient();
  const today = await getToday(patientId);
  const [planResult, clinic] = await Promise.all([
    today.plan ? getCarePlan(patientId) : Promise.resolve(null),
    getClinic(patientId),
  ]);
  const plan = planResult?.plan ?? null;

  const change = today.planChange;
  let changeView: ReactNode = null;
  if (change) {
    const detail =
      plan && plan.version.id === change.versionId
        ? plan
        : await getVersionDetail(patientId, change.versionId);
    changeView = (
      <PlanChangeNote
        patientId={patientId}
        versionId={change.versionId}
        versionNumber={change.versionNumber}
        note={change.changeNoteForPatient}
        clinicianName={change.publishedBy.name}
        publishedOn={formatInstantDate(change.publishedAt, today.timezone)}
        diff={detail.diffFromPrevious}
      />
    );
  }

  const state = today.session.state;
  const checkInDue = today.checkIn.due;
  const awaiting = today.patient.status === "awaiting_assignment";
  const week = today.week;
  const visitAndMessages = (
    <>
      <NextVisit today={today} />
      <MessagesNote today={today} />
    </>
  );
  const weekTarget = Math.max(week.assignedSessions, week.completedSessions, 1);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <Heading level={1}>Today</Heading>
        <p className="text-body text-ink-muted">
          {formatLocalDate(today.date)}. Hello, {today.patient.givenName}.
        </p>
      </header>

      <Hero
        today={today}
        plan={plan}
        awaiting={awaiting}
        checkInDue={checkInDue}
        contact={<ContactCareTeam clinic={clinic} />}
      />

      {changeView}

      {today.plan ? null : visitAndMessages}

      {today.plan ? (
        <>
          <Section id="checkin-heading" title="Daily check-in">
            {checkInDue ? (
              <div className="flex flex-col gap-3">
                <p className="max-w-measure text-body">
                  {today.checkIn.sessionId
                    ? "You finished a session today. Tell us how it went. Your therapist will see this."
                    : "Tell us how you feel today. It takes under a minute. Your therapist will see this."}
                </p>
                {state === "done" ? null : (
                  <div>
                    <ButtonLink
                      href={
                        today.checkIn.sessionId
                          ? `/check-in?session=${today.checkIn.sessionId}`
                          : "/check-in"
                      }
                      variant="secondary"
                    >
                      Check in
                    </ButtonLink>
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-start gap-2 text-body text-ink-muted">
                <Icon name="check-circle" size={20} className="mt-0.5 shrink-0 text-success-ink" />
                <span>
                  {today.checkIn.lastSubmittedAt
                    ? `Last check-in: ${formatInstantDate(today.checkIn.lastSubmittedAt, today.timezone)}. No check-in is due right now.`
                    : "No check-in is due right now."}
                </span>
              </p>
            )}
          </Section>

          {visitAndMessages}

          <Section id="week-heading" title="This week">
            <Progress
              label={`Sessions, week of ${formatLocalDate(week.weekStart, "short")}`}
              value={Math.min(week.completedSessions, weekTarget)}
              max={weekTarget}
              valueText={`${week.completedSessions} of ${week.assignedSessions} planned so far this week`}
            />
            <p className="text-small text-ink-muted">
              {plural(week.completedActivities, "exercise")} done
              {week.skippedActivities > 0 ? `, ${week.skippedActivities} skipped` : ""}
              {week.stoppedSessions > 0
                ? `, ${plural(week.stoppedSessions, "session")} stopped for discomfort`
                : ""}
              .
            </p>
            <p>
              <TextLink href="/progress">See all progress</TextLink>
            </p>
          </Section>

          <Section id="plan-heading" title="Your care plan">
            <div className="flex flex-col gap-1 text-body">
              <p className="font-medium">{today.plan.title}</p>
              <p className="text-ink-muted">
                Version {today.plan.versionNumber}, published{" "}
                {formatInstantDate(today.plan.publishedAt, today.timezone)}. Set by your care team.
              </p>
              <p className="text-ink-muted">
                {plural(today.plan.exercisesToday, "exercise")} today, {today.plan.exerciseCount} in
                the plan.
              </p>
            </div>
            <p>
              <TextLink href="/plan">View full care plan</TextLink>
            </p>
          </Section>
        </>
      ) : null}

      <Reminders today={today} plan={plan} />
    </div>
  );
}

function Hero({
  today,
  plan,
  awaiting,
  checkInDue,
  contact,
}: {
  today: TodayView;
  plan: CarePlanView | null;
  awaiting: boolean;
  checkInDue: boolean;
  contact: ReactNode;
}) {
  const state = today.session.state;
  const shell =
    "flex flex-col gap-4 rounded-container border border-border border-t-4 border-t-primary bg-surface p-5";

  if (awaiting) {
    return (
      <section aria-labelledby="hero-heading" className={shell}>
        <p className="text-small font-medium text-ink-muted">Setting up</p>
        <Heading level={2} id="hero-heading">
          Your details are with the clinic
        </Heading>
        <p className="max-w-measure text-body">
          A care team member will assign your therapist, and then your therapist will build your
          plan. Nothing is needed from you right now. Your session will appear here once the plan is
          published.
        </p>
        <div>
          <ButtonLink href="/consent" variant="secondary">
            Review Sharing and consent
          </ButtonLink>
        </div>
        <MomentImage path={moments.detailsWithClinic} />
      </section>
    );
  }

  if (!today.plan || !plan) {
    return (
      <section aria-labelledby="hero-heading" className={shell}>
        <p className="text-small font-medium text-ink-muted">No plan yet</p>
        <Heading level={2} id="hero-heading">
          Your therapist has not published a plan
        </Heading>
        <p className="max-w-measure text-body">
          Today shows your session as soon as a plan is published for you. If you expected one,
          contact your care team.
        </p>
        <div>{contact}</div>
      </section>
    );
  }

  const items = todaysItems(plan, today.date);
  const next = nextScheduledDay(plan, today.date);

  let eyebrow = "Today's session";
  let title = plan.title;
  let body: ReactNode = null;
  let action: ReactNode = null;

  if (state === "due") {
    body = (
      <>
        <p className="text-body text-ink-muted">
          {plural(items.length, "exercise")}, set by your care team (plan version{" "}
          {plan.version.number}).
        </p>
        <ol className="list-decimal pl-5 text-body">
          {items.map((i) => (
            <li key={i.position}>{i.exercise.name}</li>
          ))}
        </ol>
      </>
    );
    action = (
      <ButtonLink href="/session" className="w-full sm:w-auto">
        Start today&apos;s session
      </ButtonLink>
    );
  } else if (state === "in_progress" || state === "paused") {
    eyebrow = state === "paused" ? "Session paused" : "Session in progress";
    body = (
      <p className="text-body text-ink-muted">Your place is saved. Pick up where you stopped.</p>
    );
    action = (
      <ButtonLink
        href={`/session/${today.session.openSessionId ?? ""}`}
        className="w-full sm:w-auto"
      >
        {state === "paused" ? "Resume session" : "Continue session"}
      </ButtonLink>
    );
  } else if (state === "done") {
    eyebrow = "Today's session";
    title = "Done for today";
    body = (
      <>
        <p className="max-w-measure text-body">
          Today&apos;s session is finished.{" "}
          {next ? `Your plan next schedules exercises on ${next}.` : ""}
        </p>
        <MomentImage path={moments.doneForToday} />
      </>
    );
    if (checkInDue) {
      action = (
        <ButtonLink
          href={
            today.checkIn.sessionId ? `/check-in?session=${today.checkIn.sessionId}` : "/check-in"
          }
          className="w-full sm:w-auto"
        >
          Add your check-in
        </ButtonLink>
      );
    }
  } else {
    eyebrow = "Rest day";
    title = "No session scheduled today";
    body = (
      <p className="max-w-measure text-body">
        {next ? `Your plan next schedules exercises on ${next}. ` : ""}
        You can still do a session if you want to; it covers your whole plan.
      </p>
    );
    action = (
      <ButtonLink href="/session" variant="secondary" className="w-full sm:w-auto">
        Start a session anyway
      </ButtonLink>
    );
  }

  return (
    <section aria-labelledby="hero-heading" className={shell}>
      <p className="text-small font-medium text-ink-muted">{eyebrow}</p>
      <Heading level={2} id="hero-heading">
        {title}
      </Heading>
      {body}
      {action ? <div>{action}</div> : null}
    </section>
  );
}

function NextVisit({ today }: { today: TodayView }) {
  const next = today.nextAppointment;
  if (!next) {
    return (
      <Section id="visit-heading" title="Next appointment">
        <p className="text-body text-ink-muted">No visit is booked.</p>
        <p>
          <TextLink href="/appointments/book">Book a visit</TextLink>
        </p>
      </Section>
    );
  }
  const timezone = today.timezone;
  const diff = daysBetweenLocal(today.date, next.date);
  return (
    <Section id="visit-heading" title="Next appointment">
      <div className="flex flex-col gap-1 text-body">
        <p className="font-medium">
          {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : formatLocalDate(next.date)},{" "}
          {formatRange(next.startsAt, next.endsAt, timezone)}
        </p>
        <p className="text-ink-muted">
          {typeLabels[next.type]} with {firstPart(next.practitioner.name)}. Times are in{" "}
          {zoneName(timezone, next.startsAt)}.
        </p>
      </div>
      <p>
        <TextLink href="/appointments">See appointments</TextLink>
      </p>
    </Section>
  );
}

function MessagesNote({ today }: { today: TodayView }) {
  const { unreadCount } = today.messages;
  return (
    <Section id="messages-heading" title="Messages">
      <p className="flex items-start gap-2 text-body">
        {unreadCount > 0 ? (
          <>
            <Icon name="message" size={20} className="mt-0.5 shrink-0 text-primary" />
            <span className="font-medium">
              {unreadCount === 1
                ? "1 unread message from your care team."
                : `${unreadCount} unread messages from your care team.`}
            </span>
          </>
        ) : (
          <span className="text-ink-muted">No new messages from your care team.</span>
        )}
      </p>
      <p>
        <TextLink href="/messages">{unreadCount > 0 ? "Read messages" : "Open messages"}</TextLink>
      </p>
    </Section>
  );
}

function Reminders({ today, plan }: { today: TodayView; plan: CarePlanView | null }) {
  const state = today.session.state;
  const items: string[] = [];
  if (plan && (state === "done" || state === "not_scheduled")) {
    const next = nextScheduledDay(plan, today.date);
    if (next) items.push(`Next scheduled session: ${next}.`);
  }
  const next = today.nextAppointment;
  if (next && next.status === "booked") {
    const diff = daysBetweenLocal(today.date, next.date);
    if (diff === 0 || diff === 1) {
      items.push(
        `Appointment reminder: your visit is ${diff === 0 ? "today" : "tomorrow"} at ${formatClock(next.startsAt, today.timezone)}.`,
      );
    }
  }
  if (today.checkIn.due && today.checkIn.sessionId === null && state === "due") {
    items.push("A check-in is waiting. You can add it before or after your session.");
  }
  if (items.length === 0) return null;
  return (
    <Section id="reminders-heading" title="Reminders">
      <ul className="list-disc pl-5 text-body text-ink-muted">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </Section>
  );
}
