"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CarePlanVersionDetail } from "@carepath/shared/contracts";
import { Banner, Button, Dialog, DialogClose, DialogContent, Field, Textarea } from "@carepath/ui";
import { ApiError } from "../../../../../lib/api/errors";
import { ListSkeleton, errorText } from "../../../_components/common";
import { keys, reads, writes } from "../../../_lib/queries";

/**
 * Publish: from version 2 a note to the patient is required (AC-B4). The summary of changes is
 * the API's own diff of the draft against the current version, so what the clinician reviews is
 * what the patient will see.
 */
export function PublishDialog({
  patientId,
  patientName,
  open,
  versionNumber,
  getUpdatedAt,
  onOpenChange,
  onPublished,
  returnFocusTo,
}: {
  patientId: string;
  patientName: string;
  open: boolean;
  versionNumber: number;
  getUpdatedAt: () => string | null;
  onOpenChange: (open: boolean) => void;
  onPublished: (version: CarePlanVersionDetail) => void;
  /** Where focus goes when the dialog closes without publishing. */
  returnFocusTo: () => HTMLElement | null;
}) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ title: string; body: string } | null>(null);
  const noteRequired = versionNumber >= 2;

  const preview = useQuery({
    queryKey: [...keys.preview(patientId), "publish"],
    queryFn: () => reads.preview(patientId),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });
  const diff = preview.data?.plan?.diffFromPrevious ?? null;

  const publish = useMutation({
    mutationFn: () => {
      const expectedUpdatedAt = getUpdatedAt();
      if (!expectedUpdatedAt)
        throw new ApiError(409, "draft_stale", "The draft has not been saved.");
      return writes.publish(patientId, {
        changeNoteForPatient: note.trim() === "" ? null : note.trim(),
        expectedUpdatedAt,
      });
    },
    onSuccess: (version) => {
      setNote("");
      onPublished(version);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "validation_error") {
        const onNote = e.details.some((d) => String(d.path).includes("changeNoteForPatient"));
        if (onNote) {
          setNoteError("Write a short note for the patient about what changed.");
          return;
        }
      }
      if (e instanceof ApiError && e.code === "draft_stale") {
        setFailure({
          title: "The draft changed",
          body: "Someone saved the draft after you opened it. Close this, reload the draft and check it before publishing. Nothing was published.",
        });
        return;
      }
      setFailure(errorText(e));
    },
  });

  function submit() {
    setFailure(null);
    if (noteRequired && note.trim() === "") {
      setNoteError("Write a short note for the patient about what changed.");
      return;
    }
    setNoteError(null);
    publish.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setNoteError(null);
          setFailure(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent
        title={`Publish version ${versionNumber}`}
        description={`${patientName} sees this version on their next visit to Today. Published versions cannot be edited; a later change is a new version.`}
        className="max-w-xl"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocusTo()?.focus();
        }}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button loading={publish.isPending} loadingLabel="Publishing" onClick={submit}>
              Publish version {versionNumber}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {failure ? (
            <Banner tone="error" title={failure.title}>
              {failure.body}
            </Banner>
          ) : null}

          {versionNumber >= 2 ? (
            <div
              aria-label="What changes for the patient"
              role="group"
              className="rounded-container border border-border p-3"
            >
              <p className="text-label font-semibold text-ink">What changes for the patient</p>
              {preview.isPending ? (
                <ListSkeleton rows={2} label="Loading changes" />
              ) : diff ? (
                diff.added.length + diff.removed.length + diff.changed.length === 0 ? (
                  <p className="mt-1 text-small text-ink-muted">
                    No exercise changes from version {diff.previousVersionNumber}.
                  </p>
                ) : (
                  <ul className="mt-1 text-body">
                    {diff.added.map((e) => (
                      <li key={`a${e.exerciseId}`}>Added: {e.name}</li>
                    ))}
                    {diff.removed.map((e) => (
                      <li key={`r${e.exerciseId}`}>Removed: {e.name}</li>
                    ))}
                    {diff.changed.map((e) => (
                      <li key={`c${e.exerciseId}`}>
                        Changed: {e.name} ({e.fields.join(", ")})
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="mt-1 text-small text-ink-muted">
                  The list of changes is worked out when the version is published.
                </p>
              )}
            </div>
          ) : null}

          <Field
            label="Note to the patient"
            requirement={noteRequired ? "required" : "optional"}
            why="The patient reads this on Today, next to the new plan. Say what changed and why, in plain words."
            {...(noteError ? { error: noteError } : {})}
          >
            {(control) => (
              <Textarea
                {...control}
                value={note}
                rows={4}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
