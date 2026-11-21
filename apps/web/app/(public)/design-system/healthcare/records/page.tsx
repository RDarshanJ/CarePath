import type { Metadata } from "next";
import {
  ConsentStatusLine,
  ConsentSummary,
  PatientBanner,
  PatientBannerSkeleton,
  PatientRowIdentity,
} from "@carepath/ui";
import { Label, Section, Specimen } from "../../specimen";
import { AppointmentRowsDemo } from "../demos";
import { FamilyPage } from "../families";
import {
  NOW,
  TODAY,
  TZ,
  appointments,
  careTeam,
  consentAllowed,
  consentOff,
  longPatient,
  rowPatients,
  sparsePatient,
} from "../fixtures";
import { AppointmentRecord } from "@carepath/ui";

export const metadata: Metadata = {
  title: "Healthcare components: identity, visits and consent | CarePath",
};

export default function RecordsPage() {
  return (
    <FamilyPage
      slug="records"
      intro="Who the patient is, on single-patient screens only; the second identifier on every list row that opens a patient; one visit read the same way everywhere; and consent in words. Resize the window: the banner is one compact line below 1024 px and moves the born line into the details below 768 px."
    >
      <Section
        id="banner"
        title="Patient banner"
        intro="Identity only, its own labelled section, never in a region that collapses. Name as the record's heading, MRN in mono, born with age, status Tag, record stamp; details behind one button. Missing values read Not recorded. Sticky in the record, unsticking when taller than 30 percent of the window; shown static here."
      >
        <Specimen id="patient-banner" only="clinician" title="Long name, care team, record stamp">
          <PatientBanner
            patient={longPatient}
            today={TODAY}
            clinicZone={TZ}
            recordAsOf={NOW}
            careTeam={careTeam}
            sticky={false}
            nameAs="h2"
          />
        </Specimen>
        <Specimen
          id="patient-banner-states"
          only="clinician"
          title="Missing data, not on the care team, offline, loading"
        >
          <Label>Missing values, care team not assigned, viewer not on the care team</Label>
          <PatientBanner
            patient={sparsePatient}
            today={TODAY}
            clinicZone={TZ}
            careTeam={[]}
            sticky={false}
            nameAs="h2"
          />
          <Label>Offline, care team could not be read</Label>
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
          <Label>Loading</Label>
          <PatientBannerSkeleton />
        </Specimen>
      </Section>

      <Section
        id="rows"
        title="Patient in a list row"
        intro="Name link plus a muted Born line wherever a row opens or acts on a patient. No banner, avatar or photo on lists. Two patients with similar names stay apart by the second line."
      >
        <Specimen id="patient-rows" only="clinician">
          <ul className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
            {rowPatients.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
                <PatientRowIdentity patient={p} href="#banner" />
                <span className="text-small text-ink">{p.task}</span>
              </li>
            ))}
          </ul>
        </Specimen>
      </Section>

      <Section
        id="visits"
        title="Appointment record"
        intro="Time range with the clinic zone named; for a video visit the viewer's own time is added when it differs. One status form with the shared words: Booked and Completed as plain text, the rest as a Tag. The visit reason and cancellation details are for the care team only. Action names carry the date."
      >
        <Specimen
          id="appointment-rows"
          patient={<AppointmentRowsDemo audience="patient" />}
          clinician={<AppointmentRowsDemo audience="staff" />}
        />
        <Specimen
          id="appointment-summary"
          patient={
            <AppointmentRecord
              appointment={appointments[1]!}
              audience="patient"
              layout="summary"
              today={TODAY}
              viewerZone="America/Los_Angeles"
            />
          }
          clinician={
            <AppointmentRecord
              appointment={appointments[0]!}
              audience="staff"
              layout="summary"
              today={TODAY}
              patientHref="#banner"
            />
          }
        />
      </Section>

      <Section
        id="consent"
        title="Consent status"
        intro="State in words with the date and the wording version: Agreed on, Withdrawn on, Not agreed; Allowed since, Not allowed. The clinician sees the same lines read only, with no control, and the reason when generated drafts are blocked. The camera movement consent cannot be granted and is not shown."
      >
        <Specimen
          id="consent-status"
          patient={
            <div className="flex flex-col gap-4">
              <Label>Treatment and data use, agreed</Label>
              <ConsentStatusLine entry={consentAllowed.types[0]!} timezone={TZ} />
              <Label>Automated drafting tools, allowed with older wording</Label>
              <ConsentStatusLine entry={consentAllowed.types[1]!} timezone={TZ} />
              <Label>Automated drafting tools, not allowed</Label>
              <ConsentStatusLine
                entry={consentOff.types[1]!}
                history={consentOff.history}
                timezone={TZ}
              />
              <Label>Treatment and data use, withdrawn through the clinic</Label>
              <ConsentStatusLine
                entry={consentOff.types[0]!}
                history={consentOff.history}
                timezone={TZ}
              />
            </div>
          }
          clinician={
            <div className="grid gap-6 md:grid-cols-2">
              <ConsentSummary list={consentAllowed} timezone={TZ} headingAs="h4" />
              <ConsentSummary list={consentOff} timezone={TZ} headingAs="h4" />
            </div>
          }
        />
      </Section>
    </FamilyPage>
  );
}
