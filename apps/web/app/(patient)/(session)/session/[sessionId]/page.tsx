import { notFound } from "next/navigation";
import { exerciseSessionDetailSchema } from "@carepath/shared/contracts";
import { SessionPlayer } from "../../../_components/session-player";
import { getClinic, isNotFound, requirePatient } from "../../../_lib/data";
import { serverGet } from "../../../../../lib/api/server";

export const metadata = { title: "Session | CarePath" };

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { patientId } = await requirePatient();
  const { sessionId } = await params;
  let session;
  try {
    session = await serverGet(
      `/patients/${patientId}/sessions/${sessionId}`,
      exerciseSessionDetailSchema,
    );
  } catch (e) {
    if (isNotFound(e)) notFound();
    throw e;
  }
  const clinic = await getClinic(patientId);
  return <SessionPlayer patientId={patientId} initial={session} clinic={clinic} />;
}
