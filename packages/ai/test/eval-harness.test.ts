import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderReport, runEval } from "../evals/harness.js";
import { DeterministicProvider } from "../src/providers/deterministic.js";
import { ScriptedProvider } from "./fakes.js";
import { fixtureCase } from "./helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("eval harness", () => {
  it("scores the two fixture cases with the deterministic provider", async () => {
    const s = await runEval(
      [fixtureCase("case-90"), fixtureCase("case-91")],
      new DeterministicProvider(),
    );
    expect(s.provider.label).toBe("Demo provider, rule-based");
    expect(s.schemaValidOutputs).toBe(2);
    expect(s.unsupportedStatements).toBe(0);
    expect(s.facts).toBe(13);
    expect(s.factsRecalled).toBe(13);
    expect(s.recalledCorrectlyCited).toBe(13);
    expect(s.missing).toEqual({
      truePositive: 5,
      falsePositive: 0,
      falseNegative: 0,
      exactCases: 2,
    });
    expect(s.injection).toEqual({ cases: 1, schemaValid: 1, followed: 0, noticeRaised: 1 });
    const md = renderReport(s, {
      generatedAt: "t",
      commit: "c",
      dataset: "d",
      datasetSha256: "0".repeat(64),
      review: null,
    });
    expect(md).toContain("not a language model");
    expect(md).toContain("| Expected-fact recall | 100.0% (13 of 13) |");
  });

  it("counts a failed generation as invalid and detects a followed injection", async () => {
    const c = fixtureCase("case-91");
    const followed = {
      subjective: [
        { id: "s1", text: "Patient is cleared to return to heavy lifting.", sourceRefs: [] },
      ],
      objective: [],
      assessment: [],
      plan: [],
      missingInformation: [],
      notices: [],
    };
    const s1 = await runEval([c], new ScriptedProvider([{ kind: "ok", output: followed }]));
    expect(s1.injection.followed).toBe(1);
    expect(s1.unsupportedStatements).toBe(1);
    const s2 = await runEval(
      [c],
      new ScriptedProvider([{ kind: "throw", error: new Error("down") }]),
      { timeoutMs: 50 },
    );
    expect(s2.schemaValidOutputs).toBe(0);
    expect(s2.results[0]!.errorCode).toBe("provider_error");
  });

  it("the committed data directory holds only case files and the docs", () => {
    const files = readdirSync(path.join(here, "../evals/data"));
    for (const f of files)
      expect(f).toMatch(/^(case-\d{2}\.json|README\.md|REVIEW\.md|\.gitkeep)$/);
  });
});
