import type { NoteDraftInputParsed, ProgressSummaryInputParsed } from "../inputs.js";
import type { RedactedText } from "../redaction.js";
import type { GenerationKind } from "../schemas.js";
import type { TokenUsage } from "../cost.js";

/**
 * Provider abstraction (ADR-5). A provider turns one prompt into one raw output. Everything else
 * (consent, rate limit, redaction, timeout, retry, schema validation, cost record, evidence check)
 * is the pipeline's job, so every provider gets the same treatment.
 *
 * Local providers receive the parsed input. External providers receive only redacted prompt text:
 * the pipeline never passes them the input object, and `RedactedText` can only come from a redactor.
 */
export type ProviderCall =
  | {
      destination: "local";
      kind: GenerationKind;
      input: ProgressSummaryInputParsed | NoteDraftInputParsed;
      prompt: { key: GenerationKind; version: string; system: string; user: string };
      signal: AbortSignal;
    }
  | {
      destination: "external";
      kind: GenerationKind;
      prompt: { key: GenerationKind; version: string; system: string; user: RedactedText };
      signal: AbortSignal;
    };

export interface ProviderResult {
  /** Parsed JSON (or an object built directly). Validated by the pipeline, never trusted. */
  output: unknown;
  /** Null when the provider did not report usage. */
  usage: TokenUsage | null;
  /** Integer micro-dollars; null when no price is configured. */
  costMicroUsd: number | null;
  costLabel: string;
  /** The model that answered, as reported by the provider. */
  model: string | null;
}

export interface LLMProvider {
  /** Stored on `AIGeneration.provider`: `deterministic` or `anthropic`. */
  readonly id: string;
  /** Stored on `AIGeneration.providerLabel` and shown on every generated block. */
  readonly label: string;
  /** Stored on `AIGeneration.model`; null for the deterministic provider. */
  readonly model: string | null;
  /** True when calls leave the process. The pipeline redacts before every external call. */
  readonly external: boolean;
  generate(call: ProviderCall): Promise<ProviderResult>;
}
