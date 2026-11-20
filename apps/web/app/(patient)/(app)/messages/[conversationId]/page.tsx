import { notFound } from "next/navigation";
import { ApiError } from "../../../../../lib/api/errors";
import { ThreadView } from "../../../_components/thread-view";
import { getClinic, getMessages, requirePatient } from "../../../_lib/data";

export const metadata = { title: "Message thread | CarePath" };

const THREAD_PAGE = 50;

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { patientId } = await requirePatient();
  const clinic = await getClinic(patientId);
  let initial;
  try {
    initial = await getMessages(conversationId, THREAD_PAGE);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
  return (
    <ThreadView
      conversationId={conversationId}
      initial={initial}
      pageSize={THREAD_PAGE}
      timezone={clinic.timezone}
    />
  );
}
