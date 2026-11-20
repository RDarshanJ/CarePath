/**
 * Checkpoint C1, ruling 3.6: the API runs TypeScript through tsx. `build` is a type check that
 * emits nothing, so no compiled artifact exists that could be mistaken for a runnable one.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = JSON.parse(readFileSync(path.join(apiRoot, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

describe("API packaging", () => {
  it("starts through tsx, which is a runtime dependency", () => {
    expect(pkg.scripts["start"]).toBe("tsx src/server.ts");
    expect(pkg.dependencies["tsx"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.devDependencies["tsx"]).toBeUndefined();
  });

  it("builds with a no-emit type check and has no emitting tsconfig", () => {
    expect(pkg.scripts["build"]).toContain("--noEmit");
    expect(existsSync(path.join(apiRoot, "tsconfig.build.json"))).toBe(false);
  });
});
