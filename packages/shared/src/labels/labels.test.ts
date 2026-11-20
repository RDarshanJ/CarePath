import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { appointmentStatuses, appointmentTypes } from "../contracts/scheduling.js";
import { exerciseSessionStatuses, sessionActivityStatusSchema } from "../contracts/sessions.js";
import { messageStatusSchema } from "../contracts/messaging.js";
import { patientStatusSchema, planStageSchema } from "../contracts/patients.js";
import { reviewTaskStatusSchema } from "../contracts/review.js";
import {
  aiDraftState,
  aiDraftStateLabels,
  aiGenerationStatusStates,
  aiReviewDecisionStates,
  appointmentStatusLabels,
  appointmentTypeLabels,
  carePlanStatusLabels,
  clinicalNoteStatusLabels,
  intakeStatusLabels,
  messageStatusLabels,
  noteVersionSourceLabels,
  patientStatusLabels,
  planStageLabels,
  priorityLevelLabels,
  reviewTaskStatusLabels,
  sessionActivityStatusLabels,
  sessionStatusLabels,
  versionMarkerLabels,
} from "./index.js";

/** Enums read from the Prisma schema, the source of truth for the database. */
const schema = readFileSync(
  fileURLToPath(new URL("../../../db/prisma/schema.prisma", import.meta.url)),
  "utf8",
);
function prismaEnum(name: string): string[] {
  const m = new RegExp(`^enum ${name} \\{([^}]*)\\}`, "m").exec(schema);
  if (!m) throw new Error(`enum ${name} not found in schema.prisma`);
  return m[1]!
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"));
}

const keys = (o: object) => Object.keys(o).sort();
const sorted = (a: readonly string[]) => [...a].sort();

/** A map covers an enum exactly: no value without a label, no label without a value. */
function expectCovers(map: object, values: readonly string[], what: string) {
  expect(values.length, `${what}: enum read as empty`).toBeGreaterThan(0);
  expect(keys(map), what).toEqual(sorted(values));
}

describe("status maps cover the database enums", () => {
  it.each([
    ["PatientStatus", patientStatusLabels],
    ["AppointmentStatus", appointmentStatusLabels],
    ["AppointmentType", appointmentTypeLabels],
    ["ReviewTaskStatus", reviewTaskStatusLabels],
    ["MessageStatus", messageStatusLabels],
    ["ExerciseSessionStatus", sessionStatusLabels],
    ["SessionActivityStatus", sessionActivityStatusLabels],
    ["CarePlanStatus", carePlanStatusLabels],
    ["ClinicalNoteStatus", clinicalNoteStatusLabels],
    ["NoteVersionSource", noteVersionSourceLabels],
    ["AIGenerationStatus", aiGenerationStatusStates],
    ["AIReviewDecision", aiReviewDecisionStates],
  ])("%s", (name, map) => {
    expectCovers(map, prismaEnum(name), name);
  });

  it("IntakeStatus plus the no-intake-record state", () => {
    expectCovers(intakeStatusLabels, [...prismaEnum("IntakeStatus"), "not_started"], "intake");
  });
});

describe("status maps cover the contract enums", () => {
  it.each([
    ["patientStatusSchema", patientStatusLabels, patientStatusSchema.options],
    ["planStageSchema", planStageLabels, planStageSchema.options],
    ["appointmentStatuses", appointmentStatusLabels, appointmentStatuses],
    ["appointmentTypes", appointmentTypeLabels, appointmentTypes],
    ["reviewTaskStatusSchema", reviewTaskStatusLabels, reviewTaskStatusSchema.options],
    ["messageStatusSchema", messageStatusLabels, messageStatusSchema.options],
    ["exerciseSessionStatuses", sessionStatusLabels, exerciseSessionStatuses],
    [
      "sessionActivityStatusSchema",
      sessionActivityStatusLabels,
      sessionActivityStatusSchema.options,
    ],
  ])("%s", (name, map, values) => {
    expectCovers(map, values, name);
  });
});

