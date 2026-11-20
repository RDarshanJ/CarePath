import { z } from "zod";
import { instantSchema, pageOf, personRefSchema } from "./common.js";

/**
 * AI-supported progress review and SOAP note drafts (WP 5.2, Scenario F, ADR-5, ADR-6).
 *
 * Machine values only: the web app maps statuses to its own wording (design CD-236, CD-237). The
 * one string shown as received is `provider.label`, the provider's own name stored on the
 * generation ("Demo provider, rule-based" for the deterministic provider). No numeric confidence
 * exists anywhere in these contracts (PRD section 11).
 *
 * Lifecycle: a generation is stored once, complete (`succeeded` or `failed`), and never changes.
 * Clinician work on it is append-only `AIReview` rows: any number of revisions (edits), then at
 * most one decision (approved, approved_with_edits, rejected). Approving a note draft creates a
 * clinician-authored ClinicalNote in `draft`; signing is a separate action on the note.
 */

// ---------------------------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------------------------

/** Record types a statement may cite. `encounter` refs cite one transcript turn. */
export const aiSourceTypeSchema = z.enum([
  "check_in",
  "exercise_session",
  "session_activity",
  "message",
  "appointment",
  "care_plan_version",
  "encounter",
  "observation",
]);
export type AiSourceType = z.infer<typeof aiSourceTypeSchema>;

/**
 * Result of resolving one reference inside the generation's patient and organization, checked
 * when the generation is read. `out_of_scope`: the record belongs to another patient.
 * `not_found`: no such record in this organization. `field_missing`: the record exists but the
 * cited field holds no value. Anything but `resolved` makes the statement unsupported.
 */
export const aiRefStatusSchema = z.enum(["resolved", "not_found", "out_of_scope", "field_missing"]);

export const aiFieldValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const aiSourceRefSchema = z
  .object({
    type: aiSourceTypeSchema,
    id: z.string(),
    /** Column cited, or `transcript.turn.<n>` for an encounter transcript turn. */
    field: z.string(),
    status: aiRefStatusSchema,
    /** The cited value when resolved; null otherwise. Open the record with the sources route. */
    value: aiFieldValueSchema,
  })
  .meta({ id: "AiSourceRef" });
export type AiSourceRef = z.infer<typeof aiSourceRefSchema>;

export const aiSourceParamsSchema = z.object({
  patientId: z.uuid(),
  sourceType: aiSourceTypeSchema,
  sourceId: z.uuid(),
});

/** One source record as the evidence panel shows it. Reading it is audited (`phi.read`). */
export const aiSourceRecordSchema = z
  .object({
    type: aiSourceTypeSchema,
    id: z.uuid(),
    patientId: z.uuid(),
    /** When the record happened (submitted, started, sent, published, effective). */
    occurredAt: instantSchema.nullable(),
    /** Every citable field, in a stable order, with the name a sourceRef uses. */
    fields: z.array(z.object({ field: z.string(), value: aiFieldValueSchema })),
    /** Encounter only: the transcript as turns, for the side-by-side note review. Else empty. */
    transcript: z.array(
      z.object({
        turn: z.number().int().min(1),
        speaker: z.enum(["clinician", "patient", "caregiver"]),
        text: z.string(),
      }),
    ),
    /** Encounter only: transcripts in this product are synthetic demonstration text. */
    syntheticTranscript: z.boolean(),
  })
  .meta({ id: "AiSourceRecord" });
export type AiSourceRecord = z.infer<typeof aiSourceRecordSchema>;

// ---------------------------------------------------------------------------------------------
// Generations
// ---------------------------------------------------------------------------------------------

export const aiGenerationKindSchema = z.enum(["progress_summary", "note_draft"]);
export type AiGenerationKind = z.infer<typeof aiGenerationKindSchema>;

/** `pending` is never returned by this API (generation runs inline); listed for completeness. */
export const aiGenerationStatusSchema = z.enum(["pending", "succeeded", "failed"]);

