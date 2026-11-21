"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Banner,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  Radio,
  RadioGroup,
  Skeleton,
  SkeletonGroup,
} from "@carepath/ui";
import { ApiError } from "../../../../lib/api/errors";
import { keys, reads, writes } from "../../_lib/queries";

function failureText(error: unknown): { title: string; body: string } {
  if (error instanceof ApiError) {
    if (error.code === "invalid_transition") {
      return {
        title: "This patient cannot be assigned right now",
        body: "Their status changed since this list loaded. Close this and reload the list. Nothing was changed.",
      };
    }
    if (error.code === "forbidden") {
      return {
        title: "You cannot do this",
        body: "Your role does not include assigning therapists. Nothing was changed.",
      };
    }
    if (error.code === "service_unavailable") {
      return {
        title: "The service is not reachable",
        body: "Nothing was changed. Check your connection and try again.",
      };
    }
    return { title: "Something went wrong", body: `${error.message} Nothing was changed.` };
  }
  return { title: "Something went wrong", body: "Nothing was changed. Try again." };
}

/**
 * "Assign therapist": lists the clinic's active practitioners with their caseload and posts the
 * assignment (REQ-ADM-02). The patient moves from awaiting assignment to active in the same request.
 */
export function AssignDialog({
  patient,
  open,
  onOpenChange,
  onAssigned,
}: {
  patient: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: (practitionerName: string) => void;
}) {
  const [chosen, setChosen] = useState("");
  const [chooseError, setChooseError] = useState(false);
  const [failure, setFailure] = useState<{ title: string; body: string } | null>(null);

  const practitioners = useQuery({
    queryKey: keys.practitioners,
    queryFn: reads.practitioners,
    enabled: open,
    staleTime: 0,
  });
  const items = practitioners.data?.items ?? [];

  const assign = useMutation({
    mutationFn: () => writes.assign(patient.id, chosen),
    onSuccess: () => {
      const name = items.find((p) => p.id === chosen)?.name ?? "The therapist";
      setChosen("");
      onAssigned(name);
    },
    onError: (e) => setFailure(failureText(e)),
  });

  function submit() {
    setFailure(null);
    if (!chosen) {
      setChooseError(true);
      return;
    }
    setChooseError(false);
    assign.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setChosen("");
          setChooseError(false);
          setFailure(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent
        title={`Assign a therapist to ${patient.name}`}
        description="The therapist becomes the patient's primary therapist and can then build their care plan. Caseload is the number of active patients on their care team now."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button loading={assign.isPending} loadingLabel="Assigning" onClick={submit}>
              Assign therapist
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {failure ? (
            <Banner tone="error" title={failure.title}>
              {failure.body}
            </Banner>
          ) : null}
          {practitioners.isError ? (
            <Banner
              tone="error"
              title="Therapists could not load"
              action={
                <Button variant="neutral" size="sm" onClick={() => void practitioners.refetch()}>
                  Try again
                </Button>
              }
            >
              Nothing was changed.
            </Banner>
          ) : practitioners.isPending ? (
            <SkeletonGroup label="Loading therapists" className="flex flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </SkeletonGroup>
          ) : items.length === 0 ? (
            <p className="text-body text-ink-muted">
              No active therapists are set up in this clinic, so nobody can be assigned yet.
            </p>
          ) : (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-label font-medium text-ink">Therapist</legend>
              <RadioGroup
                aria-label="Therapist"
                value={chosen}
                onValueChange={(v) => {
                  setChosen(v);
                  setChooseError(false);
                }}
              >
                {items.map((p) => (
                  <Radio
                    key={p.id}
                    value={p.id}
                    label={p.credentials ? `${p.name}, ${p.credentials}` : p.name}
                    hint={`${p.activeCaseload} active ${p.activeCaseload === 1 ? "patient" : "patients"}`}
                  />
                ))}
              </RadioGroup>
              {chooseError ? (
                <p role="alert" className="text-small font-medium text-error-ink">
                  <span className="sr-only">Error: </span>
                  Choose a therapist to assign.
                </p>
              ) : null}
            </fieldset>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
