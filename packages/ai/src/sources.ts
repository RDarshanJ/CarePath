import type { NoteDraftInputParsed, ProgressSummaryInputParsed } from "./inputs.js";
import {
  transcriptTurnField,
  type GenerationKind,
  type SourceRef,
  type SourceRefType,
} from "./schemas.js";

export type FieldValue = string | number | boolean | null;

/** One source record as the verifier sees it: where it belongs, and its citable fields. */
export interface SourceRecord {
  type: SourceRefType;
  id: string;
  organizationId: string;
  patientId: string;
  fields: Record<string, FieldValue>;
}

/** Fields that hold free text written by a person; these are the injection surface. */
export const FREE_TEXT_FIELDS: Partial<Record<SourceRefType, string[]>> = {
  message: ["body"],
  check_in: ["notes"],
  session_activity: ["skipReason"],
};

export const refKey = (r: Pick<SourceRef, "type" | "id">) => `${r.type}:${r.id}`;

/** Every record in a generation input, in a stable order. Prompts render these and nothing else. */
export function sourceRecords(
  kind: "progress_summary",
  input: ProgressSummaryInputParsed,
): SourceRecord[];
export function sourceRecords(kind: "note_draft", input: NoteDraftInputParsed): SourceRecord[];
export function sourceRecords(
  kind: GenerationKind,
  input: ProgressSummaryInputParsed | NoteDraftInputParsed,
): SourceRecord[];
export function sourceRecords(
  kind: GenerationKind,
  input: ProgressSummaryInputParsed | NoteDraftInputParsed,
): SourceRecord[] {
  const { organizationId, patientId } = input.scope;
  const rec = (
    type: SourceRefType,
    id: string,
    fields: Record<string, FieldValue>,
  ): SourceRecord => ({
    type,
    id,
    organizationId,
    patientId,
    fields,
  });
  if (kind === "note_draft") {
    const i = input as NoteDraftInputParsed;
    const fields: Record<string, FieldValue> = {
      type: i.encounter.type,
      bodyRegion: i.encounter.bodyRegion,
    };
    for (const t of i.transcript) fields[transcriptTurnField(t.turn)] = `${t.speaker}: ${t.text}`;
    return [rec("encounter", i.encounter.id, fields)];
  }
  const i = input as ProgressSummaryInputParsed;
  const out: SourceRecord[] = [];
  if (i.carePlan) {
    out.push(
      rec("care_plan_version", i.carePlan.versionId, {
        title: i.carePlan.title,
        versionNumber: i.carePlan.versionNumber,
        publishedAt: i.carePlan.publishedAt,
        exerciseCount: i.carePlan.exerciseCount,
      }),
    );
  }
  for (const s of i.sessions) {
    out.push(
      rec("exercise_session", s.id, {
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      }),
    );
    for (const a of s.activities) {
      out.push(
        rec("session_activity", a.id, {
          status: a.status,
          exerciseName: a.exerciseName,
          discomfortReported: a.discomfortReported,
          discomfortLevel: a.discomfortLevel,
          skipReason: a.skipReason,
        }),
      );
    }
  }
  for (const c of i.checkIns) {
    out.push(
      rec("check_in", c.id, {
        painScore: c.painScore,
        difficulty: c.difficulty,
        notes: c.notes,
        submittedAt: c.submittedAt,
      }),
    );
  }
  for (const m of i.messages) {
    out.push(
      rec("message", m.id, { senderRole: m.senderRole, body: m.body, createdAt: m.createdAt }),
    );
  }
  for (const a of i.appointments) {
    out.push(rec("appointment", a.id, { type: a.type, status: a.status, startsAt: a.startsAt }));
  }
  return out;
}
