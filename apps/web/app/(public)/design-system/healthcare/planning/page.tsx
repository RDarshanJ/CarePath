import type { Metadata } from "next";
import { ExerciseSummary, PlanDiff, PlanStateLine, VersionList } from "@carepath/ui";
import { Label, Section, Specimen } from "../../specimen";
import { DoseEditorDemo, LibraryDemo } from "../demos";
import { FamilyPage } from "../families";
import { TZ, diffEmpty, diffV3, doses, exercises, versions } from "../fixtures";

export const metadata: Metadata = {
  title: "Healthcare components: treatment planning | CarePath",
};

const draft = { updatedAt: "2026-11-19T16:02:00Z", counts: { added: 1, removed: 1, changed: 2 } };

export default function PlanningPage() {
  return (
    <FamilyPage
      slug="planning"
      intro="One exercise row everywhere an exercise is listed, a dose editor with typed fields and visible move buttons, plan changes in words for each audience, versions newest first, and one plan state line with four words. Exercise content is fictional and not medically reviewed."
    >
      <Section
        id="exercise"
        title="Exercise row"
        intro="Picture when there is one (decorative, the name is beside it), name, body area and category, dose and days, the therapist's note, instructions behind a disclosure. Long names wrap. In the library, an exercise already in the plan reads In the plan and cannot be added twice."
      >
        <Specimen id="exercise-library" only="clinician" title="Library">
          <LibraryDemo />
        </Specimen>
        <Specimen id="exercise-plan" only="patient" title="Patient plan and session overview">
          <ul className="flex flex-col gap-4">
            <li>
              <ExerciseSummary
                exercise={exercises.squat}
                variant="plan"
                dose={doses.squat}
                schedule={{ daysOfWeek: [2, 4], timesPerDay: 2 }}
                clinicianInstructions="Hold the counter the whole time."
              />
            </li>
            <li>
              <ExerciseSummary
                exercise={exercises.long}
                variant="plan"
                dose={doses.long}
                schedule={{ daysOfWeek: [1, 3, 5], timesPerDay: 1 }}
              />
            </li>
            <li>
              <ExerciseSummary
                exercise={exercises.heel}
                variant="session-overview"
                dose={doses.heel}
              />
            </li>
          </ul>
        </Specimen>
      </Section>

      <Section
        id="dose"
        title="Dose editor"
        intro="The summary line is the same dose string the patient reads. Edit dose opens labelled number fields with units in the label, the days, times per day and the note to the patient. Move up and move down keep focus on the moved item and announce the new position; at the ends the button is unavailable and says why. Clear Repetitions on the Bridge or untick every day to see the errors."
      >
        <Specimen id="dose-editor" only="clinician">
          <DoseEditorDemo />
        </Specimen>
      </Section>

      <Section
        id="diff"
        title="Plan changes"
        intro="Added, removed and changed exercises in words with group labels. Field words follow the audience. Clinicians also see that only exercises are compared, so an empty list is not read as no change."
      >
        <Specimen
          id="plan-diff"
          patient={
            <div className="flex flex-col gap-4">
              <PlanDiff diff={diffV3} audience="patient" heading="What changed in version 3" />
              <Label>First version</Label>
              <PlanDiff diff={null} audience="patient" />
            </div>
          }
          clinician={
            <div className="flex flex-col gap-4">
              <PlanDiff
                diff={diffV3}
                audience="staff"
                heading="Version 3 compared with version 2"
              />
              <Label>Nothing added, removed or changed</Label>
              <PlanDiff diff={diffEmpty} audience="staff" />
            </div>
          }
        />
      </Section>

      <Section
        id="versions"
        title="Version history"
        intro="Newest first. Current or Earlier version as a Tag, the date, the author for staff, the note to the patient, a What changed disclosure. No restore: published versions cannot be changed."
      >
        <Specimen
          id="version-list"
          patient={
            <VersionList
              versions={versions}
              audience="patient"
              timezone={TZ}
              diffs={{ v3: diffV3, v2: diffEmpty, v1: null }}
              headingAs="h3"
            />
          }
          clinician={
            <div className="flex flex-col gap-6">
              <VersionList
                versions={versions}
                audience="staff"
                timezone={TZ}
                diffs={{ v3: diffV3, v2: diffEmpty, v1: null }}
                headingAs="h3"
              />
              <VersionList
                versions={[{ ...versions[0]!, isCurrent: true }]}
                audience="staff"
                timezone={TZ}
                headingAs="h3"
              />
              <VersionList versions={[]} audience="staff" timezone={TZ} headingAs="h3" />
              <VersionList
                versions={[]}
                audience="staff"
                timezone={TZ}
                state="error"
                headingAs="h3"
              />
            </div>
          }
        />
      </Section>

      <Section
        id="state"
        title="Plan state"
        intro="Draft; Published, version N; Draft differs from version N; Earlier version. The sentence says what the patient sees. Patients see Current plan, version N or Earlier version, never Draft."
      >
        <Specimen
          id="plan-state"
          patient={
            <div className="flex flex-col gap-3">
              <PlanStateLine audience="patient" currentVersion={3} timezone={TZ} />
              <PlanStateLine
                audience="patient"
                currentVersion={3}
                viewingVersion={2}
                timezone={TZ}
              />
              <PlanStateLine audience="patient" currentVersion={null} timezone={TZ} />
            </div>
          }
          clinician={
            <div className="flex flex-col gap-3">
              <PlanStateLine audience="staff" currentVersion={null} timezone={TZ} />
              <PlanStateLine audience="staff" currentVersion={null} draft={draft} timezone={TZ} />
              <PlanStateLine audience="staff" currentVersion={3} timezone={TZ} />
              <PlanStateLine audience="staff" currentVersion={3} draft={draft} timezone={TZ} />
              <PlanStateLine audience="staff" currentVersion={3} viewingVersion={2} timezone={TZ} />
              <PlanStateLine
                audience="staff"
                currentVersion={3}
                draft={draft}
                timezone={TZ}
                state="stale"
              />
              <PlanStateLine audience="staff" currentVersion={3} timezone={TZ} state="loading" />
              <PlanStateLine audience="staff" currentVersion={3} timezone={TZ} state="error" />
            </div>
          }
        />
      </Section>
    </FamilyPage>
  );
}