/**
 * Review state derived from the AIReview rows.
 * - `not_reviewable`: the generation failed; there is nothing to review.
 * - `unreviewed`: succeeded, no clinician action yet.
 * - `in_review`: at least one revision (edit, removal, acknowledgement), no decision yet.
 * - `approved`, `approved_with_edits`, `rejected`: the one decision.
 */
export const aiReviewStateSchema = z.enum([
  "not_reviewable",
  "unreviewed",
  "in_review",
  "approved",
  "approved_with_edits",
  "rejected",
]);
export type AiReviewState = z.infer<typeof aiReviewStateSchema>;

/** Sections in display order. Summary: summary, reportedChanges, engagementObservations, itemsForReview. */
export const aiSectionKeySchema = z.enum([
  "summary",
  "reportedChanges",
  "engagementObservations",
  "itemsForReview",
  "subjective",
  "objective",
  "assessment",
  "plan",
]);

/**
 * How the clinician resolved a statement. `unchanged` is the default. `edited`: text replaced by
 * the clinician (the original is kept in `originalText`). `removed`: left out of the approved
 * output. `acknowledged`: kept as written with the clinician's note ("keep with a note").
 */
export const aiStatementResolutionSchema = z.enum([
  "unchanged",
  "edited",
  "removed",
  "acknowledged",
]);

export const aiStatementSchema = z
  .object({
    id: z.string(),
    section: aiSectionKeySchema,
    /** Current text: the clinician's edit when edited, else the generated text. */
    text: z.string(),
    /** The generated text, never changed. */
    originalText: z.string(),
    resolution: aiStatementResolutionSchema,
    /** The clinician's note for `acknowledged`; null otherwise. */
    note: z.string().nullable(),
    support: z.enum(["supported", "unsupported"]),
    /** Why unsupported; null when supported. */
    unsupportedReason: z.enum(["no_source_refs", "unresolved_source_ref"]).nullable(),
    /** True while unsupported and not edited, removed or acknowledged: approval waits for it. */
    needsResolution: z.boolean(),
    /**
     * True once a reviewer opened evidence for this statement through `evidence-opens` (recorded
     * in the review, CR-7). An edited statement is not verified again.
     */
    evidenceOpened: z.boolean(),
    sourceRefs: z.array(aiSourceRefSchema),
  })
  .meta({ id: "AiStatement" });
export type AiStatement = z.infer<typeof aiStatementSchema>;

export const aiSectionSchema = z.object({
  key: aiSectionKeySchema,
  /** Unsupported statements needing resolution first, then the rest in generated order. */
  statements: z.array(aiStatementSchema),
});

export const aiMissingInformationSchema = z.object({
  /** Machine item, for example `no_check_ins_in_window` or `pain_score`. */
  item: z.string(),
  /** SOAP section for note drafts; null for summaries. */
  section: aiSectionKeySchema.nullable(),
  /** Generated description of what is missing (provider output, not UI copy). */
  label: z.string(),
  acknowledged: z.boolean(),
});

/**
 * Why approval is unavailable (design CD-407 option A, DR-002 M; demo rules pending clinical
 * governance review). Rejecting is always available while undecided.
 */
export const aiApprovalBlockerSchema = z.object({
  code: z.enum([
    /** Statements are unsupported and not yet edited, removed or acknowledged. */
    "unsupported_unresolved",
    /** Missing-information items not yet acknowledged (`items`). */
    "missing_unacknowledged",
    /** Progress summaries: reported-change statements whose evidence was never opened. */
    "evidence_not_opened",
    /** Nothing would be left to approve. */
    "empty_output",
    /** The patient's AI consent is no longer active (CR-7). */
    "consent_withdrawn",
  ]),
  statementIds: z.array(z.string()),
  /** Missing-information items, for `missing_unacknowledged`; else empty. */
  items: z.array(z.string()),
});

export const aiRevisionSchema = z.object({
  id: z.uuid(),
  number: z.number().int().min(1),
  /** `edit`: statement or missing-information changes. `evidence_opened`: an evidence-open record. */
  kind: z.enum(["edit", "evidence_opened"]),
  createdAt: instantSchema,
  by: personRefSchema.nullable(),
});

