"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  exerciseSessionDetailSchema,
  type ClinicCard,
  type Dose,
  type ExerciseSessionDetail,
  type SessionActivity,
  type SessionActivityUpdate,
} from "@carepath/shared/contracts";
import {
  painNoticeMessage,
  SESSION_ACTIVITY_CURRENT_LABEL,
  sessionActivityStatusLabels,
} from "@carepath/shared";
import {
  Banner,
  Button,
  Heading,
  Icon,
  Link,
  LiveRegion,
  Progress,
  formatClock,
  spokenDuration,
  useAnnouncer,
} from "@carepath/ui";
import { api } from "../../../../lib/api/client";
import { ApiError } from "../../../../lib/api/errors";
import { IllustrationFigure } from "../../../../components/illustration";
import { exerciseIllustration } from "../../../../lib/illustrations";
import { doseText, plural, restText, secondsText } from "../../_lib/format";
import { CheckInForm } from "../../(app)/check-in/_components/check-in-form";
import { SkipSheet, StopSheet } from "./session-sheets";
import { useFocusClearOf } from "./use-focus-clear";
import { useCountdown, useElapsed, useWakeLock } from "./use-timers";

/*
 * The guided session (feature C, C2: the phase-driven player; DR-004 section 5.2).
 *
 * Phases, one at a time: Work (a set), Rest (between sets), Next (between exercises), Finish, then
 * the ended views (complete, stopped, paused, abandoned). Every phase keeps the same regions and the
 * same control bar: at 390 the order is the exercise name, the dose, the primary action, then the
 * picture and the written steps. The bar is sticky to the top and the bottom of the viewport, so the
 * primary action and "Stop, this hurts" stay on screen while the steps scroll, and when the page is
 * taller than the window (zoom) the bar rides on the bottom edge instead. From 768 the information and
 * the bar form one sticky column beside the picture and steps.
 *
 * Saved by the API: every finished or skipped exercise, pause, resume, stop and finish, so a reload or
 * another device resumes at the first exercise not yet done (AC-C1). Kept in this tab only, as
 * interface state (R1): the set count inside one exercise. Nothing typed goes into browser storage.
 */

/** Views after the first render move focus to their heading so the change is announced (CD-120). */
const FocusContext = createContext<{ current: boolean }>({ current: true });

function ViewHeading({ children }: { children: ReactNode }) {
  const first = useContext(FocusContext);
  const [focus] = useState(() => !first.current);
  return (
    <Heading level={1} focusOnMount={focus} className="text-balance">
      {children}
    </Heading>
  );
}

const setsOf = (dose: Dose) => dose.sets ?? 1;

/** What one set asks for: "12 repetitions, hold 5 seconds". Falls back to the whole dose. */
function perSetText(dose: Dose): string {
  const parts: string[] = [];
  if (dose.reps) parts.push(plural(dose.reps, "repetition"));
  if (dose.holdSeconds) parts.push(`hold ${secondsText(dose.holdSeconds)}`);
  if (dose.durationSeconds) parts.push(secondsText(dose.durationSeconds));
  return parts.length ? parts.join(", ") : doseText(dose);
}

