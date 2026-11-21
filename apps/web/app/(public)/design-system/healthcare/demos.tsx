"use client";

import { useState } from "react";
import {
  AIDraftBlock,
  AppointmentRecord,
  Button,
  DeliveryState,
  DoseEditorRow,
  EvidenceRef,
  ExerciseSummary,
  LiveRegion,
  MessageComposer,
  MessageThread,
  ProvenanceLine,
  ReviewDecisionBar,
  StatementSupport,
  appointmentActionLabel,
  editedByText,
  moveAnnouncement,
  reviewSummaryText,
  useAnnouncer,
  type DoseDraft,
  type DoseErrorKey,
} from "@carepath/ui";
import { formatBornText } from "@carepath/shared";
import type { AiSourceType, AiStatement, Message } from "@carepath/shared/contracts";
import {
  TODAY,
  TZ,
  appointments,
  doses,
  exercises,
  patientThread,
  provenance,
  replacementStart,
} from "./fixtures";

/** Live line the gallery uses to show that a control did something. */
function Result({ text }: { text: string | null }) {
  return <LiveRegion visible message={text ?? "Nothing pressed yet."} />;
}

/* ------------------------------------------------------------ visits */

export function AppointmentRowsDemo({ audience }: { audience: "patient" | "staff" }) {
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
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
                patientHref={audience === "staff" ? "#banner" : undefined}
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
                          onClick={() => setLast(appointmentActionLabel("Reschedule", a))}
                        >
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          tone="critical"
                          aria-label={appointmentActionLabel("Cancel", a)}
                          onClick={() => setLast(appointmentActionLabel("Cancel", a))}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="neutral"
                        aria-label={appointmentActionLabel("Open record for the", a)}
                        onClick={() => setLast(appointmentActionLabel("Open record for the", a))}
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
      <Result text={last ? `Pressed: ${last}.` : null} />
    </div>
  );
}

/* ------------------------------------------------------------ planning */

export function LibraryDemo() {
  const [inPlan, setInPlan] = useState<string[]>(["Bridge"]);
  const { message, announce } = useAnnouncer();
  const items = [exercises.bridge, exercises.squat, exercises.long];
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
        {items.map((ex) => (
          <li key={ex.name} className="p-3">
            <ExerciseSummary
              exercise={ex}
              variant="library"
              inPlan={inPlan.includes(ex.name)}
              onAdd={() => {
                if (inPlan.includes(ex.name)) return;
                setInPlan((p) => [...p, ex.name]);
                announce(`${ex.name} added to the plan`);
              }}
            />
          </li>
        ))}
      </ul>
      <LiveRegion
        visible
        message={message || "Add an exercise; the list keeps one copy of each."}
      />
    </div>
  );
}

const editorStart: { key: keyof typeof exercises; value: DoseDraft }[] = [
  {
    key: "bridge",
    value: {
      dose: doses.bridge,
      schedule: { daysOfWeek: [1, 3, 5], timesPerDay: 1 },
      instructions: "Keep your back flat at the top.",
    },
  },
  {
    key: "squat",
    value: {
      dose: doses.squat,
      schedule: { daysOfWeek: [2, 4], timesPerDay: 2 },
      instructions: null,
    },
  },
  {
    key: "heel",
    value: {
      dose: doses.heel,
      schedule: { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], timesPerDay: 1 },
      instructions: null,
    },
  },
];

function errorsFor(v: DoseDraft): Partial<Record<DoseErrorKey, string>> {
  const e: Partial<Record<DoseErrorKey, string>> = {};
  if (v.dose.reps === null && v.dose.durationSeconds === null && v.dose.holdSeconds === null)
    e.dose = "Give repetitions, a duration or a hold time.";
  if (v.dose.reps !== null && (v.dose.reps < 1 || v.dose.reps > 200))
    e.reps = "Enter repetitions from 1 to 200.";
  if (v.schedule.daysOfWeek.length === 0) e.daysOfWeek = "Choose at least one day.";
  return e;
}

export function DoseEditorDemo() {
  const [rows, setRows] = useState(editorStart);
  const [removed, setRemoved] = useState<string | null>(null);
  const { message, announce } = useAnnouncer();
  const move = (i: number, dir: "up" | "down") => {
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setRows(next);
    announce(moveAnnouncement(exercises[next[j]!.key].name, j + 1, next.length));
  };
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.key}>
            <DoseEditorRow
              exercise={exercises[r.key]}
              value={r.value}
              errors={errorsFor(r.value)}
              idPrefix={`dose-${r.key}`}
              index={i}
              total={rows.length}
              onMove={(dir) => move(i, dir)}
              onChange={(value) =>
                setRows((all) => all.map((x) => (x.key === r.key ? { ...x, value } : x)))
              }
              onRemove={() => {
                setRows((all) => all.filter((x) => x.key !== r.key));
                setRemoved(exercises[r.key].name);
                announce(`Removed ${exercises[r.key].name}`);
              }}
            />
          </li>
        ))}
      </ol>
      {removed ? (
        <p className="flex flex-wrap items-center gap-2 text-small text-ink">
          Removed {removed}.
          <Button
            size="sm"
            variant="quiet"
            onClick={() => {
              const back = editorStart.find((x) => exercises[x.key].name === removed);
              if (back) setRows((all) => [...all, back]);
              setRemoved(null);
              announce(`${removed} is back in the plan`);
            }}
          >
            Undo
          </Button>
        </p>
      ) : null}
      <LiveRegion message={message} />
    </div>
  );
}

