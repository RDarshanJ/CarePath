import type { StatusLabel } from "./types.js";

/** Database `ClinicalNoteStatus` and `NoteVersionSource` (CD-237). Amendments are versions. */
export type ClinicalNoteStatusValue = "draft" | "signed" | "entered_in_error";
export type NoteVersionSourceValue = "clinician" | "ai_draft";

export const clinicalNoteStatusLabels: Record<
  ClinicalNoteStatusValue,
  StatusLabel & { explanation: string | null }
> = {
  draft: { label: "Draft", tone: "neutral", form: "tag", explanation: "Not signed" },
  signed: { label: "Signed", tone: "success", form: "tag", explanation: null },
  entered_in_error: {
    label: "Entered in error",
    tone: "warning",
    form: "tag",
    explanation: "This note was marked as entered in error and should not be relied on.",
  },
};

/** Authorship is a plain line, not a second Tag. Clinician-written versions need no line. */
export const noteVersionSourceLabels: Record<NoteVersionSourceValue, string | null> = {
  clinician: null,
  ai_draft: "Started from an AI-generated draft",
};
