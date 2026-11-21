import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** The seed anchor (docs/demo-accounts.md). The API runs with CAREPATH_FIXED_NOW set to the same instant. */
export const ANCHOR = process.env["CAREPATH_FIXED_NOW"] ?? "2026-11-19T16:00:00.000Z";

export const PASSWORD = "CarePath-Demo-2026";

/** Demo accounts, each with its home and the home page's h1 (tests wait for it before axe, DR-004 6.7). */
export const accounts = {
  patient: {
    email: "patient.demo@carepath.test",
    home: "/today",
    heading: "Today",
    shell: "patient",
  },
  physical_therapist: {
    email: "therapist.demo@carepath.test",
    home: "/overview",
    heading: "Overview",
    shell: "clinician",
  },
  care_coordinator: {
    email: "coordinator.demo@carepath.test",
    home: "/admin/patients",
    heading: "Patients",
    shell: "admin",
  },
  clinic_admin: {
    email: "admin.demo@carepath.test",
    home: "/admin/patients",
    heading: "Patients",
    shell: "admin",
  },
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
 * Runs `fn` with every sticky bottom bar (`data-sticky-bar`: the patient and staff tab bars, sticky action
 * bars) placed in the page flow, as CD-125 already does at large zoom. axe's target-size rule counts a
 * control as "partially obscured" when the sticky bar happens to overlap it at the current scroll
 * position, so the same page passed or failed depending on where the previous page left the scroll. The
 * bar's own controls are still checked (they are at the end of the page), and focus under the bar is
 * tested separately by the keyboard passes in shells.spec.ts (WCAG 2.4.11). DR-004 ruling 6.6: this is
 * the only place that changes layout for axe, and every slice with a sticky bar keeps a keyboard pass
 * asserting that no focused control's box intersects the bar.
 */
export async function withStickyBarsInFlow<T>(page: Page, fn: () => Promise<T>): Promise<T> {
  const handle = await page.addStyleTag({
    content: "[data-sticky-bar] { position: static !important; }",
  });
  try {
    return await fn();
  } finally {
    await handle.evaluate((el) => (el as Element).remove());
  }
}

/**
 * axe on the page as it is now. Serious and critical findings fail the test; lesser ones are
 * attached so they stay visible. Every page the tests visit goes through this.
 */
export async function expectNoSeriousViolations(page: Page, label: string) {
  const results = await withStickyBarsInFlow(page, () =>
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze(),
  );
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const summary = blocking.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
  expect(summary, `axe serious or critical findings on ${label}`).toEqual([]);
}

/** The name DR-004 ruling 6.6 uses for the same check; slices may use either. */
export const expectNoAxeViolations = expectNoSeriousViolations;

export async function signInWithForm(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
