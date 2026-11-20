import { notFound } from "next/navigation";
import { BookingFlow } from "../../../../_components/booking-flow";
import {
  getAppointments,
  getCareTeam,
  getClinic,
  getIntake,
  getToday,
  requirePatient,
} from "../../../../_lib/data";
import { availabilityFromIntake } from "../../../../_lib/scheduling";
import { therapistsOf } from "../../../../_lib/therapists";

export const metadata = { title: "Reschedule a visit | CarePath" };

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const { patientId } = await requirePatient();
  const [team, clinic, today, intake, upcoming] = await Promise.all([
    getCareTeam(patientId),
    getClinic(patientId),
    getToday(patientId),
    getIntake(patientId),
    getAppointments(patientId, "upcoming"),
  ]);
  const current = upcoming.items.find((a) => a.id === appointmentId && a.status === "booked");
  if (!current) notFound();
  return (
    <BookingFlow
      patientId={patientId}
      mode="reschedule"
      therapists={therapistsOf(team) ?? []}
      timezone={clinic.timezone}
      today={today.date}
      availability={availabilityFromIntake(intake)}
      defaultType={current.type}
      current={current}
    />
  );
}
