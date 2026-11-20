import { ZERO_COST_LABEL } from "../src/cost.js";
import { AIError } from "../src/errors.js";
import type { LLMProvider, ProviderCall, ProviderResult } from "../src/providers/types.js";

type Step =
  | {
      kind: "ok";
      output: unknown;
      usage?: { inputTokens: number; outputTokens: number };
      costMicroUsd?: number;
    }
  | { kind: "hang" }
  | { kind: "throw"; error: Error };

/** A scripted provider: each call takes the next step. Records every call it receives. */
export class ScriptedProvider implements LLMProvider {
  readonly id = "scripted";
  readonly label = "Scripted test provider";
  readonly model = "scripted-1";
  readonly calls: ProviderCall[] = [];
  aborted = 0;
  constructor(
    private readonly steps: Step[],
    readonly external = false,
  ) {}

  async generate(call: ProviderCall): Promise<ProviderResult> {
    this.calls.push(call);
    const step = this.steps[Math.min(this.calls.length - 1, this.steps.length - 1)]!;
    if (step.kind === "hang") {
      return new Promise((_, reject) => {
        call.signal.addEventListener("abort", () => {
          this.aborted += 1;
          reject(new Error("aborted"));
        });
      });
    }
    if (step.kind === "throw") throw step.error;
    return {
      output: step.output,
      usage: step.usage ?? null,
      costMicroUsd: step.costMicroUsd ?? null,
      costLabel: step.costMicroUsd === undefined ? ZERO_COST_LABEL : "test price",
      model: this.model,
    };
  }
}

export const transient = () => new AIError("provider_error", "HTTP 529", { retryable: true });
export const permanent = () => new AIError("provider_error", "HTTP 400", { retryable: false });
