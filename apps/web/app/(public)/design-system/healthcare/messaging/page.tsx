import type { Metadata } from "next";
import { EmergencyNotice, MessageThread } from "@carepath/ui";
import { Label, Section, Specimen } from "../../specimen";
import {
  DeliveryStatesDemo,
  PatientMessagingDemo,
  StaffComposerDemo,
  StarterComposerDemo,
} from "../demos";
import { FamilyPage } from "../families";
import { TZ, staffThread } from "../fixtures";

export const metadata: Metadata = {
  title: "Healthcare components: messaging | CarePath",
};

export default function MessagingPage() {
  return (
    <FamilyPage
      slug="messaging"
      intro="One thread and one composer for both apps. Every message names its sender, role and clinic-zone time. Delivery is Sending, Sent or Not sent with the reason and Retry, never Delivered or Read. Drafts stay in memory only. The patient composer carries the fixed emergency line and the urgent line; the staff composer does not."
    >
      <Section
        id="thread"
        title="Thread and composer, patient"
        intro="A named log. The failed message has a 2 px border, the words and Retry sending; press Retry to see the still-not-sent state. Send never disables: an empty send says Write a message first. Below 768 px the composer sticks to the bottom of the page flow."
      >
        <Specimen id="patient-thread" only="patient">
          <PatientMessagingDemo />
        </Specimen>
        <Specimen
          id="patient-composer-start"
          only="patient"
          title="Empty thread: starting points, no clinic phone"
        >
          <StarterComposerDemo />
        </Specimen>
      </Section>

      <Section
        id="staff"
        title="Thread and composer, staff"
        intro="Same markup in a focusable pane. The label names the patient; the hint gives the reply time the patient was told and the keyboard shortcut. Type a message containing the word fail to see the in-form error."
      >
        <Specimen id="staff-thread" only="clinician">
          <MessageThread
            variant="staff"
            timezone={TZ}
            label="Messages with Maria Okonkwo-Lindqvist"
            messages={staffThread}
          />
          <StaffComposerDemo />
        </Specimen>
      </Section>

      <Section
        id="delivery"
        title="Delivery state"
        intro="Icon plus words, own messages only. The same words in both apps."
      >
        <Specimen id="delivery-state">
          <DeliveryStatesDemo />
        </Specimen>
      </Section>

      <Section
        id="emergency"
        title="Emergency and urgent lines"
        intro="Static text, not an alert, never edited inline. The urgent line is a separate constant with the clinic phone as a real tel link, or Urgent? Contact your clinic when the clinic has no phone."
      >
        <Specimen id="emergency-notice" only="patient">
          <Label>With a clinic phone</Label>
          <EmergencyNotice clinicPhone="(602) 555-0142" />
          <Label>No clinic phone</Label>
          <EmergencyNotice clinicPhone={null} contactHref="#thread" />
          <Label>Long phone string</Label>
          <EmergencyNotice clinicPhone="+1 (602) 555-0142 extension 2204" />
        </Specimen>
      </Section>

      <Section id="states" title="Thread states" intro="Loading, empty and failed, each in words.">
        <Specimen id="thread-states">
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
        </Specimen>
      </Section>
    </FamilyPage>
  );
}
