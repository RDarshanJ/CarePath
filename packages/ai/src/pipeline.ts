import { AIError, isAIError, type AIErrorCode } from "./errors.js";
import {
  INPUT_SCHEMAS,
  type InputFor,
  type NoteDraftInputParsed,
  type ProgressSummaryInputParsed,
} from "./inputs.js";
import { getPrompt, type RenderedPrompt } from "./prompts/registry.js";
import type { LLMProvider, ProviderCall, ProviderResult } from "./providers/types.js";
import { noRateLimit, type RateLimitHook } from "./ratelimit.js";
import { createRedactor, findIdentifierLeaks, findRedactionTokens } from "./redaction.js";
import {
  OUTPUT_SCHEMAS,
  duplicateStatementIds,
  type GenerationKind,
  type OutputFor,
  type SourceRef,
} from "./schemas.js";
import { sourceRecords } from "./sources.js";
import {
  verifyOutput,
  type AllowListReason,
  type EvidenceResolver,
  type UnsupportedReason,
  type VerificationResult,
} from "./verifier.js";

/**
 * The shared generation pipeline (ADR-5): consent gate, rate-limit hook, input validation, prompt
 * from the registry, redaction for external providers, per-attempt timeout, bounded retry with
 * exponential backoff, schema validation, token and cost record per call, optional evidence check.
 *
 * Refusals (consent, rate limit, invalid input) throw `AIError` before any provider call: the API
 * audits them as `ai.refused` and stores no generation. Provider failures after the last retry
 * return a `failed` record with no output (AC-F2: no partial draft), which the API stores and
 * reports as a recoverable error.
 */

/** Consent state the API reads from the `Consent` table for this patient. */
export interface AiConsentState {
  aiAssistedFeatures: "active" | "inactive" | "rejected" | "entered_in_error" | "none";
}

export interface GenerateOptions<K extends GenerationKind> {
  kind: K;
  /** Validated here against the input schema for `kind`. */
  input: unknown;
  provider: LLMProvider;
  consent: AiConsentState;
  requester: { organizationId: string; userId: string };
  rateLimit?: RateLimitHook;
  /** Defaults to the latest registered version. */
  promptVersion?: string;
  /** Per attempt. PRD section 11 target: 20 seconds. */
  timeoutMs?: number;
  /** Retries after the first attempt. PRD section 11: two. */
  maxRetries?: number;
  /** Backoff before retry n is `backoffMs * 2^(n-1)`, or the provider's Retry-After when longer. */
  backoffMs?: number;
  /** Upper bound for any single wait, so a large Retry-After cannot stall a request. */
  maxBackoffMs?: number;
  /** When given, statements are checked and `unsupportedStatementCount` is filled. */
  resolver?: EvidenceResolver;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface CallRecord {
  attempt: number;
  outcome: "succeeded" | AIErrorCode;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costMicroUsd: number | null;
  costLabel: string | null;
  /** Wait before the next attempt, when there is one. */
  backoffMs: number | null;
}

/** Maps onto `AIGeneration` columns; `calls`, `redaction` and `verification` go in JSON. */
export interface GenerationRecord<K extends GenerationKind> {
  kind: K;
  status: "succeeded" | "failed";
  provider: string;
  providerLabel: string;
  model: string | null;
  promptKey: K;
  promptVersion: string;
  /** Every record the prompt was built from, as refs; stored as the generation's input references. */
  inputRefs: SourceRef[];
  output: OutputFor<K> | null;
  error: { code: AIErrorCode; message: string } | null;
  calls: CallRecord[];
  inputTokens: number | null;
  outputTokens: number | null;
  costMicroUsd: number | null;
  costLabel: string;
  latencyMs: number;
  redaction: { applied: boolean; tokenCount: number; counts: Record<string, number> };
  /** Checked against the generation's own `inputRefs`, so `not_in_input` can appear. */
  verification: VerificationResult<UnsupportedReason | AllowListReason> | null;
  unsupportedStatementCount: number | null;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function generate<K extends GenerationKind>(
  opts: GenerateOptions<K>,
): Promise<GenerationRecord<K>> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? realSleep;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const maxRetries = Math.max(0, Math.min(opts.maxRetries ?? 2, 5));
  const backoffMs = opts.backoffMs ?? 500;
  const maxBackoffMs = opts.maxBackoffMs ?? 10_000;
  const { kind, provider } = opts;

  // 1. Consent gate (advisor plan revision 1). Checked first: no work happens without it.
  if (opts.consent.aiAssistedFeatures !== "active") {
    throw new AIError(
      "consent_required",
      "The patient has not given active consent to AI-assisted features. Ask them to review Sharing and consent.",
    );
  }

  // 2. Input schema.
  const parsedInput = INPUT_SCHEMAS[kind].safeParse(opts.input);
  if (!parsedInput.success) {
    throw new AIError(
      "invalid_input",
      `Generation input failed validation: ${parsedInput.error.issues[0]?.message ?? ""}`,
    );
  }
  const input = parsedInput.data as InputFor<K>;
  if (input.scope.organizationId !== opts.requester.organizationId) {
    throw new AIError("invalid_input", "Input scope is outside the requester's organization.");
  }

  // 3. Rate-limit hook, once per generation.
  const decision = await (opts.rateLimit ?? noRateLimit).consume({
    organizationId: opts.requester.organizationId,
    userId: opts.requester.userId,
    kind,
  });
  if (!decision.allowed) {
    throw new AIError("rate_limited", "Too many AI requests. Try again shortly.", {
      retryAfterMs: decision.retryAfterMs,
    });
  }

