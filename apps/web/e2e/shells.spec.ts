import type { Page } from "@playwright/test";
import { accounts, expect, expectNoSeriousViolations, signInWithForm, test } from "./fixtures";
import { personas } from "./patient-helpers";

/**
 * D-WP-6: shells, navigation and sign-in. CD-500 (patient nav), CD-205 (signed in as), CD-501 with the
 * DR-002 H order and both inbox badges (CD-508), CD-502 (admin shell without navigation), CD-505 (back
 * link), CD-507 (one skip link, first Tab stop, landmarks), DR-002 I (no `q=` in staff URLs is D-WP-13's
 * test; the store lives in the staff layout). Runs in both projects (390 and 1440).
 */

const SKIP = "Skip to main content";

/** Puts the sequential focus starting point at the top of the document, as a fresh page load does. */
async function focusDocumentStart(page: Page) {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute("tabindex");
  });
}

/** The first Tab stop is the one skip link; Enter on it moves focus to main#main. */
async function expectSkipLinkFirst(page: Page, label: string) {
  await expect(page.getByRole("link", { name: SKIP }), `${label}: one skip link`).toHaveCount(1);
  await focusDocumentStart(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: SKIP }), `${label}: first Tab stop`).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main"), `${label}: focus moves to main`).toBeFocused();
}

/** One banner, one main, at most one navigation landmark exposed, and nothing rendered twice. */
async function expectLandmarks(page: Page, label: string, navs: number) {
  await expect(page.getByRole("banner"), `${label}: banner`).toHaveCount(1);
  await expect(page.getByRole("main"), `${label}: main`).toHaveCount(1);
  // Shell navigation only; a page's own Pagination landmark is the page's business.
  await expect(
    page.locator('nav:not([aria-label="Pagination"])').filter({ visible: true }),
    `${label}: navigation`,
  ).toHaveCount(navs);
  await expect(
    page.getByText("Demonstration product. Synthetic data. Not for clinical use."),
  ).toBeVisible();
}

/**
 * Every visible control in the shell (banner, navigation, footer) meets its theme's target floor:
 * 48 px in the patient theme, 24 px in the clinician theme (CD-121). Page content is the slices' business.
 */
async function expectShellTargets(page: Page, label: string) {
  const small = await page.evaluate(() => {
    const out: string[] = [];
    const roots = document.querySelectorAll("header, nav:not([aria-label='Pagination']), footer");
    for (const root of roots) {
      for (const el of root.querySelectorAll<HTMLElement>("a[href], button, select, input")) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === "hidden") continue;
        if (el.closest(".sr-only")) continue;
        const theme = el.closest("[data-theme]")?.getAttribute("data-theme") ?? "patient";
        const floor = theme === "patient" ? 48 : 24;
        if (r.width < floor || r.height < floor)
          out.push(
            `${(el.textContent ?? "").trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`,
          );
      }
    }
    return out;
  });
  expect(small, `${label}: shell targets under the theme floor`).toEqual([]);
}

/** No focused element is covered by another element (a sticky bar), checked at its centre. */
async function focusedIsUnobscured(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 0), window.innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (!hit || el.contains(hit) || hit.contains(el)) return null;
    return `${el.tagName} "${(el.textContent ?? "").trim().slice(0, 40)}" under ${hit.tagName}`;
  });
}

test("sign-in: the form is primary, the demo chooser is secondary and real, onboarding is linked", async ({
  page,
}, info) => {
  const wide = info.project.use.viewport!.width >= 1024;
  await page.goto("/login");
  await expectSkipLinkFirst(page, "/login");
  await expect(page.getByRole("main")).toHaveCount(1);
  // The form comes first in reading order; the chooser is a level-2 section after it.
  const order = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const demo = document.getElementById("demo-heading");
    return h1 && demo ? h1.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order).toBeTruthy();
  await expect(page.getByRole("heading", { level: 2, name: "Exploring the demo?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create your account" })).toHaveAttribute(
    "href",
    "/onboarding",
  );
  // Below the two-column width a link says the demo accounts exist and moves to them.
  const jump = page.getByRole("link", { name: "Exploring the demo? Choose a role" });
  if (wide) {
    await expect(jump).toBeHidden();
  } else {
    await jump.click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Exploring the demo?" }),
    ).toBeInViewport();
  }
  // Only one filled primary button: Sign in. The role buttons are not filled.
  const filled = await page.evaluate(
    () =>
      [...document.querySelectorAll("button")].filter((b) => b.className.includes("bg-primary "))
        .length,
  );
  expect(filled).toBe(1);
  await expectNoSeriousViolations(page, "/login");
});

test("onboarding carries the one skip link and the demo notice", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  await expectSkipLinkFirst(page, "/onboarding");
  await expect(
    page.getByText("Demonstration product. Synthetic data. Not for clinical use."),
  ).toBeVisible();
});

