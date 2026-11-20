import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** The seed anchor (docs/demo-accounts.md). The API runs with CAREPATH_FIXED_NOW set to the same instant. */
export const ANCHOR = process.env["CAREPATH_FIXED_NOW"] ?? "2026-11-19T16:00:00.000Z";

export const PASSWORD = "CarePath-Demo-2026";

export const accounts = {
  patient: { email: "patient.demo@carepath.test", home: "/today", shell: "patient" },
  physical_therapist: {
    email: "therapist.demo@carepath.test",
    home: "/overview",
    shell: "clinician",
  },
  care_coordinator: { email: "coordinator.demo@carepath.test", home: "/admin", shell: "admin" },
  clinic_admin: { email: "admin.demo@carepath.test", home: "/admin", shell: "admin" },
} as const;

export type RoleName = keyof typeof accounts;

/** One path inside each shell, used to try to enter a shell that is not yours. */
export const shellEntry = { patient: "/today", clinician: "/overview", admin: "/admin" } as const;

/** The browser clock is fixed to the seed anchor in every test, as the API clock is. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(ANCHOR);
    await use(page);
  },
});

export { expect };

/**
 * axe on the page as it is now. Serious and critical findings fail the test; lesser ones are
 * attached so they stay visible. Every page the tests visit goes through this.
 */
export async function expectNoSeriousViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const summary = blocking.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
  expect(summary, `axe serious or critical findings on ${label}`).toEqual([]);
}

export async function signInWithForm(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