export const aiDecisionSchema = z.object({
  decision: z.enum(["approved", "approved_with_edits", "rejected"]),
  reason: z.string().nullable(),
  reviewer: personRefSchema.nullable(),
  decidedAt: instantSchema,
  /** Note drafts: the draft ClinicalNote created on approval. It still needs a signature. */
  noteId: z.uuid().nullable(),
});

export const aiProviderSchema = z.object({
  /** `deterministic` or `anthropic`. */
  id: z.string(),
  /** Stored provider name, shown on every generated block. */
  label: z.string(),
  model: z.string().nullable(),
  /** True for the rule-based demo provider: its output is never from a live model. */
  isDemo: z.boolean(),
});

export const aiUsageSchema = z.object({
  attempts: z.number().int().min(0),
  inputTokens: z.number().int().nullable(),
  outputTokens: z.number().int().nullable(),
  /** Null when no price is configured or no call reported usage. Never estimated. */
  costMicroUsd: z.number().int().nullable(),
  /** Why the cost is what it is ("No model call: demo provider, rule-based, zero cost"). */
  costLabel: z.string(),
  latencyMs: z.number().int().nullable(),
});

export const aiFailureSchema = z.object({
  code: z.enum([
    "timeout",
    "provider_error",
    "invalid_output",
    "invalid_input",
    "redaction_failed",
    "not_configured",
  ]),
  /** Fixed pipeline text; contains no patient data. */
  message: z.string(),
});

export const aiGenerationSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("progress_window"),
    windowDays: z.number().int(),
    from: instantSchema,
    to: instantSchema,
  }),
  z.object({
    kind: z.literal("encounter"),
    encounterId: z.uuid(),
    encounterStartedAt: instantSchema.nullable(),
  }),
]);

export const aiGenerationSummarySchema = z
  .object({
    id: z.uuid(),
    patientId: z.uuid(),
    kind: aiGenerationKindSchema,
    status: aiGenerationStatusSchema,
    reviewState: aiReviewStateSchema,
    provider: aiProviderSchema,
    promptKey: z.string(),
    promptVersion: z.string(),
    source: aiGenerationSourceSchema.nullable(),
    requestedBy: personRefSchema.nullable(),
    createdAt: instantSchema,
    completedAt: instantSchema.nullable(),
    previousGenerationId: z.uuid().nullable(),
    /** The newest generation made by regenerating this one, if any. */
    regeneratedById: z.uuid().nullable(),
    /** Statements without support when generated (verifier at generation time). */
    unsupportedStatementCount: z.number().int().nullable(),
  })
  .meta({ id: "AiGenerationSummary" });
export type AiGenerationSummary = z.infer<typeof aiGenerationSummarySchema>;

export const aiGenerationSchema = aiGenerationSummarySchema
  .extend({
    usage: aiUsageSchema,
    failure: aiFailureSchema.nullable(),
    /**
     * Verification at read time (refs re-resolved now). Null for failed generations. Counts are
     * over all statements, removed ones included.
     */
    verification: z
      .object({
        statementCount: z.number().int(),
        supportedCount: z.number().int(),
        unsupportedCount: z.number().int(),
        needsResolutionCount: z.number().int(),
      })
      .nullable(),
    sections: z.array(aiSectionSchema),
    missingInformation: z.array(aiMissingInformationSchema),
    /** Source text that looked like an instruction; it was treated as data. */
    notices: z.array(
      z.object({
        code: z.literal("instruction_like_source_text"),
        sourceRefs: z.array(aiSourceRefSchema),
      }),
    ),
    revisions: z.array(aiRevisionSchema),
    /** Pass as `baseRevisionId` / `revisionId`; null before the first revision. */
    currentRevisionId: z.uuid().nullable(),
    decision: aiDecisionSchema.nullable(),
    approval: z.object({
      allowed: z.boolean(),
      blockers: z.array(aiApprovalBlockerSchema),
    }),
  })
  .meta({ id: "AiGeneration" });
export type AiGeneration = z.infer<typeof aiGenerationSchema>;

export const aiGenerationPageSchema = pageOf(aiGenerationSummarySchema).meta({
  id: "AiGenerationPage",
});
export type AiGenerationPage = z.infer<typeof aiGenerationPageSchema>;

