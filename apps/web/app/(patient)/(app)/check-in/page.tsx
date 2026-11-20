import { redirect } from "next/navigation";
import { CheckInForm } from "../../_components/check-in-form";
import { getToday, requirePatient } from "../../_lib/data";

export const metadata = { title: "Check-in | CarePath" };

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { patientId } = await requirePatient();
  const today = await getToday(patientId);
  const { session } = await searchParams;
  if (!today.plan) redirect("/today");
  // Only the session the API says a check-in would follow is offered; any other id is ignored.
  const sessionId = session && session === today.checkIn.sessionId ? session : null;
  return (
    <div className="flex flex-col gap-5">
      <CheckInForm
        patientId={patientId}
        sessionId={sessionId}
        heading="Daily check-in"
        intro={
          sessionId
            ? "How did today's session go? Choose the number that fits."
            : "How are you feeling today? Choose the number that fits."
        }
      />
    </div>
  );
}
