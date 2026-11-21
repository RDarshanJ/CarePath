"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CarePlanDiff } from "@carepath/shared/contracts";
import { Button, FieldError, Banner } from "@carepath/ui";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";
import { DiffList } from "./diff-list";

export interface PlanChangeNoteProps {
  patientId: string;
  versionId: string;
  versionNumber: number;
  note: string | null;
  clinicianName: string;
  publishedOn: string;
  diff: CarePlanDiff | null;
}

/**
 * "Why did my plan change?" (REQ-TOD-02, AC-B3): the clinician's own note, what changed and who
 * published it, shown until the patient says they have read it. The note is never generated.
 */
export function PlanChangeNote(props: PlanChangeNoteProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge() {
    setPending(true);
    setError(null);
    try {
      await api.post(
        `/patients/${props.patientId}/care-plan/versions/${props.versionId}/acknowledge`,
        null,
        {},
      );
      router.refresh();
    } catch (e) {
      setPending(false);
      setError(
        e instanceof ApiError
          ? "Could not save that you read this. Your plan is unchanged. Try again."
          : "Something went wrong. Try again.",
      );
    }
  }

  // Version 1 is the first plan: nothing changed, so it is announced as ready and lists no changes.
  const first = props.versionNumber === 1;
  return (
    <section aria-labelledby="plan-change-heading">
      <Banner
        tone="info"
        titleAs="h3"
        titleId="plan-change-heading"
        title={first ? "Your plan is ready" : "Your plan changed"}
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="neutral" onClick={acknowledge} loading={pending} loadingLabel="Saving">
              Got it
            </Button>
            <p className="text-small text-ink-muted">
              This note stays in your plan history after you close it.
            </p>
          </div>
        }
      >
        <p className="text-small">
          Version {props.versionNumber}, published {props.publishedOn} by {props.clinicianName}
        </p>
        <div className="mt-3 flex flex-col gap-3 text-ink">
          {props.note ? (
            <blockquote className="border-l-2 border-info-ink pl-3 text-body">
              <p className="text-small font-medium text-ink-muted">
                Note from {props.clinicianName}
              </p>
              <p className="mt-0.5">{props.note}</p>
            </blockquote>
          ) : null}
          {props.diff && !first ? <DiffList diff={props.diff} /> : null}
        </div>
        {error ? (
          <FieldError live className="mt-2">
            {error}
          </FieldError>
        ) : null}
      </Banner>
    </section>
  );
}