test("patient shell: signed in as, one nav, badge from the API, back link in the session", async ({
  page,
}, info) => {
  const mobile = info.project.use.viewport!.width < 768;
  await signInWithForm(page, accounts.patient.email);
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  await expectLandmarks(page, "/today", 1);
  await expectShellTargets(page, "/today");
  await expectSkipLinkFirst(page, "/today");

  const session = await page.evaluate(async () => (await fetch("/api/auth/session")).json());
  await expect(page.getByRole("banner")).toContainText(`Signed in as ${session.user.displayName}`);
  await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();

  // Badge equals the API's unread total, read with its unit after the label.
  const unread: number = await page.evaluate(
    async () => (await (await fetch("/api/conversations?limit=1")).json()).unreadTotal,
  );
  const nav = page.getByRole("navigation", { name: "Patient" });
  const messages = nav.getByRole("link", { name: /^Messages/ });
  if (unread > 0) await expect(messages).toHaveAccessibleName(`Messages , ${unread} unread`);
  else await expect(messages).toHaveAccessibleName("Messages");

  // Bottom bar on a phone, a header row from md (CD-500).
  const box = (await nav.boundingBox())!;
  const viewport = page.viewportSize()!;
  if (mobile) expect(box.y + box.height).toBeGreaterThan(viewport.height - 4);
  else expect(box.y + box.height).toBeLessThan(220);

  // A nested route keeps its destination current.
  await messages.click();
  await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
  const thread = page.locator('main a[href^="/messages/"]').first();
  if (await thread.count()) {
    await thread.click();
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    await expect(nav.getByRole("link", { name: /^Messages/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }

  // The guided session hides navigation and identity, and shows one back link named for Today (CD-505).
  await page.goto("/session");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("banner")).not.toContainText("Signed in as");
  await expect(page.getByRole("button", { name: "Contact care team" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Today" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expectNoSeriousViolations(page, "/today after the back link");
});

test("patient keyboard pass: every Tab stop on Today stays clear of the bottom bar", async ({
  page,
}) => {
  await signInWithForm(page, personas.noai);
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  await focusDocumentStart(page);
  const covered: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const hidden = await focusedIsUnobscured(page);
    if (hidden) covered.push(hidden);
  }
  expect(covered).toEqual([]);
});

test("clinician shell: DR-002 H order, both badges equal the API totals, no stacked rail on a phone", async ({
  page,
}, info) => {
  const mobile = info.project.use.viewport!.width < 768;
  await signInWithForm(page, accounts.physical_therapist.email);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expectLandmarks(page, "/overview", 1);
  await expectShellTargets(page, "/overview");
  await expectSkipLinkFirst(page, "/overview");

  const nav = page.getByRole("navigation", { name: "Clinician" });
  await expect(nav.getByRole("link")).toHaveText([
    "Overview",
    "Schedule",
    "Patients",
    /Review queue/,
    /Messages/,
  ]);
  await expect(nav.getByRole("link", { name: /^Overview/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const totals = await page.evaluate(async () => {
    const tasks = await (await fetch("/api/review-tasks?status=active&limit=1")).json();
    const conv = await (await fetch("/api/conversations?limit=1")).json();
    return { open: tasks.total as number, unread: conv.unreadTotal as number };
  });
  expect(totals.open).toBeGreaterThan(0);
  const named = (label: string, n: number, unit: string) =>
    n > 0 ? new RegExp(`^${label}\\s*,?\\s*${n} ${unit}$`) : new RegExp(`^${label}$`);
  await expect(nav.getByRole("link", { name: /^Review queue/ })).toHaveAccessibleName(
    named("Review queue", totals.open, "open"),
  );
  await expect(nav.getByRole("link", { name: /^Messages/ })).toHaveAccessibleName(
    named("Messages", totals.unread, "unread"),
  );
  // The queue page states the same total.
  await nav.getByRole("link", { name: /^Review queue/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Review queue" })).toBeVisible();
  await expect(page.locator("main")).toContainText(String(totals.open));

  if (mobile) {
    // Below 768 the navigation is the bottom bar and the page title starts near the top (audit: 280 px).
    const box = (await nav.boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(page.viewportSize()!.height - 4);
    const h1 = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    expect(h1.y).toBeLessThan(200);
  }
  await expect(page.getByRole("banner").getByRole("button", { name: "Sign out" })).toBeVisible();
  await expectNoSeriousViolations(page, "/review-queue");
});

test("clinician keyboard pass: skip link, then the navigation by Tab and Enter", async ({
  page,
}) => {
  await signInWithForm(page, accounts.physical_therapist.email);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await focusDocumentStart(page);
  const target = page
    .getByRole("navigation", { name: "Clinician" })
    .getByRole("link", { name: "Schedule" });
  for (let i = 0; i < 120 && !(await target.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
    expect(await focusedIsUnobscured(page)).toBeNull();
  }
  await expect(target).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible();
});

test("admin shell: no navigation landmark for one destination, identity and sign-out in the banner", async ({
  page,
}) => {
  await signInWithForm(page, accounts.clinic_admin.email);
  await expect(page.getByRole("heading", { level: 1, name: "Patients" })).toBeVisible();
  await expectLandmarks(page, "/admin/patients", 0);
  await expectShellTargets(page, "/admin/patients");
  await expectSkipLinkFirst(page, "/admin/patients");
  const session = await page.evaluate(async () => (await fetch("/api/auth/session")).json());
  await expect(page.getByRole("banner")).toContainText(session.user.displayName);
  await expect(page.getByRole("banner")).toContainText("Clinic administrator");
  await expectNoSeriousViolations(page, "/admin/patients");
});
