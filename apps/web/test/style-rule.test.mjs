// Proves the apps/web styling guard in the root eslint.config.mjs: raw colours and arbitrary
// Tailwind values fail, token utilities pass. Run with `pnpm --filter @carepath/web test`.
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const eslint = new ESLint({ cwd: root });

async function messages(code, file = "apps/web/app/example/page.tsx") {
  const [result] = await eslint.lintText(code, { filePath: root + file });
  return result.messages.filter((m) => m.ruleId === "no-restricted-syntax");
}

const bad = {
  "hex colour": 'export const a = <p style={{ color: "#1E4D40" }} />;',
  "short hex": 'export const a = "#fff";',
  "hex in class": 'export const a = <p className="bg-[#fff]" />;',
  "rgb function": 'export const a = "rgb(10 20 30)";',
  "oklch function": 'export const a = "oklch(60% 0.1 200)";',
  "arbitrary width": 'export const a = <p className="w-[13px]" />;',
  "arbitrary with variant": 'export const a = <p className="md:max-w-[1400px] flex" />;',
  "arbitrary var": 'export const a = <p className="bg-[var(--cp-bg)]" />;',
  "arbitrary property": 'export const a = <p className="[mask-type:alpha]" />;',
  "arbitrary variant": 'export const a = <p className="data-[state=open]:flex" />;',
  "template literal": "export const a = (x) => <p className={`flex ${x} p-[3px]`} />;",
};

for (const [name, code] of Object.entries(bad)) {
  test(`rejects ${name}`, async () => {
    assert.ok((await messages(code)).length > 0, `expected a violation for: ${code}`);
  });
}

const good = {
  "token classes":
    'export const a = <p className="bg-surface text-ink md:px-gutter max-w-measure" />;',
  "anchor link": 'export const a = <a href="#main">Skip</a>;',
  "word starting with hex letters": 'export const a = "#cafe-menu";',
  "array index": "export const a = (items) => items[0];",
};

for (const [name, code] of Object.entries(good)) {
  test(`accepts ${name}`, async () => {
    assert.deepEqual(await messages(code), []);
  });
}

test("the design-system gallery is exempt", async () => {
  assert.deepEqual(
    await messages(
      'export const a = "max-w-[1400px]";',
      "apps/web/app/(public)/design-system/x.tsx",
    ),
    [],
  );
});
