import { describe, expect, it, vi } from "vitest";
import { AIError } from "../src/errors.js";
import { NoteDraftInput, ProgressSummaryInput } from "../src/inputs.js";
import { DETERMINISTIC_PROVIDER_LABEL } from "../src/labels.js";
import { generate } from "../src/pipeline.js";
import { DeterministicProvider, draftSoapNote } from "../src/providers/deterministic.js";
import { createFixedWindowRateLimit } from "../src/ratelimit.js";
import { sourceRecords } from "../src/sources.js";
import { createInMemoryResolver } from "../src/verifier.js";
import { ScriptedProvider, permanent, transient } from "./fakes.js";
import {
  OTHER_ORG,
  consentActive,
  fixtureCase,
  noteInputFromCase,
  progressInput,
  requester,
  u,
} from "./helpers.js";

const noteCase = fixtureCase("case-90");
const noteInput = noteInputFromCase(noteCase);
const noteRequester = {
  organizationId: noteCase.encounter.organizationId,
  userId: requester.userId,
};
const validNote = draftSoapNote(NoteDraftInput.parse(noteInput));
const noSleep = vi.fn(async () => {});

describe("pipeline: refusals happen before any provider call", () => {
  it.each(["inactive", "none", "rejected"] as const)(
    "consent %s is refused with a reason",
    async (state) => {
      const provider = new ScriptedProvider([{ kind: "ok", output: validNote }]);
      const err = await generate({
        kind: "note_draft",
        input: noteInput,
        provider,
        consent: { aiAssistedFeatures: state },
        requester: noteRequester,
      }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AIError);
      expect((err as AIError).code).toBe("consent_required");
      expect((err as AIError).message).toMatch(/Sharing and consent/);
      expect(provider.calls).toHaveLength(0);
    },
  );

  it("invalid input and an input scoped to another organization are refused", async () => {
    const provider = new ScriptedProvider([{ kind: "ok", output: validNote }]);
    const base = {
      kind: "note_draft" as const,
      provider,
      consent: consentActive,
      requester: noteRequester,
    };
    await expect(
      generate({ ...base, input: { ...noteInput, transcript: [] } }),
    ).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(
      generate({
        ...base,
        requester: { organizationId: OTHER_ORG, userId: requester.userId },
        input: noteInput,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(provider.calls).toHaveLength(0);
  });

  it("the rate-limit hook refuses with retryAfterMs and is not retried", async () => {
    let t = 1_000;
    const rateLimit = createFixedWindowRateLimit({ limit: 2, windowMs: 60_000, now: () => t });
    const provider = new DeterministicProvider();
    const run = () =>
      generate({
        kind: "note_draft",
        input: noteInput,
        provider,
        consent: consentActive,
        requester: noteRequester,
        rateLimit,
      });
    await run();
    await run();
    const err = (await run().catch((e: unknown) => e)) as AIError;
    expect(err.code).toBe("rate_limited");
    expect(err.retryAfterMs).toBe(60_000);
    t += 60_000;
    await expect(run()).resolves.toMatchObject({ status: "succeeded" });
  });
});

describe("pipeline: timeout and bounded retry with backoff", () => {
  it("a hung attempt times out, is aborted, and the retry succeeds", async () => {
    const provider = new ScriptedProvider([{ kind: "hang" }, { kind: "ok", output: validNote }]);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      timeoutMs: 30,
      sleep: noSleep,
    });
    expect(rec.status).toBe("succeeded");
    expect(rec.calls.map((c) => c.outcome)).toEqual(["timeout", "succeeded"]);
    expect(provider.aborted).toBe(1);
    expect(rec.calls[0]!.latencyMs).toBeGreaterThanOrEqual(25);
  });

  it("gives up after two retries with a recoverable failed record and no output (AC-F7, AC-F2)", async () => {
    const sleep = vi.fn(async () => {});
    const provider = new ScriptedProvider([{ kind: "hang" }]);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      timeoutMs: 20,
      backoffMs: 100,
      sleep,
    });
    expect(rec.status).toBe("failed");
    expect(rec.output).toBeNull();
    expect(rec.error?.code).toBe("timeout");
    expect(provider.calls).toHaveLength(3);
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([100, 200]);
    expect(rec.calls.map((c) => c.backoffMs)).toEqual([100, 200, null]);
  });

  it("a provider that never answers and ignores abort still cannot hold the pipeline past its timeout", async () => {
    const stubborn = {
      id: "stubborn",
      label: "Stubborn",
      model: null,
      external: false,
      generate: () => new Promise<never>(() => {}),
    };
    const t0 = Date.now();
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider: stubborn,
      consent: consentActive,
      requester: noteRequester,
      timeoutMs: 15,
      maxRetries: 1,
      sleep: noSleep,
    });
    expect(rec.status).toBe("failed");
    expect(rec.calls).toHaveLength(2);
    expect(Date.now() - t0).toBeLessThan(1_000);
  });

  it("schema-invalid output is retried, then fails without storing a partial draft", async () => {
    const provider = new ScriptedProvider([{ kind: "ok", output: { subjective: "free text" } }]);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
    });
    expect(rec.status).toBe("failed");
    expect(rec.error?.code).toBe("invalid_output");
    expect(rec.output).toBeNull();
    expect(rec.calls).toHaveLength(3);
  });

  it("repeated statement ids count as invalid output", async () => {
    const dup = structuredClone(validNote);
    dup.plan[0]!.id = dup.subjective[0]!.id;
    const provider = new ScriptedProvider([
      { kind: "ok", output: dup },
      { kind: "ok", output: validNote },
    ]);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
    });
    expect(rec.calls.map((c) => c.outcome)).toEqual(["invalid_output", "succeeded"]);
  });

  it("transient provider errors are retried; permanent ones are not", async () => {
    const flaky = new ScriptedProvider([
      { kind: "throw", error: transient() },
      { kind: "ok", output: validNote },
    ]);
    const ok = await generate({
      kind: "note_draft",
      input: noteInput,
      provider: flaky,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
    });
    expect(ok.status).toBe("succeeded");
    expect(ok.calls).toHaveLength(2);

    const broken = new ScriptedProvider([{ kind: "throw", error: permanent() }]);
    const failed = await generate({
      kind: "note_draft",
      input: noteInput,
      provider: broken,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
    });
    expect(failed.status).toBe("failed");
    expect(broken.calls).toHaveLength(1);
  });

  it("honours a provider Retry-After, capped by maxBackoffMs", async () => {
    const sleep = vi.fn(async () => {});
    const provider = new ScriptedProvider([
      {
        kind: "throw",
        error: new AIError("provider_error", "429", { retryable: true, retryAfterMs: 3_000 }),
      },
      {
        kind: "throw",
        error: new AIError("provider_error", "429", { retryable: true, retryAfterMs: 60_000 }),
      },
      { kind: "ok", output: validNote },
    ]);
    await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      sleep,
      maxBackoffMs: 5_000,
    });
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([3_000, 5_000]);
  });

  it("maxRetries is bounded at 5 even when asked for more", async () => {
    const provider = new ScriptedProvider([{ kind: "throw", error: transient() }]);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
      maxRetries: 50,
    });
    expect(rec.calls).toHaveLength(6);
  });
});