export const aiGenerationListQuerySchema = z.object({
  kind: aiGenerationKindSchema.optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const aiGenerationIdParamsSchema = z.object({
  patientId: z.uuid(),
  generationId: z.uuid(),
});

// ---------------------------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------------------------

export const requestProgressSummarySchema = z
  .object({
    /** Days before now covered by the summary. */
    windowDays: z.number().int().min(7).max(90).default(14),
  })
  .strict();
export type RequestProgressSummary = z.input<typeof requestProgressSummarySchema>;

export const requestNoteDraftSchema = z.object({ encounterId: z.uuid() }).strict();
export type RequestNoteDraft = z.infer<typeof requestNoteDraftSchema>;

const statementId = z.string().regex(/^s\d+$/);

export const aiRevisionChangeSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("edit"),
      statementId,
      text: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z.object({ action: z.literal("remove"), statementId }).strict(),
  z
    .object({
      action: z.literal("acknowledge"),
      statementId,
      /** Why the statement is kept as written. Required: acknowledgement is not one click. */
      note: z.string().trim().min(3).max(500),
    })
    .strict(),
  /** Back to the generated text with no resolution. */
  z.object({ action: z.literal("restore"), statementId }).strict(),
  z.object({ action: z.literal("acknowledge_missing"), item: z.string().min(1).max(64) }).strict(),
]);
export type AiRevisionChange = z.infer<typeof aiRevisionChangeSchema>;

export const createAiRevisionSchema = z
  .object({
    /** `currentRevisionId` as last read. A different value answers 409 `revision_stale`. */
    baseRevisionId: z.uuid().nullable(),
    changes: z.array(aiRevisionChangeSchema).min(1).max(50),
  })
  .strict();
export type CreateAiRevision = z.infer<typeof createAiRevisionSchema>;

/**
 * Record that the reviewer opened one cited source of a statement (CR-7). Appended to the review
 * as a revision that carries the current state forward; it needs no base revision.
 */
export const recordEvidenceOpenSchema = z
  .object({
    statementId,
    sourceType: aiSourceTypeSchema,
    sourceId: z.uuid(),
  })
  .strict();
export type RecordEvidenceOpen = z.infer<typeof recordEvidenceOpenSchema>;

export const approveAiGenerationSchema = z
  .object({
    /** `currentRevisionId` the clinician reviewed. A different value answers 409 `revision_stale`. */
    revisionId: z.uuid().nullable(),
  })
  .strict();
export type ApproveAiGeneration = z.infer<typeof approveAiGenerationSchema>;

export const rejectAiGenerationSchema = z
  .object({ reason: z.string().trim().min(3).max(500) })
  .strict();
export type RejectAiGeneration = z.infer<typeof rejectAiGenerationSchema>;

// ---------------------------------------------------------------------------------------------
// Encounters and clinical notes
// ---------------------------------------------------------------------------------------------

export const encounterSummarySchema = z
  .object({
    id: z.uuid(),
    type: z.enum(["initial_evaluation", "follow_up", "video_follow_up"]),
    class: z.enum(["AMB", "VR"]),
    status: z.enum(["in_progress", "finished", "entered_in_error"]),
    startedAt: instantSchema,
    endedAt: instantSchema.nullable(),
    practitioner: personRefSchema,
    hasTranscript: z.boolean(),
    noteIds: z.array(z.uuid()),
  })
  .meta({ id: "EncounterSummary" });
export type EncounterSummary = z.infer<typeof encounterSummarySchema>;

export const encounterListSchema = z
  .object({ items: z.array(encounterSummarySchema) })
  .meta({ id: "EncounterList" });
export type EncounterList = z.infer<typeof encounterListSchema>;

export const clinicalNoteStatusSchema = z.enum(["draft", "signed", "entered_in_error"]);

