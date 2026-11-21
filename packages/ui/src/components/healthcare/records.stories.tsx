import type { Meta, StoryObj } from "@storybook/react-vite";
import { formatBornText } from "@carepath/shared";
import { Case, Cases } from "../../stories/helpers";
import {
  NOW,
  TODAY,
  TZ,
  appointments,
  careTeam,
  consentAllowed,
  consentOff,
  longPatient,
  replacementStart,
  rowPatients,
  sparsePatient,
} from "../../stories/fixtures";
import { PatientBanner, PatientBannerSkeleton, PatientRowIdentity } from "./identity";
import { ConsentStatusLine, ConsentSummary } from "./consent";
import { Button } from "../primitives/button";
import { AppointmentRecord, appointmentActionLabel } from "./appointment";

const meta = { title: "Healthcare/Records, visits and consent" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const PatientBannerStory: Story = {
  name: "PatientBanner",
  render: () => (
    <Cases>
      <Case label="Long name, care team, record stamp">
        <PatientBanner
          patient={longPatient}
          today={TODAY}
          clinicZone={TZ}
          recordAsOf={NOW}
          careTeam={careTeam}
          sticky={false}
          nameAs="h2"
        />
      </Case>
      <Case label="Missing values, care team not assigned, viewer not on the care team">
        <PatientBanner
          patient={sparsePatient}
          today={TODAY}
          clinicZone={TZ}
          careTeam={[]}
          sticky={false}
          nameAs="h2"
        />
      </Case>
      <Case label="Offline, care team could not be read">
        <PatientBanner
          patient={{ ...longPatient, status: "intake_incomplete" }}
          today={TODAY}
          clinicZone={TZ}
          recordAsOf="2026-11-19T15:02:00Z"
          offline
          careTeam={null}
          sticky={false}
          nameAs="h2"
        />
      </Case>
    </Cases>
  ),
};

export const PatientBannerSkeletonStory: Story = {
  name: "PatientBannerSkeleton",
  render: () => <PatientBannerSkeleton />,
};

export const PatientRowIdentityStory: Story = {
  name: "PatientRowIdentity",
  render: () => (
    <ul className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
      {rowPatients.map((p) => (
        <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
          <PatientRowIdentity patient={p} href="#record" />
          <span className="text-small text-ink">{p.task}</span>
        </li>
      ))}
    </ul>
  ),
};

function Visits({ audience }: { audience: "patient" | "staff" }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {appointments.map((a) => {
        const upcoming = a.status === "booked";
        return (
          <li key={a.id}>
            <AppointmentRecord
              appointment={a}
              audience={audience}
              today={TODAY}
              viewerZone="America/Los_Angeles"
              patientHref={audience === "staff" ? "#record" : undefined}
              patientBornText={audience === "staff" ? formatBornText("1959-11-20") : undefined}
              replacement={
                a.rescheduledToId ? { href: "#visits", startsAt: replacementStart } : null
              }
              actions={
                upcoming ? (
                  audience === "patient" ? (
                    <>
                      <Button
                        size="sm"
                        variant="neutral"
                        aria-label={appointmentActionLabel("Reschedule", a)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        tone="critical"
                        aria-label={appointmentActionLabel("Cancel", a)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="neutral"
                      aria-label={appointmentActionLabel("Open record for the", a)}
                    >
                      Open record
                    </Button>
                  )
                ) : null
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

export const AppointmentRecordStory: Story = {
  name: "AppointmentRecord",
  render: () => (
    <Cases>
      <Case label="Patient view: booked, video, cancelled and rescheduled, completed, no show">
        <Visits audience="patient" />
      </Case>
      <Case label="Staff view, with the visit reason and cancellation details">
        <Visits audience="staff" />
      </Case>
      <Case label="Summary layout">
        <AppointmentRecord
          appointment={appointments[1]!}
          audience="patient"
          layout="summary"
          today={TODAY}
          viewerZone="America/Los_Angeles"
        />
      </Case>
    </Cases>
  ),
};

export const ConsentStatusLineStory: Story = {
  name: "ConsentStatusLine",
  render: () => (
    <Cases>
      <Case label="Treatment and data use, agreed">
        <ConsentStatusLine entry={consentAllowed.types[0]!} timezone={TZ} />
      </Case>
      <Case label="Automated drafting tools, allowed with older wording">
        <ConsentStatusLine entry={consentAllowed.types[1]!} timezone={TZ} />
      </Case>
      <Case label="Automated drafting tools, not allowed">
        <ConsentStatusLine
          entry={consentOff.types[1]!}
          history={consentOff.history}
          timezone={TZ}
        />
      </Case>
      <Case label="Treatment and data use, withdrawn through the clinic">
        <ConsentStatusLine
          entry={consentOff.types[0]!}
          history={consentOff.history}
          timezone={TZ}
        />
      </Case>
    </Cases>
  ),
};

export const ConsentSummaryStory: Story = {
  name: "ConsentSummary",
  render: () => (
    <div className="grid gap-6 md:grid-cols-2">
      <ConsentSummary list={consentAllowed} timezone={TZ} headingAs="h4" />
      <ConsentSummary list={consentOff} timezone={TZ} headingAs="h4" />
    </div>
  ),
};