describe("pipeline: generation record", () => {
  it("deterministic provider: labelled, zero cost, prompt version, input refs, verification", async () => {
    const input = ProgressSummaryInput.parse(progressInput());
    const rec = await generate({
      kind: "progress_summary",
      input,
      provider: new DeterministicProvider(),
      consent: consentActive,
      requester,
      resolver: createInMemoryResolver(sourceRecords("progress_summary", input)),
    });
    expect(rec).toMatchObject({
      status: "succeeded",
      provider: "deterministic",
      providerLabel: DETERMINISTIC_PROVIDER_LABEL,
      model: null,
      promptKey: "progress_summary",
      promptVersion: "1.1.0",
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
      costLabel: "No model call: demo provider, rule-based, zero cost",
      redaction: { applied: false, tokenCount: 0 },
      unsupportedStatementCount: 0,
    });
    expect(rec.inputRefs).toContainEqual({
      type: "check_in",
      id: input.checkIns[0]!.id,
      field: "painScore",
    });
    expect(rec.verification?.unsupportedRate).toBe(0);
  });

  it("tokens and cost are summed over every attempt that reported them", async () => {
    const provider = new ScriptedProvider([
      {
        kind: "ok",
        output: { bad: true },
        usage: { inputTokens: 1000, outputTokens: 50 },
        costMicroUsd: 1200,
      },
      {
        kind: "ok",
        output: validNote,
        usage: { inputTokens: 1000, outputTokens: 400 },
        costMicroUsd: 3000,
      },
    ]);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
    });
    expect(rec.calls.map((c) => [c.inputTokens, c.outputTokens, c.costMicroUsd])).toEqual([
      [1000, 50, 1200],
      [1000, 400, 3000],
    ]);
    expect([rec.inputTokens, rec.outputTokens, rec.costMicroUsd]).toEqual([2000, 450, 4200]);
  });

  it("unknown prompt version is an error, a known one is recorded", async () => {
    const base = {
      kind: "note_draft" as const,
      input: noteInput,
      provider: new DeterministicProvider(),
      consent: consentActive,
      requester: noteRequester,
    };
    await expect(generate({ ...base, promptVersion: "9.9.9" })).rejects.toThrow(/unknown prompt/);
    await expect(generate({ ...base, promptVersion: "1.0.0" })).resolves.toMatchObject({
      promptVersion: "1.0.0",
    });
  });
});

