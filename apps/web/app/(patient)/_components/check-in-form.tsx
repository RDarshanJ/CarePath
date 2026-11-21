"use client";

import { useRef, useState } from "react";
import { checkInResultSchema, type CheckInResult } from "@carepath/shared/contracts";
import {
  Banner,
  Button,
  Field,
  FieldGroup,
  Heading,
  Icon,
  PainScale,
  Radio,
  RadioGroup,
  Textarea,
  FieldError,
} from "@carepath/ui";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";

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
  /** Rendered above the form heading when the check-in follows a stopped session. */
  headingLevel?: 1 | 2;
}

/**
 * Pain is a 0 to 10 radio group, never a slider (REQ-CHK-01, WCAG 2.5.7). After submitting, the patient
 * reads "Your therapist will see this" (AC-C6), and at or above the clinic's threshold also the
 * contact-your-clinic notice and the emergency line (AC-D7), both copy from the API.
 */
export function CheckInForm({
  patientId,
  sessionId,
  heading,
  intro,
  headingLevel = 1,
}: CheckInFormProps) {
  const [pain, setPain] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const painRef = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          : "Your check-in was not sent, and what you entered is still here. Check your connection and try again.",
      );
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-5" data-testid="check-in-done">
        <Heading level={headingLevel} tabIndex={-1} id="check-in-done-heading">
          Check-in sent
        </Heading>
        <p className="flex items-start gap-2 text-body" role="status">
          <Icon name="check-circle" size={22} className="mt-0.5 shrink-0 text-success-ink" />
          <span>
            <span className="font-medium">Your therapist will see this.</span> You reported pain of{" "}
            {result.checkIn.painScore} out of 10. This is your own rating, kept with your record.
          </span>
        </p>
        {result.painNotice ? (
          <Banner tone="warning" title="Contact your clinic if you are worried">
            <p>{result.painNotice.message}</p>
            <p className="mt-2 font-medium">{result.painNotice.emergencyNotice}</p>
          </Banner>
        ) : null}
        <div>
          <Button href="/today">Back to Today</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Heading level={headingLevel}>{heading}</Heading>
        <p className="max-w-measure text-body text-ink-muted">{intro}</p>
      </div>
      <div ref={painRef} className="flex flex-col gap-2">
        <PainScale label="How much does it hurt right now?" value={pain} onValueChange={setPain} />
        {error && pain === null ? <FieldError live>{error}</FieldError> : null}
      </div>
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
      <Field
        label="Anything else to tell your therapist?"
        requirement="optional"
        why="Your care team reads this. It is not monitored for emergencies."
      >
        {(control) => (
          <Textarea
            {...control}
            value={notes}
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
      <div>
        <Button type="submit" loading={pending} loadingLabel="Sending" className="w-full sm:w-auto">
          Send check-in
        </Button>
      </div>
      <p className="text-small text-ink-muted">Your therapist will see this.</p>
    </form>
  );
}
