import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEvalCase, type EvalCase } from "../evals/schema.js";
import type { NoteDraftInput, ProgressSummaryInput } from "../src/inputs.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export const ORG = "0f000000-0000-4000-8000-000000000001";
export const OTHER_ORG = "0f000000-0000-4000-8000-000000000002";
export const PATIENT = "0a000000-0000-4000-8000-000000000001";
export const OTHER_PATIENT = "0a000000-0000-4000-8000-000000000002";
export const USER = "0c000000-0000-4000-8000-000000000001";

export const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function fixtureCase(id: "case-90" | "case-91"): EvalCase {
  const file = path.join(here, "fixtures", "eval-cases", `${id}.json`);
  return parseEvalCase(JSON.parse(readFileSync(file, "utf8")), id);
}

export function noteInputFromCase(
  c: EvalCase,
  identifiers: NoteDraftInput["identifiers"] = undefined,
): NoteDraftInput {
  return {
    scope: { organizationId: c.encounter.organizationId, patientId: c.encounter.patientId },
    encounter: { id: c.encounter.id, type: c.encounter.type, bodyRegion: c.encounter.bodyRegion },
    transcript: c.transcript,
    ...(identifiers ? { identifiers } : {}),
  };
}

/** A fortnight for one synthetic patient: four sessions, three check-ins, messages, appointments. */
export function progressInput(overrides: Partial<ProgressSummaryInput> = {}): ProgressSummaryInput {
  return {
    scope: { organizationId: ORG, patientId: PATIENT },
    window: { from: "2026-11-01T00:00:00.000Z", to: "2026-11-14T23:59:59.000Z" },
    carePlan: {
      versionId: u(1),
      versionNumber: 2,
      title: "Knee strength, phase two",
      publishedAt: "2026-10-28T15:00:00.000Z",
      exerciseCount: 4,
    },
    sessions: [
      {
        id: u(10),
        status: "completed",
        startedAt: "2026-11-02T17:00:00.000Z",
        completedAt: "2026-11-02T17:25:00.000Z",
        activities: [
          {
            id: u(101),
            status: "completed",
            exerciseName: "Heel slides",
            discomfortReported: false,
            discomfortLevel: null,
            skipReason: null,
          },
          {
            id: u(102),
            status: "skipped",
            exerciseName: "Wall sit",
            discomfortReported: false,
            discomfortLevel: null,
            skipReason: "Knee felt unstable",
          },
        ],
      },
      {
        id: u(11),
        status: "completed",
        startedAt: "2026-11-05T17:00:00.000Z",
        completedAt: "2026-11-05T17:20:00.000Z",
        activities: [],
      },
      {
        id: u(12),
        status: "stopped_discomfort",
        startedAt: "2026-11-09T17:00:00.000Z",
        completedAt: null,
        activities: [
          {
            id: u(121),
            status: "completed",
            exerciseName: "Step-ups",
            discomfortReported: true,
            discomfortLevel: 7,
            skipReason: null,
          },
        ],
      },
      {
        id: u(13),
        status: "abandoned",
        startedAt: "2026-11-12T17:00:00.000Z",
        completedAt: null,
        activities: [],
      },
    ],
    checkIns: [
      {
        id: u(20),
        painScore: 3,
        difficulty: "as_expected",
        notes: null,
        submittedAt: "2026-11-02T17:30:00.000Z",
      },
      {
        id: u(21),
        painScore: 4,
        difficulty: null,
        notes: "Swelling after the long walk on Saturday.",
        submittedAt: "2026-11-06T09:00:00.000Z",
      },
      {
        id: u(22),
        painScore: 6,
        difficulty: "harder",
        notes: null,
        submittedAt: "2026-11-10T09:00:00.000Z",
      },
    ],
    messages: [
      {
        id: u(30),
        senderRole: "patient",
        body: "The stairs at work are harder this week. Call me on 555-0199 if needed. Dana Whitlock",
        createdAt: "2026-11-08T12:00:00.000Z",
      },
      {
        id: u(31),
        senderRole: "clinician",
        body: "Thanks Dana, I will look at your plan.",
        createdAt: "2026-11-08T14:00:00.000Z",
      },
    ],
    appointments: [
      { id: u(40), type: "follow_up", status: "no_show", startsAt: "2026-11-04T16:00:00.000Z" },
      {
        id: u(41),
        type: "video_follow_up",
        status: "booked",
        startsAt: "2026-11-18T16:00:00.000Z",
      },
    ],
    identifiers: {
      names: ["Dana Whitlock"],
      birthDates: ["1984-03-09"],
      emails: ["dana.whitlock@example.test"],
      phones: ["555-0199"],
      addresses: ["14 Juniper Lane"],
      otherIdentifiers: ["MRN-448210"],
    },
    ...overrides,
  };
}

export const consentActive = { aiAssistedFeatures: "active" } as const;
export const requester = { organizationId: ORG, userId: USER };
