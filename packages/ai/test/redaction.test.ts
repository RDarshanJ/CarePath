import { describe, expect, it } from "vitest";
import { ProgressSummaryInput } from "../src/inputs.js";
import { generate } from "../src/pipeline.js";
import { AnthropicProvider } from "../src/providers/anthropic.js";
import { DeterministicProvider } from "../src/providers/deterministic.js";
import { createRedactor, findIdentifierLeaks } from "../src/redaction.js";
import {
  consentActive,
  fixtureCase,
  noteInputFromCase,
  progressInput,
  requester,
  u,
} from "./helpers.js";

describe("redactor", () => {
  const r = () =>
    createRedactor({
      names: ["Marta Quill"],
      birthDates: ["1979-06-02"],
      emails: ["marta.quill@example.test"],
      phones: ["555-0142"],
      addresses: ["22 Orchard Way"],
      otherIdentifiers: ["MRN-118204"],
    });

  it("replaces known identifiers, including each part of a name", () => {
    const red = r();
    const out = red.redact(
      "Hi Marta. Marta Quill, born 1979-06-02, lives at 22 Orchard Way, phone 555-0142, email marta.quill@example.test, chart MRN-118204.",
    );
    for (const s of ["Marta", "Quill", "1979", "Orchard", "555-0142", "example.test", "118204"])
      expect(out).not.toContain(s);
    expect(out).toContain("[[NAME_");
    expect(out).toContain("[[EMAIL_1]]");
  });

  it("catches unknown identifiers by pattern", () => {
    const out = createRedactor().redact(
      "Call (602) 555-0187 or +1 480 555 0123, write to j.doe@mail.example, SSN 123-45-6789, MRN: A99812, seen 03/14/2026 and March 3, 2026, Mr. Okafor at 1400 Desert Bloom Drive, id 3f2a9c1e-1d2b-4c3d-8e4f-5a6b7c8d9e0f.",
    );
    for (const s of [
      "602",
      "0123",
      "j.doe",
      "6789",
      "A99812",
      "03/14/2026",
      "March 3",
      "Okafor",
      "Desert Bloom",
      "3f2a9c1e",
    ]) {
      expect(out).not.toContain(s);
    }
  });

  it("leaves clinical numbers alone", () => {
    const text = "Pain 4/10, flexion 95 degrees, strength 4/5, three sets of 10 reps, 30 seconds.";
    expect(createRedactor().redact(text)).toBe(text);
  });

  it("uses one stable token per original and restores outputs deeply", () => {
    const red = r();
    const a = red.redact("Marta said hi. MARTA said bye.");
    expect(a).toBe("[[NAME_1]] said hi. [[NAME_1]] said bye.");
    expect(red.restore({ x: [a], n: 1, nested: { t: "[[EMAIL_9]] unknown token stays" } })).toEqual(
      {
        x: ["Marta said hi. Marta said bye."],
        n: 1,
        nested: { t: "[[EMAIL_9]] unknown token stays" },
      },
    );
  });

  it("does not re-redact inside existing tokens", () => {
    const red = createRedactor({ names: ["Ann"] });
    const once = red.redact("Ann 2026-01-02");
    expect(red.redact(once)).toBe(once);
  });

  it("findIdentifierLeaks reports what survived", () => {
    expect(findIdentifierLeaks("hello Marta Quill", { names: ["Marta Quill"] })).toEqual([
      "Marta Quill",
    ]);
    expect(findIdentifierLeaks("hello [[NAME_1]]", { names: ["Marta Quill"] })).toEqual([]);
  });
});

describe("canary: no unredacted identifier leaves the process", () => {
  function capturingFetch(reply: (sent: { system: string; user: string }) => unknown) {
    const bodies: string[] = [];
    const fetchFn = (async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      const sent = JSON.parse(String(init.body)) as {
        system: string;
        messages: { content: string }[];
      };
      return new Response(
        JSON.stringify({
          model: "test-model",
          content: [
            {
              type: "text",
              text: JSON.stringify(reply({ system: sent.system, user: sent.messages[0]!.content })),
            },
          ],
          usage: { input_tokens: 1200, output_tokens: 300 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;
    return { fetchFn, bodies };
  }

  it("progress summary: payload carries tokens, not names, contacts, dates or record ids; output is restored", async () => {
    const input = ProgressSummaryInput.parse(progressInput());
    let sentUser = "";
    const { fetchFn, bodies } = capturingFetch(({ user }) => {
      sentUser = user;
      // Answer like a model that cites the tokenised check-in id it was shown.
      const tokenId = /<source_record type="check_in" id="([^"]+)" field="painScore">6</.exec(
        user,
      )![1];
      return {
        summary: [
          {
            id: "s1",
            text: "Pain 6/10 reported by [[NAME_1]].",
            sourceRefs: [{ type: "check_in", id: tokenId, field: "painScore" }],
          },
        ],
        reportedChanges: [],
        engagementObservations: [],
        missingInformation: [],
        itemsForReview: [],
        notices: [],
      };
    });
    const provider = new AnthropicProvider({
      apiKey: "test-key",
      model: "test-model",
      fetch: fetchFn,
    });
    const rec = await generate({
      kind: "progress_summary",
      input,
      provider,
      consent: consentActive,
      requester,
    });

    expect(bodies).toHaveLength(1);
    const body = bodies[0]!;
    const canaries = [
      "Dana",
      "Whitlock",
      "555-0199",
      "1984-03-09",
      "dana.whitlock@example.test",
      "Juniper",
      "MRN-448210",
      "2026-11-",
      u(22),
      input.scope.patientId,
    ];
    for (const c of canaries) expect(body).not.toContain(c);
    expect(body).not.toContain("test-key");
    expect(sentUser).toContain("[[ID_");
    expect(sentUser).toContain("[[DATE_");

    expect(rec.status).toBe("succeeded");
    expect(rec.redaction.applied).toBe(true);
    expect(rec.redaction.tokenCount).toBeGreaterThan(10);
    expect(rec.output!.summary[0]!.sourceRefs[0]!.id).toBe(u(22));
    expect(rec.output!.summary[0]!.text).toBe("Pain 6/10 reported by Dana Whitlock.");
  });

  it("note draft: transcript names, phone and email are tokenised before sending", async () => {
    const c = fixtureCase("case-91");
    const input = noteInputFromCase(c, {
      names: ["Marta Quill"],
      emails: [],
      phones: [],
      birthDates: [],
      addresses: [],
      otherIdentifiers: [],
    });
    const { fetchFn, bodies } = capturingFetch(() => ({
      subjective: [],
      objective: [],
      assessment: [],
      plan: [],
      missingInformation: [],
      notices: [],
    }));
    const provider = new AnthropicProvider({ apiKey: "k", model: "m", fetch: fetchFn });
    await generate({
      kind: "note_draft",
      input,
      provider,
      consent: consentActive,
      requester: { organizationId: c.encounter.organizationId, userId: requester.userId },
    });
    for (const s of ["Marta", "555-0142", "marta.quill@example.test", c.encounter.id])
      expect(bodies[0]).not.toContain(s);
  });

  it("the deterministic provider is local: no redaction, nothing sent", async () => {
    const rec = await generate({
      kind: "progress_summary",
      input: progressInput(),
      provider: new DeterministicProvider(),
      consent: consentActive,
      requester,
    });
    expect(rec.redaction).toEqual({ applied: false, tokenCount: 0, counts: {} });
  });
});
