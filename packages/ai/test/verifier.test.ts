import { describe, expect, it, vi } from "vitest";
import { UNSUPPORTED_LABEL } from "../src/labels.js";
import type { ProgressSummaryOutput, SourceRef } from "../src/schemas.js";
import type { SourceRecord } from "../src/sources.js";
import { createInMemoryResolver, verifyOutput, type EvidenceResolver } from "../src/verifier.js";
import { ORG, OTHER_ORG, OTHER_PATIENT, PATIENT, u } from "./helpers.js";

const scope = { organizationId: ORG, patientId: PATIENT };
const records: SourceRecord[] = [
  {
    type: "check_in",
    id: u(1),
    organizationId: ORG,
    patientId: PATIENT,
    fields: { painScore: 4, notes: null },
  },
  {
    type: "check_in",
    id: u(2),
    organizationId: ORG,
    patientId: OTHER_PATIENT,
    fields: { painScore: 9 },
  },
  {
    type: "message",
    id: u(3),
    organizationId: OTHER_ORG,
    patientId: PATIENT,
    fields: { body: "Hello" },
  },
  {
    type: "message",
    id: u(4),
    organizationId: ORG,
    patientId: PATIENT,
    fields: { body: "Knee is sore" },
  },
];
const ref = (type: SourceRef["type"], id: string, field: string): SourceRef => ({
  type,
  id,
  field,
});

const output = (
  statements: { text: string; sourceRefs: SourceRef[] }[],
): ProgressSummaryOutput => ({
  summary: statements.map((s, i) => ({ id: `s${i + 1}`, ...s })),
  reportedChanges: [],
  engagementObservations: [],
  missingInformation: [],
  itemsForReview: [],
  notices: [],
});

describe("evidence verifier", () => {
  const resolver = createInMemoryResolver(records);

  it("marks each statement supported or unsupported and computes the rate", async () => {
    const out = output([
      { text: "Pain 4/10.", sourceRefs: [ref("check_in", u(1), "painScore")] },
      { text: "Pain 9/10.", sourceRefs: [ref("check_in", u(2), "painScore")] },
      { text: "Said hello.", sourceRefs: [ref("message", u(3), "body")] },
      { text: "Invented.", sourceRefs: [ref("message", u(99), "body")] },
      { text: "Note text.", sourceRefs: [ref("check_in", u(1), "notes")] },
      { text: "Field that does not exist.", sourceRefs: [ref("check_in", u(1), "diagnosis")] },
      { text: "No refs.", sourceRefs: [] },
      {
        text: "Mixed.",
        sourceRefs: [ref("message", u(4), "body"), ref("check_in", u(2), "painScore")],
      },
      {
        text: "Two good refs.",
        sourceRefs: [ref("message", u(4), "body"), ref("check_in", u(1), "painScore")],
      },
    ]);
    const v = await verifyOutput("progress_summary", out, resolver, scope);
    expect(v.statements.map((s) => s.status)).toEqual([
      "supported",
      "unsupported", // AC-F3: another patient's record
      "unsupported", // another organization's record
      "unsupported", // no such record
      "unsupported", // field is empty
      "unsupported", // field does not exist
      "unsupported", // no refs at all
      "unsupported", // one bad ref spoils the statement
      "supported",
    ]);
    expect(v.statements[1]!.refs[0]!.status).toBe("out_of_scope");
    expect(v.statements[3]!.refs[0]!.status).toBe("not_found");
    expect(v.statements[4]!.refs[0]!.status).toBe("field_missing");
    expect(v.statements[6]!.reason).toBe("no_source_refs");
    expect(v.statements[1]!.label).toBe(UNSUPPORTED_LABEL);
    expect(v.statements[0]!.refs[0]!.value).toBe(4);
    expect([v.statementCount, v.supportedCount, v.unsupportedCount]).toEqual([9, 2, 7]);
    expect(v.unsupportedRate).toBeCloseTo(7 / 9);
  });

  it("with an allow-list, a resolved ref to a record outside it is unsupported with not_in_input (C3 A2)", async () => {
    const out = output([
      { text: "Pain 4/10.", sourceRefs: [ref("check_in", u(1), "painScore")] },
      { text: "Knee is sore.", sourceRefs: [ref("message", u(4), "body")] },
      {
        text: "Both.",
        sourceRefs: [ref("check_in", u(1), "painScore"), ref("message", u(4), "body")],
      },
      { text: "Another patient.", sourceRefs: [ref("check_in", u(2), "painScore")] },
    ]);
    // The prompt was built from the check-in only (any field of it); the message was not given.
    const v = await verifyOutput("progress_summary", out, resolver, scope, {
      allowedRecords: [{ type: "check_in", id: u(1) }],
    });
    expect(v.statements.map((s) => [s.status, s.reason])).toEqual([
      ["supported", null],
      ["unsupported", "not_in_input"],
      ["unsupported", "not_in_input"],
      // An unresolved ref is reported as such even when it is also outside the list.
      ["unsupported", "unresolved_source_ref"],
    ]);
    expect(v.statements[1]!.refs[0]).toMatchObject({ status: "resolved", inInput: false });
    expect(v.statements[0]!.refs[0]!.inInput).toBe(true);
    expect(v.statements[1]!.label).toBe(UNSUPPORTED_LABEL);
    expect(v.unsupportedCount).toBe(3);
  });

  it("without an allow-list, refs carry no inInput mark and verify as before", async () => {
    const v = await verifyOutput(
      "progress_summary",
      output([{ text: "Knee is sore.", sourceRefs: [ref("message", u(4), "body")] }]),
      resolver,
      scope,
    );
    expect(v.statements[0]!.status).toBe("supported");
    expect(v.statements[0]!.refs[0]).not.toHaveProperty("inInput");
  });

  it("asks the resolver once, with distinct refs only", async () => {
    const spy: EvidenceResolver = { resolve: vi.fn(resolver.resolve) };
    const r = ref("check_in", u(1), "painScore");
    await verifyOutput(
      "progress_summary",
      output([
        { text: "a", sourceRefs: [r] },
        { text: "b", sourceRefs: [r, r] },
      ]),
      spy,
      scope,
    );
    expect(spy.resolve).toHaveBeenCalledTimes(1);
    expect(vi.mocked(spy.resolve).mock.calls[0]![0]).toEqual([r]);
  });

  it("an output with no statements has a null rate and does not call the resolver", async () => {
    const spy: EvidenceResolver = { resolve: vi.fn(resolver.resolve) };
    const v = await verifyOutput("progress_summary", output([]), spy, scope);
    expect(v.unsupportedRate).toBeNull();
    expect(spy.resolve).not.toHaveBeenCalled();
  });

  it("rejects a resolver that drops refs", async () => {
    const broken: EvidenceResolver = { resolve: async () => [] };
    await expect(
      verifyOutput(
        "progress_summary",
        output([{ text: "a", sourceRefs: [ref("check_in", u(1), "painScore")] }]),
        broken,
        scope,
      ),
    ).rejects.toThrow(/different number/);
  });
});
