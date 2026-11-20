import { describe, expect, it } from "vitest";
import { EvalCase } from "../evals/schema.js";
import { NoteDraftInput, ProgressSummaryInput, parseTranscriptText } from "../src/inputs.js";
import { draftProgressSummary, draftSoapNote } from "../src/providers/deterministic.js";
import {
  ProgressSummaryOutput,
  SoapNoteDraftOutput,
  SourceRef,
  listStatements,
} from "../src/schemas.js";
import { fixtureCase, noteInputFromCase, progressInput } from "./helpers.js";

describe("output schemas", () => {
  it("deterministic progress summary is schema-valid and every statement cites a source", () => {
    const out = draftProgressSummary(ProgressSummaryInput.parse(progressInput()));
    expect(ProgressSummaryOutput.safeParse(out).success).toBe(true);
    const all = listStatements("progress_summary", out);
    expect(all.length).toBeGreaterThan(5);
    for (const { statement } of all) expect(statement.sourceRefs.length).toBeGreaterThan(0);
  });

  it("deterministic SOAP draft is schema-valid for both fixture transcripts", () => {
    for (const id of ["case-90", "case-91"] as const) {
      const out = draftSoapNote(NoteDraftInput.parse(noteInputFromCase(fixtureCase(id))));
      expect(SoapNoteDraftOutput.safeParse(out).success).toBe(true);
    }
  });

  it("rejects extra keys, statements without sourceRefs, and malformed refs", () => {
    const base = draftSoapNote(NoteDraftInput.parse(noteInputFromCase(fixtureCase("case-90"))));
    expect(SoapNoteDraftOutput.safeParse({ ...base, diagnosis: "x" }).success).toBe(false);
    const noRefs = { ...base, plan: [{ id: "s99", text: "Plan text" }] };
    expect(SoapNoteDraftOutput.safeParse(noRefs).success).toBe(false);
    expect(
      SourceRef.safeParse({ type: "encounter", id: "a", field: "transcript turn 3" }).success,
    ).toBe(false);
    expect(SourceRef.safeParse({ type: "patient", id: "a", field: "name" }).success).toBe(false);
    expect(SourceRef.safeParse({ type: "message", id: "a", field: "body", extra: 1 }).success).toBe(
      false,
    );
    expect(
      SoapNoteDraftOutput.safeParse({ ...base, plan: [{ id: "x1", text: "t", sourceRefs: [] }] })
        .success,
    ).toBe(false);
  });

  it("parses Encounter.transcript text into numbered turns", () => {
    const turns = parseTranscriptText(
      "Clinician: How is the knee?\n\nPatient: Sore, 5/10.\nTherapist: Noted.",
    );
    expect(turns).toEqual([
      { turn: 1, speaker: "clinician", text: "How is the knee?" },
      { turn: 2, speaker: "patient", text: "Sore, 5/10." },
      { turn: 3, speaker: "clinician", text: "Noted." },
    ]);
  });
});

describe("eval case schema (EvalCase v1)", () => {
  const good = fixtureCase("case-90");

  it("accepts the fixture cases", () => {
    expect(EvalCase.safeParse(good).success).toBe(true);
    expect(EvalCase.safeParse(fixtureCase("case-91")).success).toBe(true);
  });

  it("rejects a mustMention term that is not in its source turns", () => {
    const bad = structuredClone(good);
    bad.expectedFacts[0]!.mustMention = ["9/10"];
    expect(EvalCase.safeParse(bad).success).toBe(false);
  });

  it("rejects non-consecutive turns, unknown source turns and non-synthetic cases", () => {
    const gap = structuredClone(good);
    gap.transcript[2]!.turn = 7;
    expect(EvalCase.safeParse(gap).success).toBe(false);
    const ghost = structuredClone(good);
    ghost.expectedFacts[0]!.sourceTurns = [99];
    expect(EvalCase.safeParse(ghost).success).toBe(false);
    expect(EvalCase.safeParse({ ...good, synthetic: false }).success).toBe(false);
  });
});
