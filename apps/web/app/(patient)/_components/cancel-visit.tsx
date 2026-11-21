"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appointmentSchema } from "@carepath/shared/contracts";
import {
  Banner,
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Field,
  Textarea,
} from "@carepath/ui";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";

/**
 * Cancel a visit with a reason (REQ-APT-01, AC-E4). The reason is required here so the care team
 * knows why; the slot opens again for other patients as soon as the cancellation is saved.
 */
export function CancelVisit({
  patientId,
  appointmentId,
  summary,
}: {
  patientId: string;
  appointmentId: string;
  /** Said in the dialog so the person sees which visit, for example "Friday, November 20 at 8:00 AM". */
  summary: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (reason.trim() === "") {
      setFieldError("Tell us why you are cancelling, in a few words.");
      return;
    }
    setFieldError(undefined);
    setError(null);
    setPending(true);
    try {
      await api.post(
        `/patients/${patientId}/appointments/${appointmentId}/cancel`,
        appointmentSchema,
        {
          reason: reason.trim(),
        },
      );
      setOpen(false);
      router.push(`/appointments?cancelled=${appointmentId}`);
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(
        err instanceof ApiError && err.code === "invalid_transition"
          ? "This visit can no longer be cancelled here. Contact your care team."
          : "Your visit was not cancelled and is still booked. Check your connection and try again.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setError(null);
          setFieldError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm">
          Cancel visit
          <span className="sr-only"> on {summary}</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Cancel this visit?"
        description={summary}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Keep this visit
            </Button>
            <Button variant="danger" onClick={submit} loading={pending} loadingLabel="Cancelling">
              Cancel visit
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Why are you cancelling"
            requirement="required"
            why="Your care team sees this. The time opens up for other patients."
            {...(fieldError ? { error: fieldError } : {})}
          >
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
          {error ? (
            <Banner tone="error" title="Not cancelled">
              {error}
            </Banner>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
