/**
 * Token and cost record per provider call. Prices are configuration, not constants in code: a
 * price table copied from memory would go stale silently. Without a configured price the cost is
 * recorded as null and labelled, never guessed.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface Pricing {
  /** US dollars per million input tokens. */
  inputUsdPerMTok: number;
  /** US dollars per million output tokens. */
  outputUsdPerMTok: number;
}

/** Dollars per million tokens times tokens is exactly micro-dollars. */
export function costMicroUsd(usage: TokenUsage, pricing: Pricing): number {
  return Math.round(
    usage.inputTokens * pricing.inputUsdPerMTok + usage.outputTokens * pricing.outputUsdPerMTok,
  );
}

export const ZERO_COST_LABEL = "No model call: demo provider, rule-based, zero cost";
export const PRICE_NOT_CONFIGURED_LABEL = "Price not configured; cost not computed";
