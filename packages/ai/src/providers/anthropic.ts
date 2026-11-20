import { PRICE_NOT_CONFIGURED_LABEL, costMicroUsd, type Pricing } from "../cost.js";
import { AIError } from "../errors.js";
import type { LLMProvider, ProviderCall, ProviderResult } from "./types.js";

/**
 * Optional external provider over the Anthropic Messages API, using `fetch` (no SDK dependency).
 * Enabled only when `CAREPATH_ANTHROPIC_API_KEY` and `CAREPATH_ANTHROPIC_MODEL` are set. It accepts
 * only `destination: "external"` calls, whose user text is `RedactedText`; it never sees the input
 * object. Tests inject `fetch`; no test calls the network. A live run is stretch (checkpoint C2)
 * and has not been performed in this work package.
 */
export interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxOutputTokens?: number;
  pricing?: Pricing | null;
  fetch?: typeof fetch;
}

export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic";
  readonly label: string;
  readonly model: string;
  readonly external = true;
  private readonly cfg: Required<Omit<AnthropicProviderConfig, "pricing">> & {
    pricing: Pricing | null;
  };

  constructor(cfg: AnthropicProviderConfig) {
    if (!cfg.apiKey || !cfg.model)
      throw new AIError("not_configured", "Anthropic provider needs an API key and a model.");
    this.model = cfg.model;
    this.label = `Anthropic ${cfg.model}`;
    this.cfg = {
      apiKey: cfg.apiKey,
      model: cfg.model,
      baseUrl: cfg.baseUrl ?? "https://api.anthropic.com",
      maxOutputTokens: cfg.maxOutputTokens ?? 4096,
      pricing: cfg.pricing ?? null,
      fetch: cfg.fetch ?? globalThis.fetch,
    };
  }

  async generate(call: ProviderCall): Promise<ProviderResult> {
    if (call.destination !== "external") {
      throw new AIError("not_configured", "External providers accept only redacted prompts.");
    }
    let res: Response;
    try {
      res = await this.cfg.fetch(`${this.cfg.baseUrl}/v1/messages`, {
        method: "POST",
        signal: call.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.cfg.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.cfg.model,
          max_tokens: this.cfg.maxOutputTokens,
          temperature: 0,
          system: call.prompt.system,
          messages: [{ role: "user", content: call.prompt.user }],
        }),
      });
    } catch (err) {
      if (call.signal.aborted) throw err;
      throw new AIError("provider_error", "Network error calling the model provider.", {
        retryable: true,
      });
    }
    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500;
      const ra = Number(res.headers.get("retry-after"));
      throw new AIError("provider_error", `Model provider answered HTTP ${res.status}.`, {
        retryable,
        ...(Number.isFinite(ra) && ra > 0 ? { retryAfterMs: ra * 1000 } : {}),
      });
    }
    const body = (await res.json()) as {
      model?: string;
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (body.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    let output: unknown;
    try {
      output = JSON.parse(text);
    } catch {
      throw new AIError("invalid_output", "The model did not return JSON.");
    }
    const usage =
      typeof body.usage?.input_tokens === "number" && typeof body.usage?.output_tokens === "number"
        ? { inputTokens: body.usage.input_tokens, outputTokens: body.usage.output_tokens }
        : null;
    const pricing = this.cfg.pricing;
    return {
      output,
      usage,
      costMicroUsd: usage && pricing ? costMicroUsd(usage, pricing) : null,
      costLabel: pricing ? `Configured price for ${this.cfg.model}` : PRICE_NOT_CONFIGURED_LABEL,
      model: body.model ?? this.cfg.model,
    };
  }
}

/** Null unless both the key and the model are configured. Prices are optional env values. */
export function anthropicProviderFromEnv(
  env: Record<string, string | undefined> = process.env,
  opts: { fetch?: typeof fetch } = {},
): AnthropicProvider | null {
  const apiKey = env.CAREPATH_ANTHROPIC_API_KEY;
  const model = env.CAREPATH_ANTHROPIC_MODEL;
  if (!apiKey || !model) return null;
  const pin = Number(env.CAREPATH_ANTHROPIC_INPUT_USD_PER_MTOK);
  const pout = Number(env.CAREPATH_ANTHROPIC_OUTPUT_USD_PER_MTOK);
  const pricing =
    Number.isFinite(pin) && Number.isFinite(pout) && pin > 0 && pout > 0
      ? { inputUsdPerMTok: pin, outputUsdPerMTok: pout }
      : null;
  return new AnthropicProvider({
    apiKey,
    model,
    pricing,
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
  });
}
