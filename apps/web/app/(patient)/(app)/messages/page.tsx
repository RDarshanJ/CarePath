import { Heading } from "@carepath/ui";
import { ConversationList } from "../../_components/conversation-list";
import { getClinic, getConversations, requirePatient } from "../../_lib/data";

export const metadata = { title: "Messages | CarePath" };

export default async function MessagesPage() {
  const { patientId } = await requirePatient();
  const [conversations, clinic] = await Promise.all([getConversations(), getClinic(patientId)]);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Heading level={1}>Messages</Heading>
        <p className="max-w-measure text-body text-ink-muted">
          Write to your care team here.{" "}
          {clinic.replyTimeText ?? "Your care team will reply as soon as they can."}
        </p>
      </header>
      <ConversationList initial={conversations} timezone={clinic.timezone} />
    </div>
  );
}
