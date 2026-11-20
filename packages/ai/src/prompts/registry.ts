import { createHash } from "node:crypto";
import { z } from "zod";
import { DATA_HANDLING_RULES, delimit } from "../injection.js";
import type { NoteDraftInputParsed, ProgressSummaryInputParsed } from "../inputs.js";
import { OUTPUT_SCHEMAS, type GenerationKind } from "../schemas.js";
import { sourceRecords } from "../sources.js";

/**
 * Prompt registry. A prompt is identified by key and version; the version is stored on every
 * `AIGeneration`. The fingerprint hashes everything that shapes the model's behaviour (system text,
 * output schema, data-handling rules), and a test pins the fingerprint of each registered version, so a
 * prompt cannot change without a new version.
 */

export interface RenderedPrompt {
  key: GenerationKind;
  version: string;
  system: string;
  user: string;
}

export interface PromptDefinition<K extends GenerationKind = GenerationKind> {
  key: K;
  version: string;
  /** What changed in this version, for the record history. */
  changeNote: string;
  system: string;
  render(
    input: K extends "progress_summary" ? ProgressSummaryInputParsed : NoteDraftInputParsed,
  ): string;
}

const outputContract = (kind: GenerationKind) =>
  [
    "Respond with exactly one JSON object and nothing else: no prose, no code fences.",
    "It must match this JSON Schema:",
    JSON.stringify(z.toJSONSchema(OUTPUT_SCHEMAS[kind])),
    "Statement ids are s1, s2, s3 ... in order, unique across the whole object.",
  ].join("\n");

const renderRecords = (records: ReturnType<typeof sourceRecords>) =>
  records
    .flatMap((r) =>
      Object.entries(r.fields).map(([field, value]) =>
        delimit({ type: r.type, id: r.id, field }, value),
      ),
    )
    .join("\n");

const progressSummaryV1: PromptDefinition<"progress_summary"> = {
  key: "progress_summary",
  version: "1.0.0",
  changeNote: "First version.",
  system: [
    "You draft a clinician-facing progress summary for a physical therapist in a demonstration product with synthetic data.",
    "The therapist reviews, edits and approves or rejects your draft; nothing you write reaches the patient or the record without that review.",
    "Report only what the source records show: completed and missed activity, patient-reported pain and difficulty, what the patient wrote in messages and check-in notes, appointments and the current plan.",
    "Do not diagnose, do not recommend treatment or exercise changes, do not predict risk, and do not give a confidence score.",
    "Put gaps in missingInformation, not in statements. Put anything the therapist should look at (high or rising pain, sessions stopped for discomfort) in itemsForReview.",
    DATA_HANDLING_RULES,
    outputContract("progress_summary"),
  ].join("\n\n"),
  render(input) {
    return [
      `Review window: ${input.window.from} to ${input.window.to}.`,
      "Source records:",
      renderRecords(sourceRecords("progress_summary", input)),
    ].join("\n");
  },
};

const noteDraftV1: PromptDefinition<"note_draft"> = {
  key: "note_draft",
  version: "1.0.0",
  changeNote: "First version.",
  system: [
    "You draft a SOAP note from a synthetic physical-therapy encounter transcript in a demonstration product.",
    "The therapist edits the draft and signs the note; your draft is never a signed record.",
    "subjective: what the patient or caregiver reports. objective: what the clinician measured or observed. assessment: the clinician's own stated interpretation. plan: what the clinician said happens next.",
    "Use only what the transcript says. Do not add a diagnosis, interpretation or plan the clinician did not state. Cite each statement with the transcript turns it comes from.",
    "List in missingInformation each of these items the transcript does not cover: pain_score, range_of_motion, strength, functional_status, home_exercise_adherence, red_flag_screen, goals, follow_up_plan.",
    DATA_HANDLING_RULES,
    outputContract("note_draft"),
  ].join("\n\n"),
  render(input) {
    return [
      `Encounter type: ${input.encounter.type}.`,
      "Transcript, one source record per turn:",
      renderRecords(sourceRecords("note_draft", input)),
    ].join("\n");
  },
};

const REGISTRY: { [K in GenerationKind]: PromptDefinition<K>[] } = {
  progress_summary: [progressSummaryV1],
  note_draft: [noteDraftV1],
};

export function listPrompts(): PromptDefinition[] {
  return [...REGISTRY.progress_summary, ...REGISTRY.note_draft] as PromptDefinition[];
}

const compareVersions = (a: string, b: string) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

/** The named version, or the latest when `version` is omitted. Throws for an unknown version. */
export function getPrompt<K extends GenerationKind>(key: K, version?: string): PromptDefinition<K> {
  const versions = REGISTRY[key] as PromptDefinition<K>[];
  const found = version
    ? versions.find((p) => p.version === version)
    : [...versions].sort((a, b) => compareVersions(b.version, a.version))[0];
  if (!found) throw new Error(`unknown prompt ${key}@${version ?? "latest"}`);
  return found;
}

export function promptFingerprint(p: PromptDefinition): string {
  return createHash("sha256").update(`${p.key}\u0000${p.version}\u0000${p.system}`).digest("hex");
}
