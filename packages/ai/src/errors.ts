export type AIErrorCode =
  /** No active `ai_assisted_features` consent. Not retried; the API audits `ai.refused`. */
  | "consent_required"
  /** The rate-limit hook refused the call. Not retried; carries `retryAfterMs`. */
  | "rate_limited"
  /** The input failed its schema. Not retried. */
  | "invalid_input"
  /** One attempt exceeded the timeout. Retried. */
  | "timeout"
  /** The provider failed (network, HTTP 429 or 5xx). Retried when `retryable`. */
  | "provider_error"
  /** The output was not JSON, failed the schema, or repeated statement ids. Retried. */
  | "invalid_output"
  /** An identifier survived redaction before an external call. Not retried; nothing was sent. */
  | "redaction_failed"
  /** The provider cannot run (no key, no model, or an external provider given raw input). */
  | "not_configured";

/**
 * Usage a provider reported for an attempt that still failed (a reply that was not JSON, or was cut
 * at the output limit). The pipeline adds it to the attempt's record, because those tokens were paid.
 */
export interface FailedAttemptUsage {
  usage: { inputTokens: number; outputTokens: number } | null;
  costMicroUsd: number | null;
  costLabel: string;
  model: string | null;
}

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;
  readonly attemptUsage: FailedAttemptUsage | null;

  constructor(
    code: AIErrorCode,
    message: string,
    opts: { retryable?: boolean; retryAfterMs?: number; attemptUsage?: FailedAttemptUsage } = {},
  ) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.retryable = opts.retryable ?? (code === "timeout" || code === "invalid_output");
    this.retryAfterMs = opts.retryAfterMs ?? null;
    this.attemptUsage = opts.attemptUsage ?? null;
  }
}

export const isAIError = (e: unknown): e is AIError => e instanceof AIError;
