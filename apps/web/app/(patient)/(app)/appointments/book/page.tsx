import { notFound } from "next/navigation";
import { BookingFlow } from "../../../_components/booking-flow";
import {
  getAppointments,
  getCareTeam,
  getClinic,
  getIntake,
  getToday,
  requirePatient,
} from "../../../_lib/data";
import { availabilityFromIntake } from "../../../_lib/scheduling";
import { therapistsOf } from "../../../_lib/therapists";

export const metadata = { title: "Book a visit | CarePath" };

export default async function BookPage() {
  const { patientId } = await requirePatient();
  const [team, clinic, today, intake, upcoming, past] = await Promise.all([
    getCareTeam(patientId),
    getClinic(patientId),
    getToday(patientId),
    getIntake(patientId),
    getAppointments(patientId, "upcoming"),
    getAppointments(patientId, "past"),
  ]);
  const therapists = therapistsOf(team);
  if (!therapists) notFound();
  const hadVisit = upcoming.items.length > 0 || past.items.some((a) => a.status === "completed");
  return (
    <BookingFlow
      patientId={patientId}
      mode="book"
      therapists={therapists}
      timezone={clinic.timezone}
      today={today.date}
      availability={availabilityFromIntake(intake)}
      defaultType={hadVisit ? "follow_up" : "initial_evaluation"}
    />
  );
}
