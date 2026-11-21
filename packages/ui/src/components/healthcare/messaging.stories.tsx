import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases } from "../../stories/helpers";
import { TZ, patientThread, staffThread } from "../../stories/fixtures";
import {
  DeliveryState,
  EmergencyNotice,
  MessageComposer,
  MessageItem,
  MessageThread,
} from "./messaging";

const meta = { title: "Healthcare/Messaging" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const EmergencyNoticeStory: Story = {
  name: "EmergencyNotice",
  render: () => (
    <Cases>
      <Case label="With a clinic phone">
        <EmergencyNotice clinicPhone="(602) 555-0142" />
      </Case>
      <Case label="No clinic phone">
        <EmergencyNotice clinicPhone={null} contactHref="#thread" />
      </Case>
      <Case label="Long phone string">
        <EmergencyNotice clinicPhone="+1 (602) 555-0142 extension 2204" />
      </Case>
    </Cases>
  ),
};

export const DeliveryStateStory: Story = {
  name: "DeliveryState",
  render: () => (
    <Cases>
      <Case label="Sending">
        <DeliveryState message={patientThread[3]!} />
      </Case>
      <Case label="Sent">
        <DeliveryState message={patientThread[0]!} />
      </Case>
      <Case label="Not sent, with the reason and Retry">
        <DeliveryState message={patientThread[2]!} onRetry={() => undefined} />
      </Case>
      <Case label="Not sent, retrying">
        <DeliveryState message={patientThread[2]!} onRetry={() => undefined} retrying />
      </Case>
      <Case label="Not sent, no retry: call the clinic">
        <DeliveryState message={{ ...patientThread[2]!, canRetry: false }} />
      </Case>
    </Cases>
  ),
};

export const MessageItemStory: Story = {
  name: "MessageItem",
  render: () => (
    <Cases>
      <Case label="Patient app: the patient's own message, then the therapist's reply">
        <ul className="flex flex-col gap-3">
          <MessageItem message={patientThread[0]!} variant="patient" timezone={TZ} />
          <MessageItem message={patientThread[1]!} variant="patient" timezone={TZ} />
        </ul>
      </Case>
      <Case label="Patient app: not sent, and a long unbroken reference number">
        <ul className="flex flex-col gap-3">
          <MessageItem
            message={patientThread[2]!}
            variant="patient"
            timezone={TZ}
            onRetry={() => undefined}
          />
          <MessageItem message={patientThread[3]!} variant="patient" timezone={TZ} />
        </ul>
      </Case>
      <Case label="Staff app">
        <ul className="flex flex-col gap-3">
          <MessageItem message={staffThread[0]!} variant="staff" timezone={TZ} />
          <MessageItem message={staffThread[1]!} variant="staff" timezone={TZ} />
        </ul>
      </Case>
    </Cases>
  ),
};

export const MessageThreadStory: Story = {
  name: "MessageThread",
  render: () => (
    <Cases>
      <Case label="Patient thread with a new reply and a failed message">
        <MessageThread
          variant="patient"
          timezone={TZ}
          label="Messages with your care team"
          messages={patientThread}
          newFromId="m2"
          onRetry={() => undefined}
        />
      </Case>
      <Case label="Staff thread">
        <MessageThread
          variant="staff"
          timezone={TZ}
          label="Messages with Maria Okonkwo-Lindqvist"
          messages={staffThread}
        />
      </Case>
      <Case label="Loading, empty and failed">
        <div className="flex flex-col gap-4">
          <MessageThread
            variant="patient"
            timezone={TZ}
            label="Messages, loading"
            messages={[]}
            state="loading"
          />
          <MessageThread variant="patient" timezone={TZ} label="Messages, empty" messages={[]} />
          <MessageThread
            variant="patient"
            timezone={TZ}
            label="Messages, failed"
            messages={[]}
            state="error"
          />
        </div>
      </Case>
    </Cases>
  ),
};

function PatientComposer({ empty }: { empty?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <MessageComposer
      audience="patient"
      sticky={false}
      value={value}
      onChange={setValue}
      replyTimeText={empty ? null : "Your care team usually replies within one business day."}
      clinicPhone={empty ? null : "(602) 555-0142"}
      contactHref="#thread"
      startingPoints={
        empty ? ["I have a question about an exercise.", "I need to change a visit."] : []
      }
      onSend={() => setValue("")}
    />
  );
}

function StaffComposer({ failed }: { failed?: boolean }) {
  const [value, setValue] = useState(failed ? "Thanks, see you Thursday." : "");
  return (
    <MessageComposer
      audience="staff"
      patientName="Maria Okonkwo-Lindqvist"
      value={value}
      onChange={setValue}
      error={failed ? "The connection dropped before the message reached the server." : null}
      replyTimeText="The patient was told: replies within one business day."
      onSend={() => undefined}
    />
  );
}

export const MessageComposerStory: Story = {
  name: "MessageComposer",
  render: () => (
    <Cases>
      <Case label="Patient, with the reply time and the clinic phone">
        <PatientComposer />
      </Case>
      <Case label="Patient, empty thread: starting points, no clinic phone">
        <PatientComposer empty />
      </Case>
      <Case label="Staff">
        <StaffComposer />
      </Case>
      <Case label="Staff, send failed">
        <StaffComposer failed />
      </Case>
    </Cases>
  ),
};
