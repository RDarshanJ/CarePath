import { mkdirSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { expect } from "./fixtures";

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
    await page.screenshot({
      path: `${shotDir}/${name}-${size.width}.png`,
      fullPage: !options.overlay,
    });
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
  for (let i = 0; i < limit; i++) {
    if (matches(await focusedName(page))) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached "${String(name)}"; focused is "${await focusedName(page)}"`);
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `horizontal overflow on ${label}`).toBeLessThanOrEqual(1);
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
