import {
  DETERMINISTIC_PROVIDER_LABEL,
  DeterministicProvider,
  anthropicProviderFromEnv,
  listStatements,
  type GenerationKind,
  type LLMProvider,
  type ProgressSummaryOutput,
  type ProviderCall,
  type ProviderResult,
  type SoapNoteDraftOutput,
} from "@carepath/ai";
import type { AppConfig } from "../../config.js";

/**
 * Provider choice (ADR-5). The deterministic demo provider is the default and is always labelled
 * "Demo provider, rule-based". The Anthropic provider runs only with AI_PROVIDER=anthropic plus
 * its key and model; it has never been run against the live API in this project.
 *
 * Test probes (AI_PROBE, never in production) wrap the deterministic provider and say so in
 * their stored label, so a probe's output can never pass for ordinary demo output.
 */
export function createAiProvider(
  config: AppConfig["ai"],
  env: Record<string, string | undefined> = process.env,
): LLMProvider {
  if (config.provider === "anthropic") {
    const p = anthropicProviderFromEnv(env);
    if (!p)
      throw new Error(
        "AI_PROVIDER=anthropic needs CAREPATH_ANTHROPIC_API_KEY and CAREPATH_ANTHROPIC_MODEL",
      );
    return p;
  }
  const base = new DeterministicProvider();
  if (config.probe === "fail") return failingProvider();
  if (config.probe === "unsupported") return unsupportedProbe(base);
  return base;
}

/** Every attempt answers output that fails the schema, so the pipeline retries and then fails. */
export function failingProvider(): LLMProvider {
  return {
    id: "deterministic-probe",
    label: `${DETERMINISTIC_PROVIDER_LABEL} (test probe: invalid output)`,
    model: null,
    external: false,
    async generate(): Promise<ProviderResult> {
      return {
        output: { probe: "not a draft" },
        usage: { inputTokens: 0, outputTokens: 0 },
        costMicroUsd: 0,
        costLabel: "No model call: test probe, zero cost",
        model: null,
      };
    },
  };
}

/**
 * Adds statements to each deterministic draft: by default one with no source reference. Tests
 * pass `extra` to cite specific records (for example another patient's check-in).
 */
export function unsupportedProbe(
  base: LLMProvider,
  extra: (
    kind: GenerationKind,
  ) => { text: string; sourceRefs: { type: string; id: string; field: string }[] }[] = () => [
    { text: "Test probe statement with no source record.", sourceRefs: [] },
  ],
): LLMProvider {
  return {
    id: "deterministic-probe",
    label: `${DETERMINISTIC_PROVIDER_LABEL} (test probe: added statements)`,
    model: null,
    external: false,
    async generate(call: ProviderCall): Promise<ProviderResult> {
      const result = await base.generate(call);
      const out = structuredClone(result.output) as ProgressSummaryOutput | SoapNoteDraftOutput;
      let n = Math.max(
        0,
        ...listStatements(call.kind, out).map((s) => Number(s.statement.id.slice(1))),
      );
      const added = extra(call.kind).map((e) => ({ id: `s${++n}`, ...e }));
      if (call.kind === "progress_summary")
        (out as ProgressSummaryOutput).itemsForReview.unshift(...(added as never[]));
      else (out as SoapNoteDraftOutput).assessment.unshift(...(added as never[]));
      return { ...result, output: out };
    },
  };
}
