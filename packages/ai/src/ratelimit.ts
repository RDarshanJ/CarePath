import type { GenerationKind } from "./schemas.js";

/**
 * Rate-limit hook (PRD section 11: AI 10 per minute per user). The API supplies an implementation
 * backed by its own limiter; the pipeline asks once per generation, before any provider call, and
 * never retries a refusal.
 */
export interface RateLimitKey {
  organizationId: string;
  userId: string;
  kind: GenerationKind;
}

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterMs: number };

export interface RateLimitHook {
  consume(key: RateLimitKey): Promise<RateLimitDecision> | RateLimitDecision;
}

export const noRateLimit: RateLimitHook = { consume: () => ({ allowed: true }) };

/** In-process fixed window per user. Enough for tests and a single API process. */
export function createFixedWindowRateLimit(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimitHook {
  const now = opts.now ?? Date.now;
  const windows = new Map<string, { start: number; count: number }>();
  return {
    consume(key) {
      const k = `${key.organizationId}:${key.userId}`;
      const t = now();
      let w = windows.get(k);
      if (!w || t - w.start >= opts.windowMs) {
        w = { start: t, count: 0 };
        windows.set(k, w);
      }
      if (w.count >= opts.limit)
        return { allowed: false, retryAfterMs: w.start + opts.windowMs - t };
      w.count += 1;
      return { allowed: true };
    },
  };
}
