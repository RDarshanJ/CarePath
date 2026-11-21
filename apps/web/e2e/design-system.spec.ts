import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/*
 * D-WP-2 gallery spec: axe on every specimen of /design-system on its own, and the keyboard and state
 * behaviour of the components in a real browser (the package unit tests run without a DOM). Runs in
 * both projects (390 and 1440); width-dependent checks name the project they need.
 */

const isMobile = (name: string) => name.startsWith("mobile");

/**
 * Radix moves focus after a zero-delay timeout and checks the radio only while the arrow key is still
 * down, as it is for a person; Playwright's press releases at once, so hold the key briefly.
 */
async function arrow(page: Page, key: string) {
  await page.keyboard.down(key);
  await page.waitForTimeout(60);
  await page.keyboard.up(key);
}

async function open(page: Page) {
  await page.goto("/design-system");
  await expect(
    page.getByRole("heading", { level: 1, name: "Tokens and components" }),
  ).toBeVisible();
}

/** The specimen, or one theme's pane of it when it shows both themes. */
const specimen = (page: Page, id: string, theme?: "patient" | "clinician"): Locator => {
  const s = page.locator(`[data-specimen="${id}"]`);
  return theme ? s.locator(`[data-pane="${theme}"]`) : s;
};

async function axeOn(page: Page, selector: string) {
  const results = await new AxeBuilder({ page })
    .include(selector)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${v.impact} ${v.id}: ${v.nodes
          .slice(0, 2)
          .map((n) => n.target.join(" "))
          .join(" | ")}`,
    );
}

test("axe: no serious or critical finding on any gallery specimen", async ({ page }) => {
  await open(page);
  const ids = await page
    .locator("[data-specimen]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-specimen")!));
  expect(ids.length).toBeGreaterThan(25);
  const findings: string[] = [];
  for (const id of ids) {
    for (const f of await axeOn(page, `[data-specimen="${id}"]`)) findings.push(`${id}: ${f}`);
  }
  expect(findings).toEqual([]);
});

test("error summary: takes focus, links move focus to the field, title gets Error", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "error-summary", "clinician");
  await s.getByRole("button", { name: "Save exercise" }).click();
  const summary = s.getByRole("alert").filter({ hasText: "Fix these before you save" });
  await expect(summary).toBeFocused();
  await expect(page).toHaveTitle(/^Error: /);
  await summary.getByRole("link", { name: "Enter repetitions from 1 to 100" }).click();
  await expect(s.getByLabel(/^Repetitions/)).toBeFocused();
  await s.getByLabel(/^Exercise name/).fill("Sit to stand");
  await s.getByLabel(/^Repetitions/).fill("12");
  await s.getByRole("button", { name: "Save exercise" }).click();
  await expect(s.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page).not.toHaveTitle(/^Error: /);
});

test("pain scale: arrows move and select, anchors are named, the line states the number", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "pain-scale");
  const group = s.getByRole("radiogroup").first();
  await expect(group.getByRole("radio", { name: "0 of 10, no pain" })).toBeVisible();
  await expect(group.getByRole("radio", { name: "10 of 10, worst pain imaginable" })).toBeVisible();
  await group.getByRole("radio", { name: "4 of 10" }).click();
  await arrow(page, "ArrowRight");
  await expect(group.getByRole("radio", { name: "5 of 10" })).toBeChecked();
  await expect(group.getByRole("radio", { name: "5 of 10" })).toBeFocused();
  await expect(s.getByText("You chose 5 of 10.").first()).toBeVisible();
  await expect(s).not.toContainText(/\b(mild|moderate|severe)\b/i);
  // Every item keeps the 48 px target; at 390 the scale wraps into 0 to 5 and 6 to 10.
  const boxes = await group
    .getByRole("radio")
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  for (const b of boxes) {
    expect(b.width).toBeGreaterThanOrEqual(48);
    expect(b.height).toBeGreaterThanOrEqual(48);
  }
  const tops = new Set(boxes.map((b) => Math.round(b.top)));
  expect(tops.size).toBe(test.info().project.name.startsWith("mobile") ? 2 : 1);
  if (tops.size === 2) expect(Math.round(boxes[5]!.top)).toBe(Math.round(boxes[0]!.top));
});

test("segmented control and toggle chips: one tab stop with arrows; Space toggles", async ({
  page,
}) => {
  await open(page);
  const seg = specimen(page, "segmented-control");
  await seg.getByRole("radio", { name: "Open and in review" }).focus();
  await arrow(page, "ArrowRight");
  await expect(seg.getByRole("radio", { name: "Closed" })).toBeChecked();
  await expect(seg.getByText("Showing closed tasks.")).toBeVisible();

  const chips = specimen(page, "toggle-chips-slots");
  const tue = chips.getByRole("button", { name: /^Tuesday/ });
  await expect(tue).toHaveAttribute("aria-pressed", "false");
  await tue.focus();
  await page.keyboard.press("Space");
  await expect(tue).toHaveAttribute("aria-pressed", "true");
  const slot = chips.getByRole("button", { name: "Friday, November 20, 9:30 AM" });
  await slot.focus();
  await page.keyboard.press("Enter");
  await expect(
    chips.getByRole("button", { name: "Friday, November 20, 9:30 AM, selected" }),
  ).toContainText("Selected");
});

test("note dialog: outside click keeps text, Esc shows the discard row, error stays inside", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "dialogs", "clinician");
  const opener = s.getByRole("button", { name: "Resolve with a note" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Resolve this task" });
  await dialog.getByLabel(/^Note/).fill("Called the patient; pain settled.");
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog.getByText("Discard your note?")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep editing" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog.getByLabel(/^Note/)).toBeFocused();
  await expect(dialog.getByLabel(/^Note/)).toHaveValue("Called the patient; pain settled.");
  await dialog.getByRole("button", { name: "Resolve task" }).click();
  const err = dialog.getByRole("alert").filter({ hasText: "Not saved. Your note is still here." });
  await expect(err).toBeVisible();
  await expect(dialog.getByText("Not saved. Your note is still here.")).toBeFocused();
  await dialog.getByRole("button", { name: "Close" }).first().click();
  await dialog.getByRole("button", { name: "Discard note" }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("confirm dialog: alertdialog, focus on the safe button, outside click does nothing", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "dialogs", "clinician");
  await s.getByRole("button", { name: "Cancel visit" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Cancel this visit?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep this visit" })).toBeFocused();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel visit" }).click();
  await expect(dialog.getByText("Your visit was not cancelled")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(s.getByRole("button", { name: "Cancel visit" })).toBeFocused();
});

test("bottom sheet: a sheet below 768 px, a centred dialog above", async ({ page }) => {
  await open(page);
  await specimen(page, "sheet").getByRole("button", { name: "Skip this exercise" }).click();
  const sheet = page.getByRole("dialog", { name: "Why are you skipping it?" });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(400); // the entry animation has finished
  const box = (await sheet.boundingBox())!;
  const vp = page.viewportSize()!;
  if (isMobile(test.info().project.name)) {
    expect(Math.round(box.y + box.height)).toBe(vp.height);
    expect(Math.round(box.width)).toBe(vp.width);
  } else {
    expect(box.width).toBeLessThan(vp.width / 2);
    expect(box.y + box.height).toBeLessThan(vp.height);
  }
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("side panel: inline at 1440, modal drawer at 1024, full screen at 390 (R6)", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "side-panel");
  await s.getByRole("button", { name: "See intake" }).click();
  if (isMobile(test.info().project.name)) {
    await expect(page.getByRole("dialog", { name: "Intake for Avery Demopatient" })).toBeVisible();
    const box = (await page.getByRole("dialog").boundingBox())!;
    expect(Math.round(box.width)).toBe(page.viewportSize()!.width);
    await page.keyboard.press("Escape");
    await expect(s.getByRole("button", { name: "See intake" })).toBeFocused();
    return;
  }
  await expect(
    s.getByRole("complementary", { name: "Intake for Avery Demopatient" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await s.getByRole("button", { name: "Close intake" }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await s.getByRole("button", { name: "See intake" }).click();
  await expect(page.getByRole("dialog", { name: "Intake for Avery Demopatient" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("toasts wait while a dialog is open and appear after it closes", async ({ page }) => {
  await open(page);
  const s = specimen(page, "toasts");
  await s.getByRole("button", { name: "Open a dialog, toast waits" }).click();
  const dialog = page.getByRole("dialog", { name: "Toasts wait for this dialog" });
  await dialog.getByRole("button", { name: "Raise a toast" }).click();
  await expect(page.getByText("Shown after the dialog closed")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByText("Shown after the dialog closed")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.getByText("Shown after the dialog closed")).toHaveCount(0);
});

test("leave guard: an in-app link with unsaved text asks first; Stay keeps the text", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "leave-guard");
  await s.getByLabel(/^Draft message/).fill("Remember the stairs.");
  await s.getByRole("link", { name: "Go to the colour section" }).click();
  const ask = page.getByRole("alertdialog", { name: "Leave without saving?" });
  await expect(ask).toBeVisible();
  await expect(ask.getByRole("button", { name: "Stay on this page" })).toBeFocused();
  await ask.getByRole("button", { name: "Stay on this page" }).click();
  await expect(page).not.toHaveURL(/visited=colour/);
  await expect(s.getByLabel(/^Draft message/)).toHaveValue("Remember the stairs.");
  await page.goBack();
  await expect(page.getByRole("alertdialog", { name: "Leave without saving?" })).toBeVisible();
  await page.getByRole("button", { name: "Stay on this page" }).click();
  await s.getByRole("link", { name: "Go to the colour section" }).click();
  await page.getByRole("button", { name: "Leave page" }).click();
  await expect(page).toHaveURL(/visited=colour/);
});

test("URL tabs: arrow keys move, the section is in the address, Back returns", async ({ page }) => {
  await open(page);
  const s = specimen(page, "url-tabs");
  await s.getByRole("tab", { name: "Overview" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(s.getByRole("tab", { name: "Care plan" })).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/gallery-tab=plan/);
  await page.keyboard.press("End");
  await expect(page).toHaveURL(/gallery-tab=history/);
  await page.goBack();
  await expect(page).toHaveURL(/gallery-tab=plan/);
  await expect(s.getByRole("tab", { name: "Care plan" })).toHaveAttribute("aria-selected", "true");
});

test("table: sort names its direction, paging moves focus to the caption, filters clear", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "data-table");
  const sortBtn = s.getByRole("button", {
    name: /^Reported pain, sortable, currently sorted highest first/,
  });
  await sortBtn.click();
  await expect(
    s.getByRole("button", { name: /^Reported pain, sortable, currently sorted lowest first/ }),
  ).toBeVisible();
  await expect(s.getByText("Patients 1 to 10 of 57")).toBeVisible();
  await expect(s.getByRole("button", { name: "Previous page" })).toHaveCount(0);
  await s.getByRole("button", { name: "Next page" }).click();
  await expect(s.getByText("Patients 11 to 20 of 57")).toBeVisible();
  await expect(s.locator("caption")).toBeFocused();
  await s.getByRole("button", { name: /^Filters/ }).click();
  await s.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "Inactive" }).click();
  await expect(s.getByRole("button", { name: "Remove filter Status: Inactive" })).toBeVisible();
  await expect(s.getByRole("button", { name: "Filters, 1 active" })).toBeVisible();
  await s.getByRole("button", { name: "Clear filters" }).first().click();
  await expect(s.getByRole("status").filter({ hasText: "57 patients" })).toBeVisible();
  await expect(page).not.toHaveURL(/q=/);
});

test("load more: focus moves to the first new item and the count is announced", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "load-more");
  await s.getByRole("button", { name: "Show more tasks" }).click();
  await expect(s.getByRole("link", { name: "Check-in from Frankie Demopatient6" })).toBeFocused();
  await expect(s.getByRole("status").filter({ hasText: "5 more tasks loaded" })).toBeAttached();
  await expect(s.getByText("Showing 10 of 23")).toBeVisible();
});

test("icon button: the name shows as a tooltip on keyboard focus, Esc hides it", async ({
  page,
}) => {
  await open(page);
  const s = specimen(page, "button-critical-unavailable", "clinician");
  const btn = s.getByRole("button", { name: "Close evidence panel" });
  await btn.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(
    s.locator("[data-tooltip]").filter({ hasText: "Close evidence panel" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(s.locator("[data-tooltip]")).toHaveCount(0);
  // Unavailable stays focusable and ignores presses.
  const publish = s.getByRole("button", { name: "Review and publish version 2" });
  await publish.focus();
  await expect(publish).toBeFocused();
  await expect(publish).toHaveAttribute("aria-disabled", "true");
});