describe("pipeline: progress summary of a window with no sessions, check-ins or plan (C3 A1)", () => {
  const run = (input: ProgressSummaryInput) =>
    generate({
      kind: "progress_summary",
      input,
      provider: new DeterministicProvider(),
      consent: consentActive,
      requester,
      resolver: createInMemoryResolver(
        sourceRecords("progress_summary", ProgressSummaryInput.parse(input)),
      ),
      sleep: noSleep,
    });
  const empty = progressInput({
    carePlan: null,
    sessions: [],
    checkIns: [],
    messages: [],
    appointments: [],
  });

  it("an empty window succeeds with no summary statements and lists every gap", async () => {
    const rec = await run(empty);
    expect(rec.status).toBe("succeeded");
    expect(rec.promptVersion).toBe("1.1.0");
    expect(rec.calls).toHaveLength(1);
    expect(rec.output!.summary).toEqual([]);
    expect(rec.output!.missingInformation.map((m) => m.item)).toEqual([
      "no_check_ins_in_window",
      "no_sessions_in_window",
      "no_current_care_plan",
      "no_upcoming_appointment",
      "no_patient_messages_in_window",
    ]);
    expect(rec.verification?.statementCount).toBe(0);
  });

  it("a window with one patient message only succeeds with no summary statements", async () => {
    const rec = await run({
      ...empty,
      messages: [
        {
          id: u(30),
          senderRole: "patient",
          body: "Can we move my next visit?",
          createdAt: "2026-11-08T12:00:00.000Z",
        },
      ],
    });
    expect(rec.status).toBe("succeeded");
    expect(rec.output!.summary).toEqual([]);
    const items = rec.output!.missingInformation.map((m) => m.item);
    expect(items).toEqual([
      "no_check_ins_in_window",
      "no_sessions_in_window",
      "no_current_care_plan",
      "no_upcoming_appointment",
    ]);
    expect(rec.unsupportedStatementCount).toBe(0);
  });
});

describe("pipeline: evidence is limited to the records the prompt was built from (C3 A2)", () => {
  it("a statement citing an in-scope record the provider was not given is unsupported, not_in_input", async () => {
    const input = ProgressSummaryInput.parse(progressInput());
    const outside = {
      type: "check_in" as const,
      id: u(99),
      organizationId: input.scope.organizationId,
      patientId: input.scope.patientId,
      fields: { painScore: 8 },
    };
    const given = input.checkIns[0]!;
    const provider = new ScriptedProvider([
      {
        kind: "ok",
        output: {
          summary: [
            {
              id: "s1",
              text: "Pain 3/10 on the first check-in.",
              sourceRefs: [{ type: "check_in", id: given.id, field: "painScore" }],
            },
            {
              id: "s2",
              text: "Pain 8/10 three weeks ago.",
              sourceRefs: [{ type: "check_in", id: outside.id, field: "painScore" }],
            },
          ],
          reportedChanges: [],
          engagementObservations: [],
          missingInformation: [],
          itemsForReview: [],
          notices: [],
        },
      },
    ]);
    const rec = await generate({
      kind: "progress_summary",
      input,
      provider,
      consent: consentActive,
      requester,
      // The resolver knows the outside record: it exists, for this patient, in this organization.
      resolver: createInMemoryResolver([...sourceRecords("progress_summary", input), outside]),
    });
    expect(rec.status).toBe("succeeded");
    const [s1, s2] = rec.verification!.statements;
    expect([s1!.status, s1!.reason, s1!.refs[0]!.inInput]).toEqual(["supported", null, true]);
    expect([s2!.status, s2!.reason]).toEqual(["unsupported", "not_in_input"]);
    expect(s2!.refs[0]).toMatchObject({ status: "resolved", inInput: false });
    expect(rec.unsupportedStatementCount).toBe(1);
  });
});

describe("pipeline: a redaction token left after restore is invalid output (C3 A3)", () => {
  it("an invented token fails every attempt and nothing is stored", async () => {
    const out = draftSoapNote(NoteDraftInput.parse(noteInput));
    const first = out.subjective[0]!;
    const invented = {
      ...out,
      subjective: [{ ...first, text: `${first.text} Reported by [[NAME_9]].` }],
    };
    const provider = new ScriptedProvider([{ kind: "ok", output: invented }], true);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
    });
    expect(rec.status).toBe("failed");
    expect(rec.output).toBeNull();
    expect(rec.error).toEqual({
      code: "invalid_output",
      message: "Output contains 1 redaction token(s) that match no redacted value.",
    });
    expect(rec.calls.map((c) => c.outcome)).toEqual([
      "invalid_output",
      "invalid_output",
      "invalid_output",
    ]);
  });

  it("a token the redactor issued is restored and the output is accepted", async () => {
    const first = validNote.subjective[0]!;
    const withToken = {
      ...validNote,
      subjective: [{ ...first, text: `${first.text} Reference [[ID_1]].` }],
    };
    const provider = new ScriptedProvider([{ kind: "ok", output: withToken }], true);
    const rec = await generate({
      kind: "note_draft",
      input: noteInput,
      provider,
      consent: consentActive,
      requester: noteRequester,
      sleep: noSleep,
    });
    expect(rec.status).toBe("succeeded");
    expect(rec.redaction.counts.ID).toBe(1);
    expect(rec.output!.subjective[0]!.text).not.toContain("[[");
  });
});
