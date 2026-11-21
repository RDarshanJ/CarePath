"use client";

import { useState } from "react";
import {
  BottomSheetContent,
  Button,
  Dialog,
  Field,
  FieldError,
  PainScale,
  Radio,
  RadioGroup,
  Textarea,
} from "@carepath/ui";

export const IT_HURTS = "It hurts";
const skipReasons = [
  IT_HURTS,
  "I do not have the space or equipment",
  "I am too tired today",
  "I am not sure how to do it",
] as const;
const OTHER = "Other";

/**
 * Skip needs a reason (AC-C3). Choosing "It hurts" offers the stop path in the same sheet, because a
 * skip does not tell the therapist that something hurt enough to stop (feature C, item 7).
 */
export function SkipSheet({
  open,
  onOpenChange,
  busy,
  exerciseName,
  onConfirm,
  onStopInstead,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  exerciseName: string;
  onConfirm: (reason: string) => Promise<boolean>;
  onStopInstead: () => void;
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
      <BottomSheetContent
        title="Skip this exercise?"
        description={`${exerciseName} is saved as skipped, with your reason. Your therapist will see it.`}
        dirty={other.trim() !== ""}
        footer={
          <>
            <Button variant="neutral" onClick={() => onOpenChange(false)}>
              Keep exercise
            </Button>
            <Button onClick={confirm} loading={busy} loadingLabel="Saving">
              Skip exercise
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
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
          {choice === IT_HURTS ? (
            <div className="flex flex-col items-start gap-3 rounded-control border border-border bg-surface-sunken p-3">
              <p className="text-body">
                Do you want to stop the session instead? Stopping ends today&apos;s session and
                tells your therapist that something hurt.
              </p>
              <Button variant="secondary" tone="critical" onClick={onStopInstead}>
                Stop the session instead
              </Button>
            </div>
          ) : null}
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
            <FieldError live>{error}</FieldError>
          ) : null}
        </div>
      </BottomSheetContent>
    </Dialog>
  );
}

/**
 * "Stop, this hurts" (CD-421, CR-6). One confirmation, then the session ends at once: the pain number
 * is optional here and is asked again, preselected, as the check-in on the next screen. The note stays
 * in memory only (R1).
 */
export function StopSheet({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  busy: boolean;
  onConfirm: (level: number | null, note: string) => Promise<boolean>;
}) {
  const [level, setLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent
        title="Stop this session?"
        description="This ends today's session now and tells your therapist. What you did so far is kept."
        footer={
          <>
            <Button variant="neutral" onClick={() => onOpenChange(false)}>
              Keep going
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (await onConfirm(level, note.trim())) onOpenChange(false);
              }}
              loading={busy}
              loadingLabel="Stopping"
            >
              Stop session
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <PainScale
            label="How much does it hurt right now?"
            hint="Optional. You can stop without choosing, and tell us on the next screen."
            value={level}
            onValueChange={setLevel}
          />
          <Field
            label="What happened?"
            requirement="optional"
            why="A few words help your therapist. Skip this if you prefer."
          >
            {(control) => (
              <Textarea
                {...control}
                rows={2}
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
        </div>
      </BottomSheetContent>
    </Dialog>
  );
}
