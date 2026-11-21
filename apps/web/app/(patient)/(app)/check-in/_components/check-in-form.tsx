"use client";

import { useRef, useState } from "react";
import { checkInResultSchema, type CheckInResult } from "@carepath/shared/contracts";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import {
  Banner,
  Button,
  cx,
  Field,
  FieldGroup,
  Heading,
  Icon,
  LeaveGuardDialog,
  PainScale,
  Radio,
  RadioGroup,
  Textarea,
  useLeaveGuard,
} from "@carepath/ui";
import { api } from "../../../../../lib/api/client";
import { ApiError } from "../../../../../lib/api/errors";
import { useFocusClearOf } from "../../../(session)/_components/use-focus-clear";

const difficulties = [
  { value: "easier", label: "Easier than I expected" },
  { value: "as_expected", label: "About what I expected" },
  { value: "harder", label: "Harder than I expected" },
] as const;

export interface CheckInFormProps {
  patientId: string;
  /** The session this check-in follows, or null for a check-in on its own. */
  sessionId: string | null;
  heading: string;
  intro: string;
  headingLevel?: 1 | 2;
  /**
   * The number given at "Stop, this hurts", preselected with the sentence that says where it came
   * from (DR-002 D, WCAG 3.3.7). Null when the patient stopped without one.
   */
  stoppedAt?: number | null;
  /**
   * The screen already shows the clinic contact and the emergency line (the stopped session), so the
   * form shows neither again, before or after sending: one contact notice per screen (feature D, item 3).
   */
  contactShown?: boolean;
  /** Ask whether the exercises felt easier or harder; only after a session. */
  askDifficulty?: boolean;
  /** The page has the patient tab bar below 768 px: the send bar sticks just above it. */
  aboveTabBar?: boolean;
}

/**
 * Pain is a 0 to 10 radio group, never a slider (CD-100, REQ-CHK-01, WCAG 2.5.7), with the anchors and
 * no band word (CD-101). The emergency line is on screen before sending (feature D, item 2). After
 * sending the patient reads "Your therapist will see this" (AC-C6), and at or above the clinic's
 * threshold the contact notice and the emergency line from the API (AC-D7), unless the screen already
 * shows them. Nothing typed is kept in browser storage (R1); leaving with an unsent answer asks first.
 */
export function CheckInForm({
  patientId,
  sessionId,
  heading,
  intro,
  headingLevel = 1,
  stoppedAt = null,
  contactShown = false,
  askDifficulty = true,
  aboveTabBar = false,
}: CheckInFormProps) {
  const [pain, setPain] = useState<number | null>(stoppedAt);
  const [difficulty, setDifficulty] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const painRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useFocusClearOf(barRef);
  const dirty = result === null && (pain !== stoppedAt || difficulty !== "" || notes.trim() !== "");
  const guard = useLeaveGuard(dirty);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (pain === null) {
      setError("Choose a pain number from 0 to 10 before you send this.");
      painRef.current?.querySelector<HTMLElement>("[role=radio]")?.focus();
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await api.post(`/patients/${patientId}/check-ins`, checkInResultSchema, {
        sessionId,
        painScore: pain,
        difficulty: difficulty === "" ? null : difficulty,
        notes: notes.trim() === "" ? null : notes.trim(),
      });
      setResult(res);
    } catch (err) {
      setPending(false);
      setError(
        err instanceof ApiError && err.code === "session_closed"
          ? "This check-in belongs to a session from an earlier day, so it was not saved. Go back to Today and add a new check-in."
          : err instanceof ApiError && err.code === "rate_limited"
            ? "Too many tries. Wait a minute, then try again."
            : "Your check-in was not sent, and what you entered is still here. Check your connection and try again.",
      );
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-5" data-testid="check-in-done">
        <Heading level={headingLevel} focusOnMount>
          Check-in sent
        </Heading>
        <p className="flex items-start gap-2 text-body" role="status">
          <Icon name="check-circle" size={22} className="mt-0.5 shrink-0 text-success-ink" />
          <span>
            <span className="font-medium">Your therapist will see this.</span> You reported pain of{" "}
            {result.checkIn.painScore} out of 10. This is your own rating, kept with your record.
          </span>
        </p>
        {result.painNotice && !contactShown ? (
          <Banner tone="warning" title="Contact your clinic if you are worried">
            <p>{result.painNotice.message}</p>
            <p className="mt-2 font-medium">{result.painNotice.emergencyNotice}</p>
          </Banner>
        ) : null}
        <div>
          <Button href="/today" className="w-full sm:w-auto">
            Back to Today
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      data-sticky-layout="patient-flow"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1.5">
        <Heading level={headingLevel}>{heading}</Heading>
        <p className="max-w-measure text-body text-ink-muted">{intro}</p>
      </div>
      <div ref={painRef} className="flex flex-col gap-2">
        <PainScale
          label="How much does it hurt right now?"
          value={pain}
          onValueChange={(v) => {
            setPain(v);
            setError(null);
          }}
          stoppedAt={stoppedAt}
          {...(error && pain === null ? { error } : {})}
        />
      </div>
      {askDifficulty ? (
        <FieldGroup legend="How did your exercises feel?" requirement="optional">
          <RadioGroup
            value={difficulty}
            onValueChange={setDifficulty}
            aria-label="How did your exercises feel?"
          >
            {difficulties.map((d) => (
              <Radio key={d.value} value={d.value} label={d.label} />
            ))}
          </RadioGroup>
        </FieldGroup>
      ) : null}
      <Field
        label="Anything else to tell your therapist?"
        requirement="optional"
        why="Your care team reads this. It is not monitored for emergencies."
      >
        {(control) => (
          <Textarea
            {...control}
            value={notes}
            rows={3}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </Field>
      {error && pain !== null ? (
        <Banner tone="error" title="Check-in not sent">
          {error}
        </Banner>
      ) : null}
      {/* The send action stays on screen while the form scrolls (D-WP-10 gate, CD-424). */}
      <div
        ref={barRef}
        data-sticky-bar
        className={cx(
          "sticky z-10 flex flex-col gap-3 rounded-container border border-border bg-surface p-3",
          aboveTabBar ? "bottom-16 md:bottom-0" : "bottom-0",
        )}
      >
        {contactShown ? null : (
          <p className="flex items-start gap-2 text-small text-ink-muted">
            <Icon name="alert-triangle" size={18} className="mt-0.5 shrink-0" />
            <span>{EMERGENCY_NOTICE}</span>
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button
            type="submit"
            loading={pending}
            loadingLabel="Sending"
            className="w-full sm:w-auto"
          >
            Send check-in
          </Button>
          <p className="text-small text-ink-muted">Your therapist will see this.</p>
        </div>
      </div>
      <LeaveGuardDialog guard={guard} description="Your check-in has not been sent." />
    </form>
  );
}
