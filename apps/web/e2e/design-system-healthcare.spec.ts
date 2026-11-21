import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/*
 * D-WP-5 healthcare gallery spec: axe on every specimen of the five family pages on its own, and the
 * keyboard and state behaviour of the healthcare components in a real browser (the package unit tests
 * render to static markup). Runs in both projects (390 and 1440).
 */

const families = ["records", "data", "planning", "messaging", "ai"] as const;

async function open(page: Page, family: (typeof families)[number] | "") {
  await page.goto(`/design-system/healthcare${family ? `/${family}` : ""}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

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

test("axe: no serious or critical finding on any healthcare specimen", async ({ page }) => {
  const findings: string[] = [];
  let total = 0;
  for (const f of families) {
    await open(page, f);
    const ids = await page
      .locator("[data-specimen]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-specimen")!));
    total += ids.length;
    for (const id of ids) {
      for (const v of await axeOn(page, `[data-specimen="${id}"]`))
        findings.push(`${f}/${id}: ${v}`);
    }
  }
  expect(total).toBeGreaterThan(25);
  expect(findings).toEqual([]);
});

test("titles never carry a patient name; the index links every family", async ({ page }) => {
  await open(page, "");
  for (const f of families) {
    await expect(
      page.getByRole("main").locator(`a[href="/design-system/healthcare/${f}"]`),
    ).toBeVisible();
  }
  for (const f of families) {
    await open(page, f);
    await expect(page).toHaveTitle(/^Healthcare components: [a-z ,]+ \| CarePath$/);
  }
});

test("patient banner: details open from one button; missing values read Not recorded", async ({
  page,
}) => {
  await open(page, "records");
  const banner = specimen(page, "patient-banner-states")
    .getByRole("region", { name: "Patient" })
    .first();
  const button = banner.getByRole("button", { name: "Patient details" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(button).toBeFocused();
  await expect(banner.getByText("Gender", { exact: true })).toBeVisible();
  await expect(banner.getByText("Not recorded").first()).toBeVisible();
  await expect(banner.getByText("You are not on this patient's care team.")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("appointment actions carry the date in their names", async ({ page }) => {
  await open(page, "records");
  const pane = specimen(page, "appointment-rows", "patient");
  await pane.getByRole("button", { name: "Cancel visit on Thu, Nov 19" }).click();
  await expect(pane.getByText("Pressed: Cancel visit on Thu, Nov 19.")).toBeVisible();
  await expect(pane.getByText("Knee pain on stairs")).toHaveCount(0);
});

test("charts: marks equal the table; the patient table opens from a button and stays in the DOM", async ({
  page,
}) => {
  await open(page, "data");
  const pane = specimen(page, "pain-chart", "patient");
  // Hidden tables are out of the accessibility tree, so find it by element while it is closed.
  const table = pane.locator("table");
  await expect(table).toBeHidden();
  await expect(table).toHaveCount(1);
  const toggle = pane.getByRole("button", { name: "Show pain ratings as a table" });
  await toggle.click();
  await expect(table).toBeVisible();
  await expect(pane.getByRole("button", { name: "Hide pain ratings table" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  const marks = await pane
    .locator('[data-mark="point"]')
    .evaluateAll((els) => els.map((e) => `${e.getAttribute("data-value")} of 10`));
  const cells = await table
    .locator('tbody tr[data-row="check-in"] td:nth-child(2)')
    .allTextContents();
  expect(cells).toEqual(marks);
  const clinician = specimen(page, "weekly-sessions", "clinician");
  await expect(clinician.getByRole("table")).toBeVisible();
  const bars = await clinician
    .locator('[data-mark="week"]')
    .evaluateAll((els) =>
      els.map((e) => [e.getAttribute("data-assigned"), e.getAttribute("data-completed")]),
    );
  const rows = await clinician
    .locator("tbody tr")
    .evaluateAll((trs) =>
      trs.map((tr) => [tr.children[1]!.textContent, tr.children[2]!.textContent]),
    );
  expect(rows).toEqual(bars);
});

test("move buttons: focus stays on the moved item, the position is announced, the ends say why", async ({
  page,
}) => {
  await open(page, "planning");
  const pane = specimen(page, "dose-editor", "clinician");
  const down = pane.getByRole("button", { name: "Move Bridge down, now position 1 of 3" });
  await down.focus();
  await page.keyboard.press("Enter");
  const moved = pane.getByRole("button", { name: "Move Bridge down, now position 2 of 3" });
  await expect(moved).toBeFocused();
  await expect(
    pane.getByRole("status").filter({ hasText: "Bridge moved to position 2 of 3" }),
  ).toHaveCount(1);
  await page.keyboard.press("Enter");
  // At the end the down button is unavailable, so focus moves to the up button of the same item.
  await expect(
    pane.getByRole("button", { name: "Move Bridge up, now position 3 of 3" }),
  ).toBeFocused();
  const atEnd = pane.getByRole("button", { name: "Move Bridge down, now position 3 of 3" });
  await expect(atEnd).toHaveAttribute("aria-disabled", "true");
  await expect(atEnd).toHaveAccessibleDescription("Last in the plan");
  // Unavailable controls stay focusable and ignore presses (CD-429).
  await atEnd.dispatchEvent("click");
  await expect(pane.getByText("Position 3 of 3").first()).toBeVisible();
});

test("dose editor: disclosure keeps focus, labelled fields, errors in words", async ({ page }) => {
  await open(page, "planning");
  const pane = specimen(page, "dose-editor", "clinician");
  const edit = pane.getByRole("button", { name: "Edit dose for Bridge" });
  await edit.click();
  await expect(pane.getByRole("button", { name: "Close dose editor for Bridge" })).toBeFocused();
  for (const day of ["Monday", "Wednesday", "Friday"])
    await pane.getByRole("checkbox", { name: day }).first().click();
  await expect(pane.getByText("Choose at least one day.")).toBeVisible();
  const reps = pane.locator("#dose-bridge-reps");
  await expect(reps).toHaveValue("10");
  await reps.fill("12");
  await expect(
    pane.getByText("3 sets of 12 repetitions, hold 5 seconds, rest 30 seconds"),
  ).toBeVisible();
});

test("library: an exercise already in the plan cannot be added twice", async ({ page }) => {
  await open(page, "planning");
  const pane = specimen(page, "exercise-library", "clinician");
  await expect(pane.getByRole("button", { name: "Bridge is in the plan" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await pane.getByRole("button", { name: "Add Mini squat to the plan" }).click();
  await expect(pane.getByRole("button", { name: "Mini squat is in the plan" })).toBeVisible();
  await expect(pane.getByRole("status")).toHaveText("Mini squat added to the plan");
});

test("composer: empty send explains, send reports, retry failure says still not sent", async ({
  page,
}) => {
  await open(page, "messaging");
  const pane = specimen(page, "patient-thread", "patient");
  await expect(pane.getByRole("log", { name: "Messages with your care team" })).toBeVisible();
  const send = pane.getByRole("button", { name: "Send message" });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(pane.getByText("Write a message first.")).toBeVisible();
  const field = pane.getByLabel(/^Message to your care team/);
  await expect(field).toBeFocused();
  await field.fill("Is it fine to walk on rest days?");
  await send.click();
  await expect(pane.getByRole("status").filter({ hasText: /^Sent\./ })).toBeVisible();
  await expect(field).toHaveValue("");
  await pane.getByRole("button", { name: "Retry sending" }).click();
  await expect(pane.getByText("Still not sent")).toBeVisible();
  await expect(pane.locator('a[href="tel:6025550142"]')).toBeVisible();
});

test("staff composer: Ctrl+Enter sends, no emergency notice", async ({ page }) => {
  await open(page, "messaging");
  const pane = specimen(page, "staff-thread", "clinician");
  await expect(pane.locator("[data-emergency-notice]")).toHaveCount(0);
  const field = pane.getByLabel(/^Message to Maria Okonkwo-Lindqvist/);
  await field.fill("Thanks, see you Thursday.");
  await field.press("Control+Enter");
  await expect(pane.getByRole("status").filter({ hasText: "Sent." })).toBeVisible();
});

test("evidence refs say opened, never checked; decision bar gate and reject reason", async ({
  page,
}) => {
  await open(page, "ai");
  const ev = specimen(page, "ai-evidence", "clinician");
  const ref = ev.getByRole("button", { name: /^Open evidence 2: patient check-in, Nov 17$/ });
  await ref.click();
  await expect(
    ev.getByRole("button", { name: "Open evidence 2: patient check-in, Nov 17, opened" }),
  ).toBeFocused();
  const names = await ev
    .locator("button[aria-label^='Open evidence']")
    .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!));
  expect(names.some((n) => n.endsWith(", opened"))).toBe(true);
  expect(names.filter((n) => /checked|verified/i.test(n))).toEqual([]);

  const bar = specimen(page, "ai-decision", "clinician");
  const approve = bar.getByRole("button", { name: "Approve draft with edits" }).first();
  await expect(approve).toHaveAttribute("aria-disabled", "true");
  await expect(approve).toHaveAccessibleDescription(
    /^Approve is unavailable: 1 statement has no supporting record/,
  );
  await approve.dispatchEvent("click");
  await expect(bar.getByText("Generated, edited and approved")).toHaveCount(0);
  await bar.getByRole("link", { name: "Go to: missing information is not acknowledged" }).click();
  await expect(page).toHaveURL(/#missing-information$/);
  await bar.getByRole("button", { name: "Reject draft" }).first().click();
  await bar.getByRole("button", { name: "Reject draft" }).first().click();
  await expect(
    bar.getByText("Say why this draft is not being used, in at least 3 characters."),
  ).toBeVisible();
  await bar.getByRole("button", { name: "Keep reviewing" }).click();
  await bar.getByRole("button", { name: "Resolve every blocker (specimen only)" }).click();
  await expect(approve).not.toHaveAttribute("aria-disabled", "true");
  await approve.click();
  await expect(bar.getByText("Generated, edited and approved")).toBeVisible();
  await expect(bar.getByText("Approved. Not yet part of a signed note.")).toBeVisible();
  await expect(
    bar.getByText("Rule-based demo output. No AI model was used.").first(),
  ).toBeVisible();
});
