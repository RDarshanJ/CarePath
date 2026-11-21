import { redirect } from "next/navigation";
import { exerciseSessionDetailSchema } from "@carepath/shared/contracts";
import { CheckInForm } from "./_components/check-in-form";
import { getToday, requirePatient } from "../../_lib/data";
import { serverGet } from "../../../../lib/api/server";

export const metadata = { title: "Check-in | CarePath" };

/**
 * The daily check-in (feature D, D1). It is reachable from Today at any time; when a session ended
 * today without one, it follows that session, and after "Stop, this hurts" the number given at the
 * stop is preselected with the sentence that says so.
 */
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
  let stoppedAt: number | null = null;
  let stopped = false;
  if (sessionId) {
    const detail = await serverGet(
      `/patients/${patientId}/sessions/${sessionId}`,
      exerciseSessionDetailSchema,
    );
    stopped = detail.status === "stopped_discomfort";
    stoppedAt = stopped
      ? (detail.activities.find((a) => a.discomfortLevel !== null)?.discomfortLevel ?? null)
      : null;
  }
  const intro = stopped
    ? stoppedAt !== null
      ? "You stopped today's session. Change the number if it is different now."
      : "You stopped today's session. Choose the number that fits how you feel now."
    : sessionId
      ? "How did today's session go? Choose the number that fits."
      : today.checkIn.due
        ? "How are you feeling today? Choose the number that fits."
        : "No check-in is due right now. You can add one any time. Choose the number that fits.";
  return (
    <div className="flex flex-col gap-5">
      <CheckInForm
        patientId={patientId}
        sessionId={sessionId}
        heading="Daily check-in"
        intro={intro}
        stoppedAt={stoppedAt}
        aboveTabBar
      />
    </div>
  );
}