function statusWord(a: SessionActivity, isCurrent: boolean): string {
  if (a.status === "completed") return sessionActivityStatusLabels.completed.patient;
  if (a.status === "skipped") return sessionActivityStatusLabels.skipped.patient;
  return isCurrent ? SESSION_ACTIVITY_CURRENT_LABEL : sessionActivityStatusLabels.pending.patient;
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

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/* ---------- Shared regions ---------- */

function SessionPosition({ index, total, done }: { index: number; total: number; done: number }) {
  return (
    <Progress
      label={`Exercise ${Math.min(index + 1, total)} of ${total}`}
      value={done}
      max={total}
      valueText={`${done} of ${total} done`}
    />
  );
}

/**
 * The control bar: one full-width primary, then the utilities and "Stop, this hurts" in fixed places
 * (CD-421, CD-424). Pause and Skip are `neutral` (DR-004 5.1.1); Stop keeps `tone="critical"` and is
 * never in a menu.
 */
function ControlBar({
  barRef,
  primary,
  utilities,
  onStop,
  stopDisabled,
}: {
  barRef: RefObject<HTMLDivElement | null>;
  primary: ReactNode;
  utilities?: ReactNode;
  onStop: () => void;
  stopDisabled: boolean;
}) {
  return (
    <div
      ref={barRef}
      data-sticky-bar
      data-testid="control-bar"
      className="sticky top-0 bottom-0 z-10 flex flex-col gap-2 rounded-container border border-border bg-surface p-3 md:static"
    >
      {primary}
      <div className="flex flex-wrap gap-2 *:grow">
        {utilities}
        <Button variant="secondary" tone="critical" onClick={onStop} disabled={stopDisabled}>
          Stop, this hurts
        </Button>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Button {...rest} className="h-14! w-full text-h4!">
      {children}
    </Button>
  );
}

/** Two regions that become two columns from 768. Below it they dissolve, so the bar can stick to the whole player. */
function PlayerLayout({ lead, rest }: { lead: ReactNode; rest?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-8">
      <div className="contents md:sticky md:top-4 md:flex md:flex-col md:gap-5">{lead}</div>
      {rest ? <div className="contents md:flex md:flex-col md:gap-5">{rest}</div> : null}
    </div>
  );
}

function ExerciseList({
  activities,
  currentId,
}: {
  activities: SessionActivity[];
  currentId: string | null;
}) {
  return (
    <section aria-labelledby="all-exercises" className="flex flex-col gap-2">
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
              {...(isCurrent ? { "aria-current": "step" as const } : {})}
            >
              <span className={isCurrent ? "font-semibold" : undefined}>
                {i + 1}. {a.exercise.name}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-small text-ink-muted">
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

/** Picture (only the exercise's own, DR-004 U9), the therapist's note and the written steps. */
function ExerciseDetail({
  activity,
  priority,
  showSteps = true,
}: {
  activity: SessionActivity;
  priority: boolean;
  showSteps?: boolean;
}) {
  const picture = exerciseIllustration(activity.exercise, "hero");
  return (
    <>
      {picture ? (
        <IllustrationFigure illustration={picture} priority={priority} className="max-w-sm" />
      ) : null}
      {activity.clinicianInstructions ? (
        <section aria-labelledby="therapist-note" className="border-l-2 border-primary pl-4">
          <p id="therapist-note" className="text-small font-medium text-ink-muted">
            From your therapist
          </p>
          <p className="max-w-measure text-body">{activity.clinicianInstructions}</p>
        </section>
      ) : null}
      {showSteps ? (
        <section aria-labelledby="how-heading" className="flex flex-col gap-1.5">
          <Heading level={4} as="h2" id="how-heading">
            How to do it
          </Heading>
          <p className="text-small text-ink-muted">{activity.exercise.description}</p>
          <p className="max-w-measure text-body whitespace-pre-line">
            {activity.exercise.instructions}
          </p>
        </section>
      ) : null}
    </>
  );
}

/** A decorative draining bar beside a countdown; the numbers and the timer role carry the meaning. */
function DrainBar({ remaining, total }: { remaining: number; total: number }) {
  const share = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return (
    <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
      <div
        className="h-full origin-left rounded-full bg-primary transition-transform duration-1000 ease-linear motion-reduce:transition-none"
        style={{ transform: `scaleX(${share})` }}
      />
    </div>
  );
}

function Countdown({
  label,
  remaining,
  total,
  testId,
}: {
  label: string;
  remaining: number;
  total: number;
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p
        role="timer"
        aria-live="off"
        aria-label={`${label}, ${spokenDuration(remaining)} left`}
        data-testid={testId}
        className="text-data-value-lg font-semibold text-ink tabular-nums"
      >
        {formatClock(remaining)}
      </p>
      <DrainBar remaining={remaining} total={total} />
    </div>
  );
}

function WakeLine({ state }: { state: "on" | "unavailable" | "idle" }) {
  if (state !== "unavailable") return null;
  return (
    <p className="text-small text-ink-muted">
      This browser cannot keep your screen on. If it turns off, your place is saved.
    </p>
  );
}

/* ---------- The player ---------- */

export interface SessionPlayerProps {
  patientId: string;
  initial: ExerciseSessionDetail;
  clinic: ClinicCard;
}

type Action = "done" | "pause" | "resume" | "finish" | "skip" | "stop";

export function SessionPlayer({ patientId, initial, clinic }: SessionPlayerProps) {
  const [session, setSession] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [between, setBetween] = useState<{ fromName: string; restSeconds: number } | null>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const { message, announce } = useAnnouncer();
  const barRef = useRef<HTMLDivElement>(null);
  useFocusClearOf(barRef);
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);

  const base = `/patients/${patientId}/sessions/${session.id}`;
  const running = session.status === "in_progress";
  const elapsed = useElapsed(running, session.elapsedSeconds);
  const wake = useWakeLock(running);

  const activities = session.activities;
  const pendingList = activities.filter((a) => a.status === "pending");
  const current = pendingList[0] ?? null;
  const currentIndex = current ? activities.indexOf(current) : activities.length - 1;
  const doneCount = activities.length - pendingList.length;
  const total = activities.length;
  const progressBase = { currentPosition: Math.max(0, currentIndex), elapsedSeconds: elapsed };
  // Stop needs an activity: the one on screen, or the last one once all are done.
  const stopTarget = current ?? activities[activities.length - 1] ?? null;
  const busy = pending !== null;

  async function act(kind: Action, request: () => Promise<ExerciseSessionDetail>) {
    setPending(kind);
    setError(null);
    try {
      const next = await request();
      setSession(next);
      return next;
    } catch (e) {
      setError(messageFor(e));
      return null;
    } finally {
      setPending(null);
    }
  }
  const post = (path: string, body: unknown) =>
    api.post(`${base}/${path}`, exerciseSessionDetailSchema, body);
  const update = (activity: SessionActivity, body: SessionActivityUpdate) =>
    api.put(`${base}/activities/${activity.id}`, exerciseSessionDetailSchema, body);

  async function completeExercise(activity: SessionActivity) {
    const dose = activity.dose;
    const next = await act("done", () =>
      update(activity, {
        status: "completed",
        completedSets: setsOf(dose),
        completedReps: dose.reps ?? null,
        durationSeconds: dose.durationSeconds ?? null,
      }),
    );
    if (!next) return false;
    window.sessionStorage.removeItem(`cp-sets:${activity.id}`);
    const upcoming = next.activities.find((a) => a.status === "pending");
    if (upcoming) {
      setBetween({ fromName: activity.exercise.name, restSeconds: dose.restSeconds });
      announce(`${activity.exercise.name} done. Next: ${upcoming.exercise.name}.`);
    } else {
      announce("All exercises done.");
    }
    return true;
  }

  async function skipExercise(activity: SessionActivity, reason: string) {
    const next = await act("skip", () =>
      update(activity, { status: "skipped", skipReason: reason }),
    );
    if (!next) return false;
    window.sessionStorage.removeItem(`cp-sets:${activity.id}`);
    setBetween(null);
    return true;
  }

  async function stop(level: number | null, note: string) {
    if (!stopTarget) return false;
    const next = await act("stop", () =>
      post("stop", { activityId: stopTarget.id, discomfortLevel: level, note: note || null }),
    );
    if (!next) return false;
    setBetween(null);
    return true;
  }

  const bar = (primary: ReactNode, utilities?: ReactNode) => (
    <ControlBar
      barRef={barRef}
      primary={primary}
      utilities={utilities}
      onStop={() => setStopOpen(true)}
      stopDisabled={busy || !stopTarget}
    />
  );
  const pauseButton = (
    <Button
      variant="neutral"
      onClick={() => void act("pause", () => post("pause", progressBase))}
      loading={pending === "pause"}
      loadingLabel="Pausing"
      disabled={busy && pending !== "pause"}
    >
      Pause
    </Button>
  );
  const skipButton = (
    <Button variant="neutral" onClick={() => setSkipOpen(true)} disabled={busy}>
      Skip exercise
    </Button>
  );

  let view: ReactNode;
  if (session.status === "paused") {
    view = (
      <PlayerLayout
        lead={
          <>
            <SessionPosition index={currentIndex} total={total} done={doneCount} />
            <header className="flex flex-col gap-2">
              <ViewHeading>Session paused</ViewHeading>
              <p className="max-w-measure text-body">
                Your place is saved{current ? ` at ${current.exercise.name}` : ""}. Nothing is lost
                if you close this page.
              </p>
            </header>
            {bar(
              <PrimaryButton
                loading={pending === "resume"}
                loadingLabel="Resuming"
                disabled={busy}
                onClick={() => void act("resume", () => post("resume", {}))}
              >
                Resume session
              </PrimaryButton>,
              <Button href="/today" variant="neutral">
                Back to Today
              </Button>,
            )}
          </>
        }
        rest={<ExerciseList activities={activities} currentId={current?.id ?? null} />}
      />
    );
  } else if (session.status === "stopped_discomfort") {
    const level = activities.find((a) => a.discomfortLevel !== null)?.discomfortLevel ?? null;
    view = (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-2">
            <ViewHeading>Session stopped</ViewHeading>
            <p className="max-w-measure text-body">
              Thank you for telling us. The session has ended and what you did is kept.{" "}
              <span className="font-medium">Your therapist will see this.</span>
            </p>
          </header>
          {/* The one contact notice on this screen (feature D, item 3). */}
          <Banner tone="warning" title={clinic.name}>
            <p>
              {level !== null ? (
                painNoticeMessage(level, clinic.phone)
              ) : clinic.phone ? (
                <>
                  If you are worried, call your clinic on{" "}
                  <Link href={telHref(clinic.phone)} className="font-medium">
                    {clinic.phone}
                  </Link>
                  .
                </>
              ) : (
                "Contact your clinic. Ask your care team how to reach them."
              )}
            </p>
            <p className="mt-2 font-medium">{clinic.emergencyNotice}</p>
          </Banner>
        </div>
        {session.checkInRequested ? (
          <section aria-label="Report your pain" className="border-t border-border pt-6">
            <CheckInForm
              patientId={patientId}
              sessionId={session.id}
              headingLevel={2}
              heading="Report your pain"
              intro={
                level !== null
                  ? "Change the number if it is different now."
                  : "You stopped without choosing a number. Choose the one that fits how you feel now."
              }
              stoppedAt={level}
              contactShown
            />
          </section>
        ) : (
          <div>
            <Button href="/today" className="w-full sm:w-auto">
              Back to Today
            </Button>
          </div>
        )}
      </div>
    );
  } else if (session.status === "completed") {
    const skipped = session.activityCounts.skipped;
    view = (
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <ViewHeading>Session complete</ViewHeading>
          <p className="max-w-measure text-body">
            {session.activityCounts.completed} of {session.activityCounts.total} exercises done
            {skipped > 0 ? `, ${skipped} skipped` : ""}.
          </p>
        </header>
        {session.checkInRequested ? (
          <section aria-label="How did it go?" className="border-t border-border pt-6">
            <CheckInForm
              patientId={patientId}
              sessionId={session.id}
              headingLevel={2}
              heading="How did it go?"
              intro="One number is enough."
            />
          </section>
        ) : (
          <div>
            <Button href="/today" className="w-full sm:w-auto">
              Back to Today
            </Button>
          </div>
        )}
        <ExerciseList activities={activities} currentId={null} />
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
          <Button href="/today" className="w-full sm:w-auto">
            Back to Today
          </Button>
        </div>
      </div>
    );
  } else if (!current) {
    view = (
      <PlayerLayout
        lead={
          <>
            <SessionPosition index={currentIndex} total={total} done={doneCount} />
            <header className="flex flex-col gap-2">
              <ViewHeading>All exercises done</ViewHeading>
              <p className="max-w-measure text-body">
                Finish the session to save it and tell your therapist how it went.
              </p>
            </header>
            {bar(
              <PrimaryButton
                loading={pending === "finish"}
                loadingLabel="Finishing"
                disabled={busy}
                onClick={() => void act("finish", () => post("complete", progressBase))}
              >
                Finish session
              </PrimaryButton>,
              pauseButton,
            )}
          </>
        }
        rest={<ExerciseList activities={activities} currentId={null} />}
      />
    );
  } else if (between) {
    view = (
      <NextView
        key={`next-${current.id}`}
        activity={current}
        index={currentIndex}
        total={total}
        doneCount={doneCount}
        fromName={between.fromName}
        restSeconds={between.restSeconds}
        announce={announce}
        bar={(primary) =>
          bar(
            primary,
            <>
              {pauseButton}
              {skipButton}
            </>,
          )
        }
        onStart={() => setBetween(null)}
        wake={wake}
      />
    );
  } else {
    view = (
      <ExerciseView
        key={current.id}
        activity={current}
        activities={activities}
        index={currentIndex}
        total={total}
        doneCount={doneCount}
        saving={pending === "done"}
        busy={busy}
        announce={announce}
        bar={bar}
        pauseButton={pauseButton}
        skipButton={skipButton}
        onComplete={() => completeExercise(current)}
        contentNotice={session.contentNotice}
        wake={wake}
      />
    );
  }

  return (
    <FocusContext.Provider value={first}>
      <div data-sticky-layout="patient-flow" className="flex flex-col gap-5">
        {error ? (
          <Banner tone="error" title="Not saved">
            {error}
          </Banner>
        ) : null}
        {view}
        <LiveRegion message={message} />
      </div>
      {current ? (
        <SkipSheet
          key={`skip-${current.id}`}
          open={skipOpen}
          onOpenChange={setSkipOpen}
          busy={pending === "skip"}
          exerciseName={current.exercise.name}
          onConfirm={(reason) => skipExercise(current, reason)}
          onStopInstead={() => {
            setSkipOpen(false);
            setStopOpen(true);
          }}
        />
      ) : null}
      <StopSheet
        open={stopOpen}
        onOpenChange={setStopOpen}
        busy={pending === "stop"}
        onConfirm={stop}
      />
    </FocusContext.Provider>
  );
}

/* ---------- Work and rest: one exercise, set by set ---------- */

interface ExerciseViewProps {
  activity: SessionActivity;
  activities: SessionActivity[];
  index: number;
  total: number;
  doneCount: number;
  saving: boolean;
  busy: boolean;
  announce: (text: string) => void;
  bar: (primary: ReactNode, utilities?: ReactNode) => ReactNode;
  pauseButton: ReactNode;
  skipButton: ReactNode;
  onComplete: () => Promise<boolean>;
  contentNotice: string;
  wake: "on" | "unavailable" | "idle";
}

function ExerciseView({
  activity,
  activities,
  index,
  total,
  doneCount,
  saving,
  busy,
  announce,
  bar,
  pauseButton,
  skipButton,
  onComplete,
  contentNotice,
  wake,
}: ExerciseViewProps) {
  const { dose, exercise } = activity;
  const totalSets = setsOf(dose);
  const storageKey = `cp-sets:${activity.id}`;
  const [setsDone, setSetsDone] = useState(0);
  const [resting, setResting] = useState(false);
  const [holdKey, setHoldKey] = useState(0);

  // The set count inside one exercise is interface state for this tab (R1), so a reload keeps it.
  useEffect(() => {
    const stored = Number(window.sessionStorage.getItem(storageKey) ?? "0");
    if (Number.isInteger(stored) && stored > 0 && stored < totalSets) setSetsDone(stored);
  }, [storageKey, totalSets]);

  const nextSet = setsDone + 1;
  const rest = useCountdown(() => {
    setResting(false);
    announce(`Rest is over. Start set ${nextSet} when you are ready.`);
  });
  // Milestones only (CD-126): ten seconds left, for rests longer than 20 seconds.
  const prevRest = useRef<number | null>(null);
  useEffect(() => {
    const r = rest.remaining;
    if (
      r !== null &&
      prevRest.current !== null &&
      rest.total > 20 &&
      prevRest.current > 10 &&
      r <= 10 &&
      r > 0
    )
      announce("10 seconds left.");
    prevRest.current = r;
  }, [rest.remaining, rest.total, announce]);

  const timedSeconds = dose.holdSeconds ?? dose.durationSeconds ?? null;
  const onLastSet = nextSet >= totalSets;
  const setLabel = totalSets > 1 ? `Set ${nextSet} of ${totalSets}` : "One set";

  async function doneWithSet() {
    setHoldKey((k) => k + 1);
    if (!onLastSet) {
      setSetsDone(nextSet);
      window.sessionStorage.setItem(storageKey, String(nextSet));
      if (dose.restSeconds > 0) {
        setResting(true);
        announce(
          `Set ${setsDone + 1} done. Rest for ${spokenDuration(dose.restSeconds)}. Next: set ${nextSet + 1} of ${totalSets}.`,
        );
        rest.start(dose.restSeconds);
      } else {
        announce(`Set ${setsDone + 1} done. Next: set ${nextSet + 1} of ${totalSets}.`);
      }
      return;
    }
    await onComplete();
  }

  const upNext = activities.find((a) => a.status === "pending" && a.id !== activity.id);
  const firstOfSession = index === 0 && doneCount === 0 && setsDone === 0;

  const detail = (
    <>
      {firstOfSession && !resting ? (
        <div className="rounded-container border border-border bg-surface-sunken p-4">
          <p className="text-label font-medium">Get ready</p>
          <p className="max-w-measure text-body">
            Put your phone where you can see it, with clear space around you. Have a chair or wall
            close if you need support.
          </p>
        </div>
      ) : null}
      <WakeLine state={wake} />
      <ExerciseDetail activity={activity} priority={index === 0} />
      <p className="text-body text-ink-muted">
        {upNext ? (
          <>
            Up next: <span className="font-medium text-ink">{upNext.exercise.name}</span>
          </>
        ) : (
          "This is the last exercise."
        )}
      </p>
      <ExerciseList activities={activities} currentId={activity.id} />
      <p className="text-small text-ink-muted">{contentNotice}</p>
    </>
  );

  if (resting) {
    return (
      <PlayerLayout
        lead={
          <>
            <SessionPosition index={index} total={total} done={doneCount} />
            <header key="rest" className="flex flex-col gap-1">
              <p className="text-small font-medium text-ink-muted">{exercise.name}</p>
              <ViewHeading>Rest</ViewHeading>
            </header>
            <div className="flex flex-col gap-3 rounded-container border border-border bg-surface p-4">
              <Countdown
                label="Rest"
                remaining={rest.remaining ?? 0}
                total={rest.total}
                testId="rest-timer"
              />
              <p className="text-h3 font-semibold">
                Next: set {nextSet} of {totalSets}
              </p>
              <p className="text-body text-ink-muted">{perSetText(dose)}</p>
            </div>
            {bar(
              <PrimaryButton
                onClick={() => {
                  rest.reset();
                  setResting(false);
                }}
              >
                Skip rest
              </PrimaryButton>,
              <>
                <Button variant="neutral" onClick={rest.toggle}>
                  {rest.running ? "Pause rest" : "Continue rest"}
                </Button>
                <Button variant="neutral" onClick={() => rest.add(15)}>
                  Add 15 seconds
                </Button>
              </>,
            )}
          </>
        }
        rest={detail}
      />
    );
  }

  return (
    <PlayerLayout
      lead={
        <>
          <SessionPosition index={index} total={total} done={doneCount} />
          <header key={`work-${setsDone}`} className="flex flex-col gap-3">
            <ViewHeading>{exercise.name}</ViewHeading>
            <div className="flex flex-col gap-1">
              <p className="text-small font-medium text-ink-muted">Set by your care team</p>
              <p
                data-testid="set-label"
                className="text-data-value-lg font-semibold text-ink tabular-nums"
              >
                {setLabel}
              </p>
              <p className="text-h3 font-semibold">{perSetText(dose)}</p>
              {totalSets > 1 ? <SetTrack total={totalSets} done={setsDone} /> : null}
              <p className="text-small text-ink-muted">{restText(dose)}.</p>
            </div>
          </header>
          {timedSeconds ? (
            <HoldTimer key={holdKey} seconds={timedSeconds} announce={announce} />
          ) : null}
          {bar(
            <PrimaryButton
              loading={saving}
              loadingLabel="Saving"
              disabled={busy && !saving}
              onClick={() => void doneWithSet()}
            >
              {onLastSet
                ? totalSets > 1
                  ? `Done with set ${nextSet}, finish exercise`
                  : "Done with this exercise"
                : `Done with set ${nextSet}`}
            </PrimaryButton>,
            <>
              {pauseButton}
              {skipButton}
            </>,
          )}
        </>
      }
      rest={detail}
    />
  );
}

/** Sets as segments, filled when done. Decoration: "Set 2 of 3" says the same in words. */
function SetTrack({ total, done }: { total: number; done: number }) {
  return (
    <div aria-hidden="true" className="flex max-w-xs gap-1 py-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={
            i < done
              ? "h-1.5 flex-1 rounded-full bg-primary"
              : i === done
                ? "h-1.5 flex-1 rounded-full border border-primary bg-primary-subtle"
                : "h-1.5 flex-1 rounded-full bg-surface-sunken"
          }
        />
      ))}
    </div>
  );
}