/* ------------------------------------------------------------ messaging */

export function PatientMessagingDemo() {
  const [messages, setMessages] = useState<Message[]>(patientThread);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <MessageThread
        variant="patient"
        timezone={TZ}
        label="Messages with your care team"
        messages={messages}
        newFromId="m2"
        retryingId={retrying}
        stillNotSent={tries > 0}
        onRetry={(id) => {
          setRetrying(id);
          setTimeout(() => {
            setRetrying(null);
            setTries((t) => t + 1);
          }, 400);
        }}
      />
      <MessageComposer
        audience="patient"
        value={value}
        onChange={(v) => {
          setValue(v);
          setStatus(null);
        }}
        sending={sending}
        statusMessage={status}
        replyTimeText="Your care team usually replies within one business day."
        clinicPhone="(602) 555-0142"
        startingPoints={messages.length === 0 ? ["I have a question about an exercise."] : []}
        onSend={(body) => {
          setSending(true);
          setTimeout(() => {
            setMessages((all) => [
              ...all,
              {
                ...all[0]!,
                id: `n${all.length}`,
                body,
                createdAt: "2026-11-19T16:00:00Z",
                status: "sent",
              },
            ]);
            setValue("");
            setSending(false);
            setStatus(
              "Sent. Your care team usually replies within one business day. For anything urgent, call the clinic.",
            );
          }, 400);
        }}
      />
    </div>
  );
}

export function StarterComposerDemo() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  return (
    <MessageComposer
      audience="patient"
      sticky={false}
      value={value}
      onChange={setValue}
      statusMessage={status}
      replyTimeText={null}
      clinicPhone={null}
      contactHref="#emergency"
      startingPoints={["I have a question about an exercise.", "I need to change a visit."]}
      onSend={() => {
        setValue("");
        setStatus("Sent. For anything urgent, call the clinic.");
      }}
    />
  );
}

export function StaffComposerDemo() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  return (
    <MessageComposer
      audience="staff"
      patientName="Maria Okonkwo-Lindqvist"
      value={value}
      onChange={(v) => {
        setValue(v);
        setStatus(null);
      }}
      error={failed ? "The connection dropped before the message reached the server." : null}
      statusMessage={status}
      replyTimeText="The patient was told: replies within one business day."
      onSend={(body) => {
        if (/fail/i.test(body)) {
          setFailed(true);
          return;
        }
        setFailed(false);
        setValue("");
        setStatus("Sent.");
      }}
    />
  );
}

/* ------------------------------------------------------------ generated drafts */

interface DemoStatement extends Pick<
  AiStatement,
  "id" | "text" | "support" | "resolution" | "note"
> {
  refs: { type: AiSourceType; at: string }[];
}

const statements: DemoStatement[] = [
  {
    id: "s2",
    text: "Patient reported knee pain after mini squats on Nov 17.",
    support: "unsupported",
    resolution: "unchanged",
    note: null,
    refs: [],
  },
  {
    id: "s1",
    text: "Pain ratings were 4, 5 and 3 of 10 at the three check-ins from Nov 15 to Nov 19.",
    support: "supported",
    resolution: "unchanged",
    note: null,
    refs: [
      { type: "check_in", at: "2026-11-15T16:00:00Z" },
      { type: "check_in", at: "2026-11-17T16:00:00Z" },
      { type: "check_in", at: "2026-11-19T15:00:00Z" },
    ],
  },
  {
    id: "s3",
    text: "One session on Nov 17 was stopped for discomfort.",
    support: "supported",
    resolution: "edited",
    note: null,
    refs: [{ type: "exercise_session", at: "2026-11-17T17:30:00Z" }],
  },
  {
    id: "s4",
    text: "The patient asked how far the heel should slide.",
    support: "unsupported",
    resolution: "acknowledged",
    note: "Asked at the visit on Nov 19; the message did not send.",
    refs: [],
  },
];

