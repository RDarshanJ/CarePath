import type { Appointment } from "@carepath/shared/contracts";
import { Banner, EmptyState, Heading, StatusChip, Button } from "@carepath/ui";
import { CancelVisit } from "../../_components/cancel-visit";
import { getAppointments, getCareTeam, getToday, requirePatient } from "../../_lib/data";
import { formatLocalDate } from "../../_lib/format";
import {
  daysBetweenLocal,
  firstPart,
  formatClock,
  formatRange,
  statusLabels,
  typeLabels,
  zoneName,
} from "../../_lib/scheduling";

export const metadata = { title: "Appointments | CarePath" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (v: string | string[] | undefined) =>
  typeof v === "string" && uuid.test(v) ? v : null;

function dayWords(appt: Appointment, today: string): string {
  const diff = daysBetweenLocal(today, appt.date);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `on ${formatLocalDate(appt.date)}`;
}

function Visit({
  appt,
  patientId,
  timezone,
  actions,
}: {
  appt: Appointment;
  patientId: string;
  timezone: string;
  actions: boolean;
}) {
  const summary = `${formatLocalDate(appt.date)} at ${formatClock(appt.startsAt, timezone)}`;
  const live = appt.status === "checked_in" || appt.status === "in_progress";
  const ended = !["booked", "checked_in", "in_progress"].includes(appt.status);
  return (
    <li className="flex flex-col gap-3 rounded-container border border-border bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <Heading level={3}>{formatLocalDate(appt.date)}</Heading>
        <p className="text-body font-medium">{formatRange(appt.startsAt, appt.endsAt, timezone)}</p>
      </div>
      <div className="flex flex-col gap-0.5 text-body">
        <p>
          {typeLabels[appt.type]} with {firstPart(appt.practitioner.name)}
        </p>
        {appt.reason ? <p className="text-ink-muted">Reason: {appt.reason}</p> : null}
        {appt.status === "cancelled_by_patient" || appt.status === "cancelled_by_clinic" ? (
          appt.cancellationReason ? (
            <p className="text-ink-muted">Cancellation reason: {appt.cancellationReason}</p>
          ) : null
        ) : null}
      </div>
      {live ? (
        <div>
          <StatusChip tone="info">{statusLabels[appt.status]}</StatusChip>
        </div>
      ) : ended ? (
        <p className="text-small font-medium text-ink-muted">{statusLabels[appt.status]}</p>
      ) : null}
      {actions && appt.status === "booked" ? (
        <div className="flex flex-wrap gap-2">
          <Button href={`/appointments/${appt.id}/reschedule`} variant="neutral" size="sm">
            Reschedule
            <span className="sr-only"> visit on {summary}</span>
          </Button>
          <CancelVisit patientId={patientId} appointmentId={appt.id} summary={summary} />
        </div>
      ) : null}
    </li>
  );
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const { patientId } = await requirePatient();
  const [upcoming, past, team, today] = await Promise.all([
    getAppointments(patientId, "upcoming"),
    getAppointments(patientId, "past"),
    getCareTeam(patientId),
    getToday(patientId),
  ]);
  const timezone = upcoming.timezone;
  const canBook = team.members.some((m) => m.practitionerId !== null);

  const bookedId = one(query["booked"]);
  const movedId = one(query["moved"]);
  const cancelledId = one(query["cancelled"]);
  const justSaved = upcoming.items.find((a) => a.id === (bookedId ?? movedId));

  const nextVisit = upcoming.items.find((a) => a.status === "booked");
  const reminderDays = nextVisit ? daysBetweenLocal(today.date, nextVisit.date) : null;
  const showReminder = nextVisit && reminderDays !== null && reminderDays >= 0 && reminderDays <= 1;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1">
        <Heading level={1}>Appointments</Heading>
        <p className="text-body text-ink-muted">
          Times are in {zoneName(timezone, nextVisit?.startsAt)}, the clinic&apos;s time zone.
        </p>
      </header>

      {justSaved ? (
        <Banner tone="success" title={movedId ? "Visit moved" : "Visit booked"}>
          {typeLabels[justSaved.type]} with {firstPart(justSaved.practitioner.name)} on{" "}
          {formatLocalDate(justSaved.date)},{" "}
          {formatRange(justSaved.startsAt, justSaved.endsAt, timezone)}.
        </Banner>
      ) : null}
      {cancelledId ? (
        <Banner tone="success" title="Visit cancelled">
          Your care team can see why. The time is open for other patients again.
        </Banner>
      ) : null}
      {showReminder && nextVisit ? (
        <Banner tone="info" title="Reminder">
          Your visit with {firstPart(nextVisit.practitioner.name)} is{" "}
          {dayWords(nextVisit, today.date)} at {formatClock(nextVisit.startsAt, timezone)}.
        </Banner>
      ) : null}

      {canBook ? (
        <div>
          <Button href="/appointments/book" className="w-full sm:w-auto">
            Book a visit
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
        <Heading level={2} id="upcoming-heading">
          Upcoming
        </Heading>
        {upcoming.items.length === 0 ? (
          <EmptyState icon="calendar" title="No visits booked">
            {canBook
              ? "When you book a visit it appears here, with the time and your therapist."
              : "You can book once a therapist is assigned to you. Your care team will let you know."}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.items.map((a) => (
              <Visit key={a.id} appt={a} patientId={patientId} timezone={timezone} actions />
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="past-heading"
        className="flex flex-col gap-3 border-t border-border pt-6"
      >
        <Heading level={2} id="past-heading">
          Past
        </Heading>
        {past.items.length === 0 ? (
          <p className="text-body text-ink-muted">Visits you have had or cancelled appear here.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {past.items.map((a) => (
              <Visit
                key={a.id}
                appt={a}
                patientId={patientId}
                timezone={timezone}
                actions={false}
              />
            ))}
          </ul>
        )}
        {past.nextCursor ? (
          <p className="text-small text-ink-muted">
            Showing your {past.items.length} most recent visits.
          </p>
        ) : null}
      </section>
    </div>
  );
}