describe("the derived AI draft state", () => {
  it("has a label for every generation and review combination", () => {
    for (const g of prismaEnum("AIGenerationStatus")) {
      for (const d of [null, ...prismaEnum("AIReviewDecision")]) {
        const state = aiDraftState(g as never, d as never);
        expect(aiDraftStateLabels[state].label.length).toBeGreaterThan(0);
      }
    }
  });
  it("covers every state with a label and no state without a source", () => {
    const used = new Set([
      ...Object.values(aiGenerationStatusStates),
      ...Object.values(aiReviewDecisionStates),
    ]);
    expect([...used].sort()).toEqual(keys(aiDraftStateLabels));
  });
  it("a failed generation ignores any decision", () => {
    expect(aiDraftState("failed", null)).toBe("failed");
    expect(aiDraftState("pending", null)).toBe("pending");
    expect(aiDraftState("succeeded", null)).toBe("unreviewed");
    expect(aiDraftState("succeeded", "approved_with_edits")).toBe("approved_with_edits");
  });
});

describe("wording rules", () => {
  it("audience variants differ only by the documented perspective pair", () => {
    const differing = Object.entries(appointmentStatusLabels)
      .filter(([, v]) => v.staff !== v.patient)
      .map(([k]) => k)
      .sort();
    expect(differing).toEqual(["cancelled_by_patient", "no_show"]);
    expect(appointmentStatusLabels.no_show).toMatchObject({
      staff: "Did not attend",
      patient: "You did not attend",
    });
    expect(appointmentStatusLabels.cancelled_by_patient).toMatchObject({
      staff: "Cancelled by the patient",
      patient: "Cancelled by you",
    });
  });

  it("uses one word for the current version and one for the video visit", () => {
    expect(versionMarkerLabels.current.label).toBe("Current");
    expect(appointmentTypeLabels.video_follow_up).toBe("Video follow-up");
    expect(sessionStatusLabels.abandoned.label).toBe("Not finished");
  });

  it("only high priority carries a mark", () => {
    expect(priorityLevelLabels.high?.label).toBe("High priority");
    expect(priorityLevelLabels.standard).toBeNull();
  });

  it("labels are sentence case, with no trailing full stop", () => {
    const labels: string[] = [
      ...Object.values(patientStatusLabels).flatMap((v) => [v.label, v.patientLabel ?? ""]),
      ...Object.values(appointmentStatusLabels).flatMap((v) => [v.staff, v.patient]),
      ...Object.values(appointmentTypeLabels),
      ...Object.values(planStageLabels),
      ...Object.values(carePlanStatusLabels).map((v) => v.label),
      ...Object.values(versionMarkerLabels).map((v) => v.label),
      ...Object.values(reviewTaskStatusLabels).map((v) => v.label),
      ...Object.values(messageStatusLabels).map((v) => v.label),
      ...Object.values(sessionStatusLabels).map((v) => v.label),
      ...Object.values(clinicalNoteStatusLabels).map((v) => v.label),
      ...Object.values(aiDraftStateLabels).map((v) => v.label),
      ...Object.values(intakeStatusLabels).map((v) => v.label),
    ].filter(Boolean);
    for (const l of labels) {
      expect(l, l).not.toMatch(/\.$/);
      // No title-case words beyond the first (AI is an initialism, not a title-case word).
      const rest = l
        .split(" ")
        .slice(1)
        .join(" ")
        .replace(/\bAI\b/g, "");
      expect(rest, l).not.toMatch(/\b[A-Z][a-z]/);
    }
  });

  it("a tag-form status has a tone", () => {
    for (const map of [
      patientStatusLabels,
      reviewTaskStatusLabels,
      sessionStatusLabels,
      carePlanStatusLabels,
      clinicalNoteStatusLabels,
      versionMarkerLabels,
    ]) {
      for (const v of Object.values(map)) expect(v.tone).toBeTruthy();
    }
  });
});
