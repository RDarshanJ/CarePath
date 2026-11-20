import { z } from "zod";
import { TranscriptTurn } from "../evals/schema.js";

/**
 * Inputs the API layer (WP 5.2) assembles from the database, scoped to one patient in one
 * organization. Ids are record ids; they become `sourceRefs`. Timestamps are ISO-8601 UTC.
 * Nothing here is free-form instruction text: message bodies, check-in notes and transcript turns
 * are data and are always delimited as such in prompts.
 */

const id = z.string().min(1).max(64);
const instant = z.iso.datetime({ offset: true });

export const Scope = z.strictObject({ organizationId: id, patientId: id });
export type Scope = z.infer<typeof Scope>;

/** Identifying details the redactor must remove before any external call. Never sent anywhere. */
export const KnownIdentifiers = z.strictObject({
  names: z.array(z.string().min(1)).default([]),
  birthDates: z.array(z.string().min(1)).default([]),
  emails: z.array(z.string().min(1)).default([]),
  phones: z.array(z.string().min(1)).default([]),
  addresses: z.array(z.string().min(1)).default([]),
  otherIdentifiers: z.array(z.string().min(1)).default([]),
});
export type KnownIdentifiers = z.infer<typeof KnownIdentifiers>;

export const ProgressSummaryInput = z.strictObject({
  scope: Scope,
  window: z.strictObject({ from: instant, to: instant }),
  carePlan: z
    .strictObject({
      versionId: id,
      versionNumber: z.int().min(1),
      title: z.string(),
      publishedAt: instant,
      exerciseCount: z.int().min(0),
    })
    .nullable(),
  sessions: z.array(
    z.strictObject({
      id,
      status: z.enum(["in_progress", "paused", "completed", "abandoned", "stopped_discomfort"]),
      startedAt: instant,
      completedAt: instant.nullable(),
      activities: z.array(
        z.strictObject({
          id,
          status: z.enum(["pending", "completed", "skipped"]),
          exerciseName: z.string(),
          discomfortReported: z.boolean(),
          discomfortLevel: z.int().min(0).max(10).nullable(),
          skipReason: z.string().nullable(),
        }),
      ),
    }),
  ),
  checkIns: z.array(
    z.strictObject({
      id,
      painScore: z.int().min(0).max(10),
      difficulty: z.enum(["easier", "as_expected", "harder"]).nullable(),
      notes: z.string().nullable(),
      submittedAt: instant,
    }),
  ),
  messages: z.array(
    z.strictObject({
      id,
      senderRole: z.enum(["patient", "clinician", "coordinator", "system"]),
      body: z.string(),
      createdAt: instant,
    }),
  ),
  appointments: z.array(
    z.strictObject({
      id,
      type: z.enum(["initial_evaluation", "follow_up", "video_follow_up"]),
      status: z.enum([
        "requested",
        "booked",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled_by_patient",
        "cancelled_by_clinic",
        "no_show",
      ]),
      startsAt: instant,
    }),
  ),
  identifiers: KnownIdentifiers.default({
    names: [],
    birthDates: [],
    emails: [],
    phones: [],
    addresses: [],
    otherIdentifiers: [],
  }),
});
export type ProgressSummaryInput = z.input<typeof ProgressSummaryInput>;
export type ProgressSummaryInputParsed = z.output<typeof ProgressSummaryInput>;

export const NoteDraftInput = z.strictObject({
  scope: Scope,
  encounter: z.strictObject({
    id,
    type: z.enum(["initial_evaluation", "follow_up", "video_follow_up"]),
    bodyRegion: z.string().nullable(),
  }),
  transcript: z.array(TranscriptTurn).min(1).max(400),
  identifiers: KnownIdentifiers.default({
    names: [],
    birthDates: [],
    emails: [],
    phones: [],
    addresses: [],
    otherIdentifiers: [],
  }),
});
export type NoteDraftInput = z.input<typeof NoteDraftInput>;
export type NoteDraftInputParsed = z.output<typeof NoteDraftInput>;

export type InputFor<K extends "progress_summary" | "note_draft"> = K extends "progress_summary"
  ? ProgressSummaryInputParsed
  : NoteDraftInputParsed;

export const INPUT_SCHEMAS = {
  progress_summary: ProgressSummaryInput,
  note_draft: NoteDraftInput,
} as const;

/** Splits `Encounter.transcript` (one turn per line, "Speaker: text") into turns. */
export function parseTranscriptText(text: string): z.infer<typeof TranscriptTurn>[] {
  const turns: z.infer<typeof TranscriptTurn>[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(clinician|therapist|patient|caregiver)\s*:\s*(.+)$/i.exec(line);
    const who = m?.[1]?.toLowerCase();
    const speaker = who === "patient" ? "patient" : who === "caregiver" ? "caregiver" : "clinician";
    turns.push({
      turn: turns.length + 1,
      speaker: m ? speaker : "clinician",
      text: (m?.[2] ?? line).slice(0, 1000),
    });
  }
  return turns;
}
