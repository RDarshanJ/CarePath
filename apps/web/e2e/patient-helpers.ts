import { mkdirSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expect, withStickyBarsInFlow } from "./fixtures";

/** Patient personas from docs/demo-accounts.md. */
export const personas = {
  demo: "patient.demo@carepath.test",
  resume: "patient.resume@carepath.test",
  noai: "patient.noai@carepath.test",
  flare: "patient.flare@carepath.test",
  intake: "patient.intake@carepath.test",
} as const;

const shotDir = process.env["SCREENSHOT_DIR"];

/**
 * Save the screen at 390 and at 1440 (the viewport is resized, then restored), so every patient screen has
 * both. `overlay` shots capture the viewport only, because sheets are fixed to it.
 */
export async function shots(page: Page, name: string, options: { overlay?: boolean } = {}) {
  if (!shotDir) return;
  mkdirSync(shotDir, { recursive: true });
  const original = page.viewportSize() ?? { width: 390, height: 844 };
  const sizes = [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.waitForTimeout(250);
    if (!options.overlay) {
      // Grow the viewport to the page's height instead of using a full-page capture, which would draw the
      // sticky tab bar in the middle of the page.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: size.width, height: Math.max(size.height, height) });
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: `${shotDir}/${name}-${size.width}.png` });
  }
  await page.setViewportSize(original);
  await page.waitForTimeout(150);
}

/** The accessible name of the focused element, as a screen reader would start to read it. */
async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "";
    const labelled = el.getAttribute("aria-labelledby");
    const byId = labelled
      ? labelled
          .split(" ")
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
      : "";
    return (
      (el.getAttribute("aria-label") ?? byId ?? el.textContent ?? "").trim() ||
      (el.textContent ?? "").trim()
    );
  });
}

/** Keyboard only: press Tab until the focused element's name matches, then stop. Fails after `limit` presses. */
export async function tabTo(page: Page, name: RegExp | string, limit = 90): Promise<void> {
  const matches = (text: string) => (typeof name === "string" ? text === name : name.test(text));
  const seen: string[] = [];
  for (let i = 0; i < limit; i++) {
    const now = await focusedName(page);
    if (matches(now)) return;
    if (seen.length < 14) seen.push(now);
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached "${String(name)}"; first stops: ${seen.join(" > ")}`);
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  const culprits = overflow > 1 ? await overflowingElements(page) : [];
  expect(overflow, `horizontal overflow on ${label}: ${culprits.join(" ; ")}`).toBeLessThanOrEqual(
    1,
  );
}

/** Text of `main`, for copy checks. */
export async function mainText(page: Page): Promise<string> {
  return (await page.locator("main").innerText()).replace(/\s+/g, " ");
}

export function radio(scope: Page | Locator, group: string, value: string) {
  return scope
    .getByRole("radiogroup", { name: group })
    .getByRole("radio", { name: value, exact: true });
}

/**
 * axe on the page as it is now, like the shared fixture, but a failure names the offending elements so a
 * finding can be fixed rather than guessed at. Serious and critical findings fail; lesser ones do not.
 */
export async function expectNoSeriousViolations(page: Page, label: string) {
  // Sticky bars in the page flow while axe runs: see `withStickyBarsInFlow` in fixtures.ts.
  const results = await withStickyBarsInFlow(page, () =>
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze(),
  );
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const summary = blocking.map(
    (v) =>
      `${v.impact} ${v.id}: ${v.help} :: ${v.nodes
        .slice(0, 3)
        .map((n) => `${n.target.join(" ")} [${n.any.map((c) => c.message).join("; ")}]`)
        .join(" | ")}`,
  );
  expect(summary, `axe serious or critical findings on ${label}`).toEqual([]);
}

/** Elements that stick out past the right edge, for a failing overflow check. */
export async function overflowingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll("body *"))
      .filter((el) => el.getBoundingClientRect().right > width + 1)
      .slice(0, 8)
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} "${(el.textContent ?? "").trim().slice(0, 30)}"`,
      );
  });
}

/** An arrow key held for a moment. Radix selects on focus only while the key is down, which an instant press misses. */
export async function arrow(page: Page, key: "ArrowDown" | "ArrowRight" | "ArrowUp" | "ArrowLeft") {
  await page.keyboard.down(key);
  await page.waitForTimeout(60);
  await page.keyboard.up(key);
}

/**
 * Complete the exercise on screen by tapping Done for each set, skipping rest. When the player shows the
 * Next phase between two exercises (D-WP-10), "Start exercise n" is tapped first.
 */
export async function finishExercise(page: Page) {
  const start = page.getByRole("button", { name: /^Start exercise \d+$/ });
  if (await start.isVisible()) await start.click();
  const skipRest = page.getByRole("button", { name: "Skip rest" });
  const done = page.getByRole("button", { name: /^Done with/ });
  for (let i = 0; i < 14; i++) {
    // After a tap the screen shows either the rest timer or the next set's button; wait for one of them.
    try {
      await skipRest.or(done).first().waitFor({ state: "visible", timeout: 4000 });
    } catch {
      return;
    }
    if (await skipRest.isVisible()) {
      await skipRest.click();
      continue;
    }
    const label = await done.innerText();
    await done.click();
    if (/finish exercise|this exercise/i.test(label)) return;
  }
}