/** A timed hold or duration (CD-126): started by the patient, paused or reset at any time. */
function HoldTimer({ seconds, announce }: { seconds: number; announce: (t: string) => void }) {
  const hold = useCountdown(() => announce("Timer done."));
  const started = hold.remaining !== null && hold.remaining > 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-border bg-surface p-3">
      <div className="flex flex-col">
        <span className="text-small font-medium text-ink-muted">Timer, {secondsText(seconds)}</span>
        <span
          role="timer"
          aria-live="off"
          aria-label={`Timer, ${spokenDuration(hold.remaining ?? seconds)} left`}
          className="text-data-value font-semibold text-ink tabular-nums"
        >
          {formatClock(hold.remaining ?? seconds)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {!started ? (
          <Button
            variant="neutral"
            onClick={() => {
              hold.start(seconds);
              announce(`Timer started, ${spokenDuration(seconds)}.`);
            }}
          >
            {hold.remaining === 0 ? "Start timer again" : "Start timer"}
          </Button>
        ) : (
          <>
            <Button variant="neutral" onClick={hold.toggle}>
              {hold.running ? "Pause timer" : "Continue timer"}
            </Button>
            <Button variant="quiet" onClick={hold.reset}>
              Reset timer
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Next: between two exercises ---------- */

function NextView({
  activity,
  index,
  total,
  doneCount,
  fromName,
  restSeconds,
  announce,
  bar,
  onStart,
  wake,
}: {
  activity: SessionActivity;
  index: number;
  total: number;
  doneCount: number;
  fromName: string;
  restSeconds: number;
  announce: (t: string) => void;
  bar: (primary: ReactNode) => ReactNode;
  onStart: () => void;
  wake: "on" | "unavailable" | "idle";
}) {
  const rest = useCountdown(() =>
    announce(`Rest is over. Start ${activity.exercise.name} when you are ready.`),
  );
  const { start } = rest;
  useEffect(() => {
    if (restSeconds > 0) start(restSeconds);
  }, [restSeconds, start]);
  const resting = rest.remaining !== null && rest.remaining > 0;

  return (
    <PlayerLayout
      lead={
        <>
          <SessionPosition index={index} total={total} done={doneCount} />
          <header className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 text-small font-medium text-ink-muted">
              <Icon name="check" size={16} />
              {fromName} done. Next exercise
            </p>
            <ViewHeading>{activity.exercise.name}</ViewHeading>
            <p className="text-h3 font-semibold">{doseText(activity.dose)}</p>
          </header>
          {restSeconds > 0 ? (
            <div className="flex flex-col gap-3 rounded-container border border-border bg-surface p-4">
              <p className="text-label font-medium">
                {resting ? "Rest before the next exercise" : "Rest is over"}
              </p>
              <Countdown
                label="Rest"
                remaining={rest.remaining ?? 0}
                total={rest.total}
                testId="rest-timer"
              />
              {resting ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="neutral" onClick={rest.toggle}>
                    {rest.running ? "Pause rest" : "Continue rest"}
                  </Button>
                  <Button variant="neutral" onClick={() => rest.add(15)}>
                    Add 15 seconds
                  </Button>
                </div>
              ) : (
                <p className="text-body text-ink-muted">Start when you are ready.</p>
              )}
            </div>
          ) : null}
          {bar(<PrimaryButton onClick={onStart}>Start exercise {index + 1}</PrimaryButton>)}
        </>
      }
      rest={
        <>
          <WakeLine state={wake} />
          <ExerciseDetail activity={activity} priority showSteps={false} />
        </>
      }
    />
  );
}
