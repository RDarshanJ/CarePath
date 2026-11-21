import { describe, expect, it } from "vitest";
import { costMicroUsd } from "../src/cost.js";
import type { AIError } from "../src/errors.js";
import { generate } from "../src/pipeline.js";
import { AnthropicProvider, anthropicProviderFromEnv } from "../src/providers/anthropic.js";
import type { ProviderCall } from "../src/providers/types.js";
import type { RedactedText } from "../src/redaction.js";
import { consentActive, fixtureCase, noteInputFromCase, requester } from "./helpers.js";

const call = (signal = new AbortController().signal): ProviderCall => ({
  destination: "external",
  kind: "note_draft",
  prompt: { key: "note_draft", version: "1.0.0", system: "sys", user: "data" as RedactedText },
  signal,
});

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  (async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers,
    })) as unknown as typeof fetch;

const okBody = (text: string, usage = { input_tokens: 2000, output_tokens: 500 }) => ({
  model: "answered-model",
  content: [{ type: "text", text }],
  usage,
});

describe("Anthropic provider (fetch injected; no network)", () => {
  it("is off unless both key and model are configured", () => {
    expect(anthropicProviderFromEnv({})).toBeNull();
    expect(anthropicProviderFromEnv({ CAREPATH_ANTHROPIC_API_KEY: "k" })).toBeNull();
    const p = anthropicProviderFromEnv({
      CAREPATH_ANTHROPIC_API_KEY: "k",
      CAREPATH_ANTHROPIC_MODEL: "m",
    });
    expect(p).toMatchObject({ id: "anthropic", label: "Anthropic m", model: "m", external: true });
  });

  it("sends the Messages API shape and parses JSON, including a fenced block", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fetchFn = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify(okBody('```json\n{"a":1}\n```')), { status: 200 });
    }) as unknown as typeof fetch;
    const res = await new AnthropicProvider({ apiKey: "key", model: "m", fetch: fetchFn }).generate(
      call(),
    );
    expect(res.output).toEqual({ a: 1 });
    expect(res.model).toBe("answered-model");
    expect(res.usage).toEqual({ inputTokens: 2000, outputTokens: 500 });
    expect(seen!.url).toBe("https://api.anthropic.com/v1/messages");
    const headers = seen!.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("key");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(JSON.parse(String(seen!.init.body))).toMatchObject({
      model: "m",
      system: "sys",
      messages: [{ role: "user", content: "data" }],
    });
  });

  it("refuses a local call carrying raw input", async () => {
    const p = new AnthropicProvider({ apiKey: "k", model: "m", fetch: reply(200, okBody("{}")) });
    const local = { ...call(), destination: "local" } as unknown as ProviderCall;
    await expect(p.generate(local)).rejects.toMatchObject({ code: "not_configured" });
  });

  it("classifies failures: 429 and 5xx retryable with Retry-After, 400 not, non-JSON is invalid output", async () => {
    const e429 = (await new AnthropicProvider({
      apiKey: "k",
      model: "m",
      fetch: reply(429, "{}", { "retry-after": "2" }),
    })
      .generate(call())
      .catch((e: unknown) => e)) as AIError;
    expect([e429.code, e429.retryable, e429.retryAfterMs]).toEqual(["provider_error", true, 2000]);
    const e529 = (await new AnthropicProvider({ apiKey: "k", model: "m", fetch: reply(529, "{}") })
      .generate(call())
      .catch((e: unknown) => e)) as AIError;
    expect(e529.retryable).toBe(true);
    const e400 = (await new AnthropicProvider({ apiKey: "k", model: "m", fetch: reply(400, "{}") })
      .generate(call())
      .catch((e: unknown) => e)) as AIError;
    expect(e400.retryable).toBe(false);
    const bad = (await new AnthropicProvider({
      apiKey: "k",
      model: "m",
      fetch: reply(200, okBody("Sure! Here is the note.")),
    })
      .generate(call())
      .catch((e: unknown) => e)) as AIError;
    expect(bad.code).toBe("invalid_output");
  });

  it("cost: configured price gives micro-dollars; no price gives null and says so", async () => {
    expect(
      costMicroUsd(
        { inputTokens: 2000, outputTokens: 500 },
        { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
      ),
    ).toBe(13_500);
    const priced = await new AnthropicProvider({
      apiKey: "k",
      model: "m",
      pricing: { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
      fetch: reply(200, okBody("{}")),
    }).generate(call());
    expect(priced.costMicroUsd).toBe(13_500);
    const unpriced = await new AnthropicProvider({
      apiKey: "k",
      model: "m",
      fetch: reply(200, okBody("{}")),
    }).generate(call());
    expect(unpriced.costMicroUsd).toBeNull();
    expect(unpriced.costLabel).toBe("Price not configured; cost not computed");
  });

  it("through the pipeline: a timed-out fetch is aborted and retried, and the record names the model", async () => {
    const c = fixtureCase("case-90");
    let calls = 0;
    const fetchFn = ((_: string, init: RequestInit) => {
      calls += 1;
      if (calls === 1) {
        return new Promise((_, reject) =>
          init.signal!.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        );
      }
      const out = {
        subjective: [],
        objective: [],
        assessment: [],
        plan: [],
        missingInformation: [],
        notices: [],
      };
      return Promise.resolve(
        new Response(JSON.stringify(okBody(JSON.stringify(out))), { status: 200 }),
      );
    }) as unknown as typeof fetch;
    const rec = await generate({
      kind: "note_draft",
      input: noteInputFromCase(c),
      provider: new AnthropicProvider({ apiKey: "k", model: "m", fetch: fetchFn }),
      consent: consentActive,
      requester: { organizationId: c.encounter.organizationId, userId: requester.userId },
      timeoutMs: 20,
      sleep: async () => {},
    });
    expect(rec.calls.map((x) => x.outcome)).toEqual(["timeout", "succeeded"]);
    expect(rec).toMatchObject({
      status: "succeeded",
      provider: "anthropic",
      providerLabel: "Anthropic m",
      model: "answered-model",
      inputTokens: 2000,
      outputTokens: 500,
      costMicroUsd: null,
    });
  });

  it("a reply cut at max_tokens is invalid output naming truncation, and is not retried (C3 A4)", async () => {
    const truncated = {
      ...okBody('{"subjective": [{"id": "s1", "text": "Knee'),
      stop_reason: "max_tokens",
    };
    const direct = (await new AnthropicProvider({
      apiKey: "k",
      model: "m",
      maxOutputTokens: 512,
      fetch: reply(200, truncated),
    })
      .generate(call())
      .catch((e: unknown) => e)) as AIError;
    expect([direct.code, direct.retryable]).toEqual(["invalid_output", false]);
    expect(direct.message).toMatch(/truncated at the output limit of 512 tokens/);

    const c = fixtureCase("case-90");
    let calls = 0;
    const fetchFn = (async () => {
      calls += 1;
      return new Response(JSON.stringify(truncated), { status: 200 });
    }) as unknown as typeof fetch;
    const rec = await generate({
      kind: "note_draft",
      input: noteInputFromCase(c),
      provider: new AnthropicProvider({
        apiKey: "k",
        model: "m",
        pricing: { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
        fetch: fetchFn,
      }),
      consent: consentActive,
      requester: { organizationId: c.encounter.organizationId, userId: requester.userId },
      sleep: async () => {},
    });
    expect(calls).toBe(1);
    expect(rec.status).toBe("failed");
    expect(rec.output).toBeNull();
    expect(rec.error?.code).toBe("invalid_output");
    expect(rec.error?.message).toMatch(/truncated/);
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0]).toMatchObject({
      outcome: "invalid_output",
      inputTokens: 2000,
      outputTokens: 500,
      costMicroUsd: 13_500,
      backoffMs: null,
    });
    // The truncated attempt was paid for, so the totals include it.
    expect([rec.inputTokens, rec.outputTokens, rec.costMicroUsd]).toEqual([2000, 500, 13_500]);
    expect(rec.model).toBe("answered-model");
  });

  it("a reply that is not JSON is still retried, and each attempt's tokens are counted", async () => {
    const c = fixtureCase("case-90");
    let calls = 0;
    const fetchFn = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ ...okBody("Sure."), stop_reason: "end_turn" }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const rec = await generate({
      kind: "note_draft",
      input: noteInputFromCase(c),
      provider: new AnthropicProvider({ apiKey: "k", model: "m", fetch: fetchFn }),
      consent: consentActive,
      requester: { organizationId: c.encounter.organizationId, userId: requester.userId },
      sleep: async () => {},
    });
    expect(calls).toBe(3);
    expect(rec.calls.map((x) => x.outcome)).toEqual([
      "invalid_output",
      "invalid_output",
      "invalid_output",
    ]);
    expect([rec.inputTokens, rec.outputTokens]).toEqual([6000, 1500]);
  });
});
