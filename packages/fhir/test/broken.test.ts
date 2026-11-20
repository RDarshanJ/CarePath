import { describe, expect, it } from "vitest";
import { isError, toOperationOutcome } from "../src/index.js";
import { brokenFixtures, runFixture } from "./broken.js";

const fixtures = brokenFixtures();

describe("deliberately broken fixtures", () => {
  it("has a fixture set", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(25);
  });

  it.each(fixtures.map((f) => [f.name, f] as const))(
    "%s fails with an itemised error",
    async (_, f) => {
      const { issues, status } = await runFixture(f);
      const errors = issues.filter(isError);
      expect(errors.length).toBeGreaterThan(0);
      const hit = errors.find((i) => i.rule === f.expect.rule);
      expect(
        hit,
        `expected rule ${f.expect.rule}, got ${errors.map((e) => e.rule).join(", ")}`,
      ).toBeDefined();
      expect(hit!.layer).toBe(f.expect.layer);
      for (const e of errors) expect(e.expression).toMatch(/^Bundle/);
      if (f.expect.status) expect(status).toBe(f.expect.status);
      const outcome = toOperationOutcome(issues);
      expect(outcome.issue!.length).toBe(issues.length);
      expect(outcome.issue!.some((i) => i.details?.coding?.[0]?.code === f.expect.rule)).toBe(true);
    },
  );
});