export function EvidenceDemo() {
  const [opened, setOpened] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <AIDraftBlock
        state="unreviewed"
        provider={provenance.provider}
        title="Progress summary, Nov 5 to Nov 19"
        provenance={
          <ProvenanceLine
            input={provenance}
            edited={editedByText("Dana Whitfield", "2026-11-19T16:05:00Z", TZ)}
          />
        }
      >
        <ol className="flex flex-col gap-3">
          {statements.map((s) => (
            <li key={s.id} id={`statement-${s.id}`} className="flex flex-col gap-1">
              <p>
                {s.text}
                {s.refs.map((r, i) => {
                  const key = `${s.id}-${i}`;
                  return (
                    <EvidenceRef
                      key={key}
                      n={i + 1}
                      sourceType={r.type}
                      occurredAt={r.at}
                      timezone={TZ}
                      opened={opened.includes(key)}
                      selected={selected === key}
                      onOpen={() => {
                        setSelected(key);
                        setOpened((o) => (o.includes(key) ? o : [...o, key]));
                      }}
                    />
                  );
                })}
              </p>
              <StatementSupport statement={s} noteBy="Dana Whitfield" />
            </li>
          ))}
        </ol>
      </AIDraftBlock>
      <LiveRegion
        visible
        message={
          selected
            ? `Evidence ${selected.split("-")[1] ? Number(selected.split("-")[1]) + 1 : 1} for statement ${selected.split("-")[0]} would open in the evidence panel. ${opened.length} opened so far.`
            : "Select a reference number to open its source record."
        }
      />
    </div>
  );
}

export function DecisionBarDemo() {
  const [resolved, setResolved] = useState(false);
  const [decided, setDecided] = useState<string | null>(null);
  const blockers = resolved
    ? []
    : [
        { code: "unsupported_unresolved" as const, statementIds: ["s2"], items: [] },
        {
          code: "missing_unacknowledged" as const,
          statementIds: [],
          items: ["pain_score_at_visit"],
        },
        { code: "evidence_not_opened" as const, statementIds: ["s1"], items: [] },
      ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="neutral" onClick={() => setResolved((r) => !r)}>
          {resolved ? "Show the blocked state" : "Resolve every blocker (specimen only)"}
        </Button>
      </div>
      {decided ? (
        <AIDraftBlock
          state={decided === "approve" ? "approved_with_edits" : "rejected"}
          provider={provenance.provider}
          decisionLine={
            decided === "approve" ? "by Dana Whitfield, Nov 19, 9:10 AM MST" : `Reason: ${decided}`
          }
          notSigned={decided === "approve"}
          actions={
            <Button size="sm" variant="neutral" onClick={() => setDecided(null)}>
              Reset specimen
            </Button>
          }
        >
          Pain ratings were 4, 5 and 3 of 10 at the three check-ins from Nov 15 to Nov 19.
        </AIDraftBlock>
      ) : (
        <ReviewDecisionBar
          sticky={false}
          blockers={blockers}
          allowed={resolved}
          hasEdits
          summary={reviewSummaryText(
            { statementCount: 4, supportedCount: 2, unsupportedCount: 2 },
            1,
          )}
          statementHref={(id) => `#statement-${id}`}
          missingHref="#missing-information"
          onApprove={() => setDecided("approve")}
          onReject={(reason) => setDecided(reason)}
        />
      )}
    </div>
  );
}

export function DecisionStatesDemo() {
  const [last, setLast] = useState<string | null>(null);
  const summary = reviewSummaryText(
    { statementCount: 4, supportedCount: 4, unsupportedCount: 0 },
    0,
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption font-semibold text-ink-muted">Offline</p>
      <ReviewDecisionBar
        sticky={false}
        blockers={[]}
        allowed
        hasEdits={false}
        summary={summary}
        offline
        onApprove={() => setLast("Approve")}
        onReject={(r) => setLast(`Reject, reason: ${r}`)}
      />
      <p className="text-caption font-semibold text-ink-muted">
        Consent withdrawn, and the last decision failed to save
      </p>
      <ReviewDecisionBar
        sticky={false}
        blockers={[{ code: "consent_withdrawn", statementIds: [], items: [] }]}
        allowed={false}
        hasEdits={false}
        summary={summary}
        error="Check your connection and try again."
        onApprove={() => setLast("Approve")}
        onReject={(r) => setLast(`Reject, reason: ${r}`)}
      />
      <p className="text-caption font-semibold text-ink-muted">Not on the care team</p>
      <ReviewDecisionBar
        sticky={false}
        blockers={[]}
        allowed
        hasEdits={false}
        summary=""
        canDecide={false}
        onApprove={() => setLast("Approve")}
        onReject={() => setLast("Reject")}
      />
      <Result text={last ? `Pressed: ${last}.` : null} />
    </div>
  );
}

export function DeliveryStatesDemo() {
  const [retrying, setRetrying] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <DeliveryState message={patientThread[3]!} />
      <DeliveryState message={patientThread[0]!} />
      <DeliveryState
        message={patientThread[2]!}
        retrying={retrying}
        onRetry={() => {
          setRetrying(true);
          setTimeout(() => {
            setRetrying(false);
            setLast("Retry sending pressed; the specimen stays not sent.");
          }, 400);
        }}
      />
      <DeliveryState message={{ ...patientThread[2]!, canRetry: false }} />
      <Result text={last} />
    </div>
  );
}
