import { readFileSync } from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/*
 * Axe on every story of the static Storybook build, in both token themes, at the two project widths
 * (375 and 1440). The story list comes from the build's own index.json, so a new story is covered the
 * moment it exists. Stories are fragments, not pages: the three document-level rules (a landmark around
 * all content, one main, a level-one heading) do not apply to a fragment and are off; every other WCAG
 * 2.0, 2.1 and 2.2 A and AA rule is on, at every impact level.
 */
interface Entry {
  type: string;
  id: string;
  title: string;
  name: string;
}
const index = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../../packages/ui/.storybook-static/index.json"),
    "utf8",
  ),
) as { entries: Record<string, Entry> };
const stories = Object.values(index.entries).filter((e) => e.type === "story");

test("the build lists the stories", () => {
  expect(stories.length).toBeGreaterThan(50);
});

for (const theme of ["patient", "clinician"] as const) {
  for (const s of stories) {
    test(`axe, ${theme}: ${s.title} / ${s.name}`, async ({ page }) => {
      const problems: string[] = [];
      page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
      await page.goto(`/iframe.html?id=${s.id}&viewMode=story&globals=theme:${theme}`);
      await page.waitForSelector("body.sb-show-main", { timeout: 15_000 });
      // Overlay stories render their content in a portal, so the story container can be empty.
      await expect(page.locator("#story-main")).toBeAttached();
      await expect(page.locator("body.sb-show-errordisplay")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator("html").getAttribute("data-theme")).toBe(theme);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["region", "landmark-one-main", "page-has-heading-one"])
        .analyze();
      for (const v of results.violations) {
        problems.push(
          `${v.impact} ${v.id}: ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(" "))
            .join(" | ")}`,
        );
      }
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
}