export const clinicalNoteVersionSchema = z
  .object({
    id: z.uuid(),
    versionNumber: z.number().int().min(1),
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
    /** `ai_draft`: started from an approved AI generation (`aiGenerationId`). */
    source: z.enum(["clinician", "ai_draft"]),
    aiGenerationId: z.uuid().nullable(),
    isAmendment: z.boolean(),
    amendmentReason: z.string().nullable(),
    createdBy: personRefSchema.nullable(),
    createdAt: instantSchema,
  })
  .meta({ id: "ClinicalNoteVersion" });

export const clinicalNoteSummarySchema = z
  .object({
    id: z.uuid(),
    patientId: z.uuid(),
    encounterId: z.uuid().nullable(),
    noteType: z.enum(["progress_note", "initial_evaluation"]),
    status: clinicalNoteStatusSchema,
    author: personRefSchema,
    signedAt: instantSchema.nullable(),
    signedBy: personRefSchema.nullable(),
    currentVersionId: z.uuid().nullable(),
    currentVersionNumber: z.number().int().nullable(),
    /** True when any version came from an AI draft. */
    startedFromAiDraft: z.boolean(),
    /** Set when a signed note was marked entered in error; the text stays readable. */
    enteredInError: z
      .object({ at: instantSchema, by: personRefSchema.nullable(), reason: z.string() })
      .nullable(),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .meta({ id: "ClinicalNoteSummary" });
export type ClinicalNoteSummary = z.infer<typeof clinicalNoteSummarySchema>;

export const clinicalNoteSchema = clinicalNoteSummarySchema
  .extend({
    currentVersion: clinicalNoteVersionSchema.nullable(),
    /** Every version, oldest first. Versions are append-only. */
    versions: z.array(clinicalNoteVersionSchema),
    /** The caller is the author and the note is a draft (sign or add a working version). */
    canSign: z.boolean(),
    /** The caller is the author and the note is signed (sign an amendment). */
    canAmend: z.boolean(),
    /** The note is signed and the caller is its author or a clinic administrator. */
    canMarkEnteredInError: z.boolean(),
  })
  .meta({ id: "ClinicalNote" });
export type ClinicalNote = z.infer<typeof clinicalNoteSchema>;

export const clinicalNotePageSchema = pageOf(clinicalNoteSummarySchema).meta({
  id: "ClinicalNotePage",
});
export type ClinicalNotePage = z.infer<typeof clinicalNotePageSchema>;

export const noteIdParamsSchema = z.object({ patientId: z.uuid(), noteId: z.uuid() });

const soapText = z.string().max(8000);

/**
 * A working version of a draft note, by its author. Never overwrites an earlier version. A
 * signed note takes no working versions: see `signNoteAmendmentSchema`.
 */
export const createNoteVersionSchema = z
  .object({
    /** The current version as last read; a different value answers 409 `draft_stale`. */
    expectedVersionId: z.uuid(),
    subjective: soapText,
    objective: soapText,
    assessment: soapText,
    plan: soapText,
  })
  .strict();
export type CreateNoteVersion = z.infer<typeof createNoteVersionSchema>;

/**
 * Amend a signed note: the new version is created and signed by the author in one call, so the
 * current version of a signed note is always signed (CR-8; demo rule pending clinical
 * governance review). There is no saved, unsigned amendment.
 */
export const signNoteAmendmentSchema = z
  .object({
    expectedVersionId: z.uuid(),
    subjective: soapText,
    objective: soapText,
    assessment: soapText,
    plan: soapText,
    reason: z.string().trim().min(3).max(500),
  })
  .strict();
export type SignNoteAmendment = z.infer<typeof signNoteAmendmentSchema>;

/**
 * Mark a signed note entered in error (CR-8): author or clinic administrator, reason required,
 * irreversible. The text stays readable; the note is no longer exportable.
 */
export const markNoteEnteredInErrorSchema = z
  .object({ reason: z.string().trim().min(3).max(500) })
  .strict();
export type MarkNoteEnteredInError = z.infer<typeof markNoteEnteredInErrorSchema>;

export const signNoteSchema = z
  .object({
    /** The version the clinician read and signs; a different value answers 409 `draft_stale`. */
    expectedVersionId: z.uuid(),
  })
  .strict();
export type SignNote = z.infer<typeof signNoteSchema>;
