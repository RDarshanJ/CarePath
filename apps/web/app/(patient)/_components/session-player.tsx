"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  exerciseSessionDetailSchema,
  type ClinicCard,
  type ExerciseSessionDetail,
  type SessionActivity,
  type SessionActivityUpdate,
} from "@carepath/shared/contracts";
import { painNoticeMessage } from "@carepath/shared";
import {
  Banner,
  Button,
  cx,
  DrawerContent,
  Dialog,
  Field,
  Heading,
  Icon,
  PainScale,
  Progress,
  Radio,
  RadioGroup,
  Textarea,
} from "@carepath/ui";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";
import { clock, doseText, restText, secondsText } from "../_lib/format";
import { ButtonLink } from "./button-link";
import { CheckInForm } from "./check-in-form";
import { useCountdown, useElapsed } from "./use-timers";

/** Views after the first render move focus to their heading so the change is announced; the first render does not. */
const FocusContext = createContext<{ current: boolean }>({ current: true });

function ViewHeading({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const first = useContext(FocusContext);
  const Tag = level === 1 ? "h1" : "h2";
  useEffect(() => {
    if (!first.current) ref.current?.focus();
  }, [first]);
  return (
    <Tag
      ref={ref}
      tabIndex={-1}
      className={cx(
        "font-heading font-semibold text-ink focus:outline-none",
        level === 1 ? "text-h1" : "text-h2",
      )}
    >
      {children}
    </Tag>
  );
}

const skipReasons = [
  "It hurts",
  "I do not have the space or equipment",
  "I am too tired today",
  "I am not sure how to do it",
] as const;
const OTHER = "Other";

function statusWord(a: SessionActivity, isCurrent: boolean): string {
  if (a.status === "completed") return "Done";
  if (a.status === "skipped") return "Skipped";
  return isCurrent ? "Now" : "Up next";
}

function ExerciseList({
  activities,
  currentId,
}: {
  activities: SessionActivity[];
  currentId: string | null;
}) {
  return (
    <section
      aria-labelledby="all-exercises"
      className="flex flex-col gap-2 border-t border-border pt-5"
    >
      <Heading level={4} as="h2" id="all-exercises">
        Today&apos;s exercises
      </Heading>
      <ol className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
        {activities.map((a, i) => {
          const isCurrent = a.id === currentId;
          return (
            <li
              key={a.id}
              className="flex items-baseline justify-between gap-3 px-4 py-3 text-body"
            >
              <span className={isCurrent ? "font-semibold" : undefined}>
                {i + 1}. {a.exercise.name}
              </span>
              <span className="flex items-center gap-1.5 text-small text-ink-muted">
                {a.status === "completed" ? <Icon name="check" size={16} /> : null}
                {statusWord(a, isCurrent)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function messageFor(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "session_closed")
      return "This session has already ended. Go back to Today to see where it stands.";
    if (e.code === "invalid_transition")
      return "That step is not available right now. Reload the page to see where the session stands.";
  }
  return "That did not save. Your place in the session is unchanged. Try again.";
}

export interface SessionPlayerProps {
  patientId: string;
  initial: ExerciseSessionDetail;
  clinic: ClinicCard;
}

/**
 * The guided session (Scenario C). Every step is saved by the API as it happens, and the page
 * address names the session, so a reload resumes at the first exercise not yet done (AC-C1).
 * Everything works by tap or keyboard; there is no camera and no drag.
 */
export function SessionPlayer({ patientId, initial, clinic }: SessionPlayerProps) {
  const [session, setSession] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);

  const base = `/patients/${patientId}/sessions/${session.id}`;
  const elapsed = useElapsed(session.status === "in_progress", session.elapsedSeconds);

  async function act(request: () => Promise<ExerciseSessionDetail>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      setSession(await request());
      return true;
    } catch (e) {
      setError(messageFor(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const post = (path: string, body: unknown) =>
    api.post(`${base}/${path}`, exerciseSessionDetailSchema, body);

  const activities = session.activities;
  const pending = activities.filter((a) => a.status === "pending");
  const current = pending[0] ?? null;
  const currentIndex = current ? activities.indexOf(current) : activities.length - 1;
  const doneCount = activities.length - pending.length;
  const progressBase = { currentPosition: Math.max(0, currentIndex), elapsedSeconds: elapsed };

  let view: ReactNode;
  if (session.status === "paused") {
    view = (
      <div className="flex flex-col gap-5">
        <ViewHeading>Session paused</ViewHeading>
        <p className="max-w-measure text-body">
          Your place is saved: exercise {Math.min(currentIndex + 1, activities.length)} of{" "}
          {activities.length}. Resume when you are ready. Nothing is lost if you close this page.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            loading={busy}
            loadingLabel="Resuming"
            onClick={() => act(() => post("resume", {}))}
            className="w-full sm:w-auto"
          >
            Resume session
          </Button>
          <ButtonLink href="/today" variant="secondary" className="w-full sm:w-auto">
            Back to Today
          </ButtonLink>
        </div>
        <ExerciseList activities={activities} currentId={current?.id ?? null} />
      </div>
    );
  } else if (session.status === "stopped_discomfort") {
    const level = activities.find((a) => a.discomfortLevel !== null)?.discomfortLevel ?? 0;
    view = (
      <div className="flex flex-col gap-6">
        <ViewHeading>Session stopped</ViewHeading>
        <p className="max-w-measure text-body">
          Thank you for stopping and telling us. The session ended for discomfort.{" "}
          <span className="font-medium">Your therapist will see this.</span>
        </p>
        <Banner tone="warning" title="Contact your clinic if you are worried">
          <p>{painNoticeMessage(level, clinic.phone)}</p>
          <p className="mt-2 font-medium">{clinic.emergencyNotice}</p>
        </Banner>
        {session.checkInRequested ? (
          <section
            aria-labelledby="report-pain"
            className="flex flex-col gap-4 border-t border-border pt-5"
          >
            <CheckInForm
              patientId={patientId}
              sessionId={session.id}
              headingLevel={2}
              heading="Report your pain"
              intro="Choose the number that fits how you feel now. This adds to what you already told us."
            />
          </section>
        ) : (
          <div>
            <ButtonLink href="/today">Back to Today</ButtonLink>
          </div>
        )}
      </div>
    );
  } else if (session.status === "completed") {
    const skipped = activities.filter((a) => a.status === "skipped");
    view = (
      <div className="flex flex-col gap-6">
        <ViewHeading>Session complete</ViewHeading>
        <p className="max-w-measure text-body">
          {session.activityCounts.completed} of {session.activityCounts.total} exercises done
          {skipped.length > 0 ? `, ${skipped.length} skipped` : ""}.{" "}
          {session.elapsedSeconds > 0
            ? `About ${secondsText(Math.max(60, Math.round(session.elapsedSeconds / 60) * 60))}.`
            : ""}
        </p>
        <ExerciseList activities={activities} currentId={null} />
        {session.checkInRequested ? (
          <section className="flex flex-col gap-4 border-t border-border pt-5">
            <CheckInForm
              patientId={patientId}
              sessionId={session.id}
              headingLevel={2}
              heading="How did it go?"
              intro="One number is enough. Your therapist will see it."
            />
          </section>
        ) : (
          <div>
            <ButtonLink href="/today">Back to Today</ButtonLink>
          </div>
        )}
      </div>
    );
  } else if (session.status === "abandoned") {
    view = (
      <div className="flex flex-col gap-5">
        <ViewHeading>This session ended</ViewHeading>
        <p className="max-w-measure text-body">
          It was left open for more than a day, so CarePath closed it. What you recorded is kept.
        </p>
        <div>
          <ButtonLink href="/today">Back to Today</ButtonLink>
        </div>
      </div>
    );
  } else if (!current) {
    view = (
      <div className="flex flex-col gap-5">
        <ViewHeading>All exercises done</ViewHeading>
        <p className="max-w-measure text-body">
          Finish the session to save it and tell your therapist how it went.
        </p>
        <div>
          <Button
            loading={busy}
            loadingLabel="Finishing"
            onClick={() => act(() => post("complete", progressBase))}
            className="w-full sm:w-auto"
          >
            Finish session
          </Button>
        </div>
        <ExerciseList activities={activities} currentId={null} />
      </div>
    );
  } else {
    view = (
      <ExerciseView
        key={current.id}
        session={session}
        activity={current}
        index={currentIndex}
        doneCount={doneCount}
        busy={busy}
        onPause={() => act(() => post("pause", progressBase))}
        onUpdate={(body) =>
          act(() => api.put(`${base}/activities/${current.id}`, exerciseSessionDetailSchema, body))
        }
        onStop={(level, note) =>
          act(() =>
            post("stop", { activityId: current.id, discomfortLevel: level, note: note || null }),
          )
        }
      />
    );
  }

  return (
    <FocusContext.Provider value={first}>
      <div className="flex flex-col gap-5">
        {error ? (
          <Banner tone="error" title="Not saved">
            {error}
          </Banner>
        ) : null}
        {view}
      </div>
    </FocusContext.Provider>
  );
}

interface ExerciseViewProps {
  session: ExerciseSessionDetail;
  activity: SessionActivity;
  index: number;
  doneCount: number;
  busy: boolean;
  onPause: () => Promise<boolean>;
  onUpdate: (body: SessionActivityUpdate) => Promise<boolean>;
  onStop: (level: number, note: string) => Promise<boolean>;
}

function ExerciseView({
  session,
  activity,
  index,
  doneCount,
  busy,
  onPause,
  onUpdate,
  onStop,
}: ExerciseViewProps) {
  const { dose, exercise } = activity;
  const totalSets = dose.sets ?? 1;
  const storageKey = `cp-sets:${activity.id}`;
  const [setsDone, setSetsDone] = useState(0);
  const [resting, setResting] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [skipOpen, setSkipOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);

  // Set progress inside one exercise is kept for this tab so a reload does not lose it. The finished
  // exercise itself is stored by the API.
  useEffect(() => {
    const stored = Number(window.sessionStorage.getItem(storageKey) ?? "0");
    if (Number.isInteger(stored) && stored > 0 && stored < totalSets) setSetsDone(stored);
  }, [storageKey, totalSets]);

  const rest = useCountdown(() => {
    setResting(false);
    setAnnounce("Rest is over. Start the next set when you are ready.");
  });
  const hold = useCountdown(() => setAnnounce("Timer finished."));

  const timedSeconds = dose.holdSeconds ?? dose.durationSeconds ?? null;
  const onLastSet = setsDone + 1 >= totalSets;
  const setLabel = totalSets > 1 ? `Set ${setsDone + 1} of ${totalSets}` : "One set";

  async function doneWithSet() {
    hold.reset();
    if (!onLastSet) {
      const next = setsDone + 1;
      setSetsDone(next);
      window.sessionStorage.setItem(storageKey, String(next));
      if (dose.restSeconds > 0) {
        setResting(true);
        setAnnounce(`Rest for ${secondsText(dose.restSeconds)}.`);
        rest.start(dose.restSeconds);
      }
      return;
    }
    const ok = await onUpdate({
      status: "completed",
      completedSets: totalSets,
      completedReps: dose.reps ?? null,
      durationSeconds: dose.durationSeconds ?? null,
    });
    if (ok) window.sessionStorage.removeItem(storageKey);
  }

  const total = session.activities.length;
  const upNext = session.activities.find((a) => a.status === "pending" && a.id !== activity.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-small font-medium text-ink-muted">
          Exercise {index + 1} of {total}
        </p>
        <Progress
          label="Session progress"
          value={doneCount}
          max={total}
          valueText={`${doneCount} of ${total} exercises done`}
        />
      </div>

      <header className="flex flex-col gap-1">
        <ViewHeading>{exercise.name}</ViewHeading>
        <p className="text-small text-ink-muted">{exercise.description}</p>
      </header>

      <section
        aria-labelledby="dose-heading"
        className="flex flex-col gap-1.5 rounded-container border border-border bg-surface p-4"
      >
        <p id="dose-heading" className="text-small font-medium text-ink-muted">
          Set by your care team
        </p>
        <p className="font-heading text-h3 font-semibold">{doseText(dose)}</p>
        <p className="text-body text-ink-muted">{restText(dose)}.</p>
        <p className="mt-1 text-label font-semibold" data-testid="set-label">
          {setLabel}
        </p>
      </section>

      {activity.clinicianInstructions ? (
        <section aria-labelledby="therapist-note" className="border-l-2 border-primary pl-4">
          <p id="therapist-note" className="text-small font-medium text-ink-muted">
            From your therapist
          </p>
          <p className="max-w-measure text-body">{activity.clinicianInstructions}</p>
        </section>
      ) : null}

      <section aria-labelledby="how-heading" className="flex flex-col gap-1.5">
        <Heading level={4} as="h2" id="how-heading">
          How to do it
        </Heading>
        <p className="max-w-measure whitespace-pre-line text-body">{exercise.instructions}</p>
      </section>

      {timedSeconds && !resting ? (
        <section
          aria-labelledby="timer-heading"
          className="flex flex-col gap-2 rounded-container border border-border p-4"
        >
          <Heading level={4} as="h2" id="timer-heading">
            Timer ({secondsText(timedSeconds)})
          </Heading>
          <p
            role="timer"
            aria-live="off"
            className="font-heading text-h2 font-semibold tabular-nums"
          >
            {clock(hold.remaining ?? timedSeconds)}
          </p>
          <div className="flex flex-wrap gap-2">
            {hold.remaining === null || hold.remaining === 0 ? (
              <Button variant="secondary" size="sm" onClick={() => hold.start(timedSeconds)}>
                Start timer
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={hold.toggle}>
                  {hold.running ? "Pause timer" : "Continue timer"}
                </Button>
                <Button variant="quiet" size="sm" onClick={hold.reset}>
                  Reset timer
                </Button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {resting ? (
        <section
          aria-labelledby="rest-heading"
          className="flex flex-col gap-3 rounded-container border-2 border-primary bg-primary-subtle p-4"
        >
          <Heading level={3} as="h2" id="rest-heading">
            Rest
          </Heading>
          <p
            role="timer"
            aria-live="off"
            className="font-heading text-h1 font-semibold tabular-nums"
            data-testid="rest-timer"
          >
            {clock(rest.remaining ?? 0)}
          </p>
          <p className="text-body">
            Next: set {setsDone + 1} of {totalSets}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                rest.reset();
                setResting(false);
              }}
            >
              Skip rest
            </Button>
            <Button variant="secondary" onClick={rest.toggle}>
              {rest.running ? "Pause rest" : "Continue rest"}
            </Button>
          </div>
        </section>
      ) : (
        <Button loading={busy} loadingLabel="Saving" onClick={doneWithSet} className="w-full">
          {onLastSet
            ? totalSets > 1
              ? `Done with set ${setsDone + 1}, finish exercise`
              : "Done with this exercise"
            : `Done with set ${setsDone + 1}`}
        </Button>
      )}

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => void onPause()} disabled={busy}>
            Pause
          </Button>
          <Button variant="secondary" onClick={() => setSkipOpen(true)} disabled={busy}>
            Skip exercise
          </Button>
        </div>
        <Button
          variant="secondary"
          iconLeft="alert-circle"
          onClick={() => setStopOpen(true)}
          disabled={busy}
          className="w-full border-error-ink text-error-ink"
        >
          Stop, this hurts
        </Button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <div className="flex flex-col gap-1 text-body">
        {upNext ? (
          <p className="text-ink-muted">
            Up next: <span className="font-medium text-ink">{upNext.exercise.name}</span>
          </p>
        ) : (
          <p className="text-ink-muted">This is the last exercise.</p>
        )}
      </div>

      <ExerciseList activities={session.activities} currentId={activity.id} />
      <p className="text-small text-ink-muted">{session.contentNotice}</p>

      <SkipSheet
        open={skipOpen}
        onOpenChange={setSkipOpen}
        busy={busy}
        onConfirm={async (reason) => {
          const ok = await onUpdate({ status: "skipped", skipReason: reason });
          if (ok) window.sessionStorage.removeItem(storageKey);
          return ok;
        }}
      />
      <StopSheet open={stopOpen} onOpenChange={setStopOpen} busy={busy} onConfirm={onStop} />
    </div>
  );
}

function SkipSheet({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    const reason = choice === OTHER ? other.trim() : choice;
    if (!reason) {
      setError(
        choice === OTHER
          ? "Write a few words about why you are skipping, or pick one of the reasons above."
          : "Choose a reason. Your therapist reads it.",
      );
      return;
    }
    setError(null);
    if (await onConfirm(reason)) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        side="bottom"
        title="Skip this exercise?"
        description="It is saved as skipped, with your reason. Your therapist will see it."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Keep exercise
            </Button>
            <Button onClick={confirm} loading={busy} loadingLabel="Saving">
              Skip exercise
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <RadioGroup
            value={choice}
            onValueChange={(v) => {
              setChoice(v);
              setError(null);
            }}
            aria-label="Reason for skipping"
          >
            {[...skipReasons, OTHER].map((r) => (
              <Radio key={r} value={r} label={r} id={`skip-${r.replace(/\W+/g, "-")}`} />
            ))}
          </RadioGroup>
          {choice === OTHER ? (
            <Field label="Your reason" requirement="required" {...(error ? { error } : {})}>
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={other}
                  maxLength={500}
                  onChange={(e) => setOther(e.target.value)}
                />
              )}
            </Field>
          ) : error ? (
            <p
              role="alert"
              className="flex items-start gap-1.5 text-small font-medium text-error-ink"
            >
              <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
              <span>
                <span className="sr-only">Error: </span>
                {error}
              </span>
            </p>
          ) : null}
        </div>
      </DrawerContent>
    </Dialog>
  );
}

function StopSheet({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  onConfirm: (level: number, note: string) => Promise<boolean>;
}) {
  const [level, setLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (level === null) {
      setError("Choose how much it hurts, from 0 to 10, so your therapist knows.");
      return;
    }
    setError(null);
    if (await onConfirm(level, note.trim())) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        side="bottom"
        title="Stop this session?"
        description="This ends today's session and tells your therapist. Your answers so far are kept."
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Keep going
            </Button>
            <Button variant="danger" onClick={confirm} loading={busy} loadingLabel="Stopping">
              Stop session
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <PainScale
            label="How much does it hurt right now?"
            value={level}
            onValueChange={(v) => {
              setLevel(v);
              setError(null);
            }}
          />
          {error ? (
            <p
              role="alert"
              className="flex items-start gap-1.5 text-small font-medium text-error-ink"
            >
              <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
              <span>
                <span className="sr-only">Error: </span>
                {error}
              </span>
            </p>
          ) : null}
          <Field
            label="What happened?"
            requirement="optional"
            why="A few words help your therapist. Skip this if you prefer."
          >
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
        </div>
      </DrawerContent>
    </Dialog>
  );
}
