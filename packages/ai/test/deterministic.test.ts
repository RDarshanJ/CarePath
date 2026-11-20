import { describe, expect, it } from "vitest";
import { NoteDraftInput, ProgressSummaryInput } from "../src/inputs.js";
import { DETERMINISTIC_PROVIDER_LABEL } from "../src/labels.js";
import {
  DeterministicProvider,
  classifySentence,
  draftProgressSummary,
  draftSoapNote,
} from "../src/providers/deterministic.js";
import { listStatements } from "../src/schemas.js";
import { fixtureCase, noteInputFromCase, progressInput, u } from "./helpers.js";

describe("deterministic provider", () => {
  it("is labelled and local", () => {
    const p = new DeterministicProvider();
    expect([p.id, p.label, p.model, p.external]).toEqual([
      "deterministic",
      DETERMINISTIC_PROVIDER_LABEL,
      null,
      false,
    ]);
    expect(DETERMINISTIC_PROVIDER_LABEL).toBe("Demo provider, rule-based");
  });

  it("is deterministic: same input, same output", () => {
    const input = ProgressSummaryInput.parse(progressInput());
    expect(draftProgressSummary(input)).toEqual(draftProgressSummary(input));
  });

  it("progress summary numbers come from the input", () => {
    const out = draftProgressSummary(ProgressSummaryInput.parse(progressInput()));
    const texts = listStatements("progress_summary", out).map((s) => s.statement.text);
    expect(texts).toContain(
      "2 of 4 exercise sessions started between 2026-11-01 and 2026-11-14 were completed.",
    );
    expect(texts).toContain(
      "Patient-reported pain went from 3/10 on 2026-11-02 to 6/10 on 2026-11-10.",
    );
    expect(out.itemsForReview.map((s) => s.text)).toEqual(
      expect.arrayContaining([
        "Patient-reported pain rose by 3 points in the window.",
        "Session started 2026-11-09 was stopped for discomfort.",
        'Discomfort 7/10 reported during "Step-ups" on 2026-11-09.',
      ]),
    );
    expect(texts).toContain(
      '"Wall sit" was skipped on 2026-11-02, reason given: "Knee felt unstable".',
    );
    expect(texts).toContain("Follow-up on 2026-11-04 was missed.");
    expect(texts).toContain("Next appointment: video follow-up on 2026-11-18.");
    // Clinician messages are not reported as patient-reported changes.
    expect(texts.join(" ")).not.toContain("I will look at your plan");
  });

  it("progress summary reports gaps as missing information, not as statements", () => {
    const out = draftProgressSummary(
      ProgressSummaryInput.parse(
        progressInput({
          sessions: [],
          checkIns: [],
          messages: [],
          appointments: [],
          carePlan: null,
        }),
      ),
    );
    expect(listStatements("progress_summary", out)).toHaveLength(0);
    expect(out.missingInformation.map((m) => m.item)).toEqual([
      "no_check_ins_in_window",
      "no_sessions_in_window",
      "no_current_care_plan",
      "no_upcoming_appointment",
      "no_patient_messages_in_window",
    ]);
  });

  it("SOAP draft quotes the transcript, cites the turn and reports the expected gaps", () => {
    const c = fixtureCase("case-91");
    const out = draftSoapNote(NoteDraftInput.parse(noteInputFromCase(c)));
    expect(out.subjective[0]).toEqual({
      id: "s1",
      text: 'Patient: "It is stiff in the morning. Pain is 6 out of 10 when I get out of bed and it eases after a walk."',
      sourceRefs: [{ type: "encounter", id: c.encounter.id, field: "transcript.turn.2" }],
    });
    expect(out.missingInformation.map((m) => m.item).sort()).toEqual([...c.expectedMissing].sort());
    expect(out.notices).toEqual([
      {
        code: "instruction_like_source_text",
        sourceRefs: [{ type: "encounter", id: c.encounter.id, field: "transcript.turn.3" }],
      },
    ]);
    // Contact details are not clinical content and are not quoted.
    expect(JSON.stringify(out)).not.toContain("example.test");
  });

  it("covers every item on the fully covered fixture", () => {
    const out = draftSoapNote(NoteDraftInput.parse(noteInputFromCase(fixtureCase("case-90"))));
    expect(out.missingInformation).toEqual([]);
  });

  it("classifies sentences by speaker and cue, and skips questions", () => {
    expect(classifySentence("patient", "Stairs are still hard.")).toBe("subjective");
    expect(classifySentence("clinician", "Flexion is 120 degrees.")).toBe("objective");
    expect(classifySentence("clinician", "Assessment: improving well.")).toBe("assessment");
    expect(classifySentence("clinician", "Plan: add step-ups.")).toBe("plan");
    expect(classifySentence("clinician", "How is the knee?")).toBeNull();
    expect(classifySentence("patient", "Okay.")).toBeNull();
  });

  it("refuses an external call shape", async () => {
    await expect(
      new DeterministicProvider().generate({
        destination: "external",
        kind: "note_draft",
        prompt: { key: "note_draft", version: "1.0.0", system: "", user: "" as never },
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "not_configured" });
    expect(u(1)).toMatch(/1$/);
  });
});
