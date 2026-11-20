"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Dialog, DrawerContent } from "@carepath/ui";
import {
  intakeAnswerSchemas,
  type IntakeAnswers,
  type IntakeState,
  type IntakeStep,
} from "@carepath/shared/contracts";
import { ApiError } from "../../../lib/api/errors";
import { useClinician } from "../_lib/context";
import { formatDateTime, weekdayLabels } from "../_lib/format";
import { keys, reads } from "../_lib/queries";
import { Empty, ListSkeleton, QueryError, Section } from "./common";

export const INTAKE_HEADING = "What the patient told us at intake";

const stepName: Record<IntakeStep, string> = {
  personal_information: "personal information",
  primary_goal: "primary goal",
  body_area: "body area",
  pain_levels: "pain levels",
  activity_limitations: "activity limitations",
  clinician_preferences: "therapist preferences",
  appointment_availability: "appointment availability",
  consent: "consent",
  review: "review",
};

const limitationText: Record<string, string> = {
  walking: "Walking",
  stairs: "Stairs",
  sitting: "Sitting",
  standing: "Standing",
  lifting: "Lifting",
  reaching_overhead: "Reaching overhead",
  sleeping: "Sleeping",
  driving: "Driving",
  exercise_or_sport: "Exercise or sport",
  work_tasks: "Work tasks",
};
const sideText = {
  left: "left side",
  right: "right side",
  both: "both sides",
  not_applicable: "side not applicable",
} as const;
const genderText = {
  no_preference: "No preference",
  female: "A female therapist",
  male: "A male therapist",
} as const;
const languageText = { no_preference: "No preference", en: "English", es: "Spanish" } as const;
const timeText = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

function answersOf<S extends IntakeStep>(state: IntakeState, step: S) {
  const found = state.steps.find((s) => s.step === step);
  if (!found?.answers) return null;
  const parsed = intakeAnswerSchemas[step].safeParse(found.answers);
  return parsed.success ? (parsed.data as IntakeAnswers[S]) : null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="col-span-1 text-ink-muted">{label}</dt>
      <dd className="col-span-3 min-w-0 text-ink">{children}</dd>
    </>
  );
}

const unanswered = <span className="text-ink-muted">Not answered</span>;

/** The patient's own intake answers, as submitted. Nothing here is a clinical finding. */
export function IntakeAnswerList({ state }: { state: IntakeState }) {
  const { timezone } = useClinician();
  const goal = answersOf(state, "primary_goal");
  const area = answersOf(state, "body_area");
  const pain = answersOf(state, "pain_levels");
  const limits = answersOf(state, "activity_limitations");
  const prefs = answersOf(state, "clinician_preferences");
  const avail = answersOf(state, "appointment_availability");

  const days = avail ? [...avail.days].sort((a, b) => a - b).map((d) => weekdayLabels[d]) : [];
  const times = avail ? avail.times.map((t) => timeText[t]) : [];
  const submitted = state.submittedAt
    ? `Submitted ${formatDateTime(state.submittedAt, timezone)}`
    : `Not submitted yet. Last saved ${formatDateTime(state.updatedAt, timezone)}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-ink-muted">
        {submitted}. Written by the patient, not verified.
      </p>
      {state.submittedAt === null && state.missing.length > 0 ? (
        <p className="text-small text-ink">
          Still to answer: {state.missing.map((m) => stepName[m]).join(", ")}.
        </p>
      ) : null}
      <dl className="grid grid-cols-4 gap-x-4 gap-y-2 text-body">
        <Row label="Main goal">{goal ? goal.goal : unanswered}</Row>
        <Row label="Body area">
          {area ? (
            <>
              {area.bodyArea.charAt(0).toUpperCase() + area.bodyArea.slice(1)},{" "}
              {sideText[area.side]}
            </>
          ) : (
            unanswered
          )}
        </Row>
        <Row label="Pain (patient-reported)">
          {pain ? (
            <span className="tabular-nums">
              Now {pain.current} of 10. Worst last week {pain.worstLastWeek}, best last week{" "}
              {pain.bestLastWeek}.
            </span>
          ) : (
            unanswered
          )}
        </Row>
        <Row label="Limitations">
          {limits ? (
            limits.limitations.length > 0 || limits.other ? (
              <>
                {limits.limitations.map((l) => limitationText[l] ?? l).join(", ")}
                {limits.other ? (
                  <span className="block">
                    {limits.limitations.length > 0 ? "Also: " : ""}
                    {limits.other}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-ink-muted">None selected</span>
            )
          ) : (
            unanswered
          )}
        </Row>
        <Row label="Therapist preferences">
          {prefs ? (
            <>
              <span className="block">
                Gender: {genderText[prefs.genderPreference]}. Language:{" "}
                {languageText[prefs.languagePreference]}.
              </span>
              {prefs.notes ? <span className="block">{prefs.notes}</span> : null}
            </>
          ) : (
            unanswered
          )}
        </Row>
        <Row label="Availability">
          {avail ? `${days.join(", ")}. ${times.join(", ")}.` : unanswered}
        </Row>
      </dl>
    </div>
  );
}

/** Loads the intake and shows it, or the plain reason it cannot be shown. */
export function IntakeBody({ patientId }: { patientId: string }) {
  const intake = useQuery({
    queryKey: keys.intake(patientId),
    queryFn: () => reads.intake(patientId),
    retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 1,
  });
  if (intake.isError) {
    if (intake.error instanceof ApiError && intake.error.code === "not_found") {
      return (
        <Empty icon="clipboard" title="No intake on file">
          This patient has not started the intake questions.
        </Empty>
      );
    }
    return <QueryError error={intake.error} onRetry={() => void intake.refetch()} />;
  }
  if (!intake.data) return <ListSkeleton rows={4} label="Loading intake" />;
  return <IntakeAnswerList state={intake.data} />;
}

/** The section on the Overview tab. */
export function IntakeSection({ patientId }: { patientId: string }) {
  return (
    <Section id="intake" title={INTAKE_HEADING}>
      <div className="p-4">
        <IntakeBody patientId={patientId} />
      </div>
    </Section>
  );
}

/** "See intake": opens the patient's intake answers in a drawer without leaving the page. */
export function IntakeDrawerButton({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        See intake
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DrawerContent
          title={`Intake for ${patientName}`}
          description="What the patient told us when they signed up. It is the patient's own account."
          className="max-w-xl"
        >
          <IntakeBody patientId={patientId} />
        </DrawerContent>
      </Dialog>
    </>
  );
}