  // 4. Prompt.
  const def = getPrompt(kind, opts.promptVersion);
  const rendered: RenderedPrompt = {
    key: kind,
    version: def.version,
    system: def.system,
    user: (def.render as (i: ProgressSummaryInputParsed | NoteDraftInputParsed) => string)(input),
  };
  const records = sourceRecords(kind, input);
  const inputRefs: SourceRef[] = records.flatMap((r) =>
    Object.keys(r.fields).map((field) => ({ type: r.type, id: r.id, field })),
  );

  // 5. Redaction before anything leaves the process.
  const redactor = createRedactor(input.identifiers);
  let makeCall: (signal: AbortSignal) => ProviderCall;
  if (provider.external) {
    const user = redactor.redact(rendered.user);
    const system = redactor.redact(rendered.system);
    const leaks = findIdentifierLeaks(`${system}\n${user}`, input.identifiers);
    if (leaks.length > 0) {
      throw new AIError(
        "redaction_failed",
        `Redaction left ${leaks.length} known identifier(s); nothing was sent.`,
      );
    }
    makeCall = (signal) => ({
      destination: "external",
      kind,
      prompt: { key: kind, version: def.version, system, user },
      signal,
    });
  } else {
    makeCall = (signal) => ({ destination: "local", kind, input, prompt: rendered, signal });
  }

  // 6. Attempts.
  const calls: CallRecord[] = [];
  const started = now();
  let output: OutputFor<K> | null = null;
  let lastError: AIError | null = null;
  let answeredModel: string | null = provider.model;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const t0 = now();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AIError("timeout", `The provider did not answer within ${timeoutMs} ms.`));
      }, timeoutMs);
    });
    let result: ProviderResult | null = null;
    try {
      result = await Promise.race([provider.generate(makeCall(controller.signal)), timeout]);
      answeredModel = result.model ?? answeredModel;
      const restored = provider.external ? redactor.restore(result.output) : result.output;
      if (provider.external) {
        const leftover = findRedactionTokens(restored);
        if (leftover.length) {
          throw new AIError(
            "invalid_output",
            `Output contains ${leftover.length} redaction token(s) that match no redacted value.`,
          );
        }
      }
      const parsed = OUTPUT_SCHEMAS[kind].safeParse(restored);
      if (!parsed.success) {
        throw new AIError(
          "invalid_output",
          `Output failed the ${kind} schema at ${parsed.error.issues[0]?.path.join(".") || "root"}.`,
        );
      }
      const dups = duplicateStatementIds(kind, parsed.data);
      if (dups.length)
        throw new AIError("invalid_output", `Output repeats statement ids: ${dups.join(", ")}.`);
      output = parsed.data as OutputFor<K>;
      lastError = null;
    } catch (err) {
      if (isAIError(err) && err.attemptUsage && !result) {
        result = { output: null, ...err.attemptUsage };
        answeredModel = err.attemptUsage.model ?? answeredModel;
      }
      lastError = isAIError(err)
        ? err
        : new AIError("provider_error", err instanceof Error ? err.message : "Provider failed.", {
            retryable: true,
          });
    } finally {
      clearTimeout(timer);
    }
    const willRetry = lastError !== null && lastError.retryable && attempt <= maxRetries;
    const wait = willRetry
      ? Math.min(
          maxBackoffMs,
          Math.max(backoffMs * 2 ** (attempt - 1), lastError?.retryAfterMs ?? 0),
        )
      : null;
    calls.push({
      attempt,
      outcome: lastError ? lastError.code : "succeeded",
      latencyMs: now() - t0,
      inputTokens: result?.usage?.inputTokens ?? null,
      outputTokens: result?.usage?.outputTokens ?? null,
      costMicroUsd: result?.costMicroUsd ?? null,
      costLabel: result?.costLabel ?? null,
      backoffMs: wait,
    });
    if (!lastError || !willRetry) break;
    await sleep(wait!);
  }

  // 7. Totals. Tokens and cost add up over every attempt that reported them: a failed attempt
  // that consumed tokens still cost money.
  const sum = (f: (c: CallRecord) => number | null) => {
    const vals = calls.map(f).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  const costLabels = [...new Set(calls.map((c) => c.costLabel).filter((l): l is string => !!l))];

  let verification: VerificationResult<UnsupportedReason | AllowListReason> | null = null;
  if (output && opts.resolver)
    verification = await verifyOutput(kind, output, opts.resolver, input.scope, {
      allowedRecords: inputRefs,
    });

  return {
    kind,
    status: output ? "succeeded" : "failed",
    provider: provider.id,
    providerLabel: provider.label,
    model: answeredModel,
    promptKey: kind,
    promptVersion: def.version,
    inputRefs,
    output,
    error: lastError ? { code: lastError.code, message: lastError.message } : null,
    calls,
    inputTokens: sum((c) => c.inputTokens),
    outputTokens: sum((c) => c.outputTokens),
    costMicroUsd: sum((c) => c.costMicroUsd),
    costLabel: costLabels.join("; ") || "No provider call completed; no usage reported",
    latencyMs: now() - started,
    redaction: {
      applied: provider.external,
      tokenCount: provider.external ? redactor.tokenCount : 0,
      counts: provider.external ? (redactor.counts() as Record<string, number>) : {},
    },
    verification,
    unsupportedStatementCount: verification ? verification.unsupportedCount : null,
  };
}
