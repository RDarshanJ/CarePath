import { mkdirSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  accounts,
  expect,
  expectNoSeriousViolations,
  shellEntry,
  signInWithForm,
  test,
  type RoleName,
} from "./fixtures";

/**
 * WP 3.2a gate: each of the four demo roles signs in, lands in its own shell, is refused the other
 * shells, and signs out. axe runs on every page visited. With SCREENSHOT_DIR set, the sign-in page and
 * each shell are also saved at the project's width.
 */
const shots = process.env["SCREENSHOT_DIR"];
const roles = Object.keys(accounts) as RoleName[];

async function shot(page: Page, name: string, width: number) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}-${width}.png`, fullPage: true });
}

test("sign-in page: structure, notices and axe", async ({ page }, info) => {
  const width = info.project.use.viewport!.width;
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  await expect(
    page.getByText("Demonstration product. Synthetic data. Not for clinical use."),
  ).toBeVisible();
  for (const label of [
    "Patient",
    "Physical therapist",
    "Care coordinator",
    "Clinic administrator",
  ]) {
    await expect(
      page.getByRole("button", { name: new RegExp(`Sign in as ${label}`) }),
    ).toBeVisible();
  }
  await expectNoSeriousViolations(page, "/login");
  await shot(page, "signin", width);

  await page.goto("/login?reason=expired&next=%2Ftoday");
  await expect(page.getByText("Your session ended")).toBeVisible();
  await expectNoSeriousViolations(page, "/login?reason=expired");
});

test("wrong password is refused with a plain message and no session", async ({ page }) => {
  await signInWithForm(page, accounts.patient.email, "not-the-password");
  await expect(
    page.getByText("Email or password is incorrect. Check both and try again."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expectNoSeriousViolations(page, "/login with error");
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login\?reason=required&next=%2Ftoday/);
});

test("signed-out visitors are sent to sign-in with their return path", async ({ page }) => {
  for (const path of ["/today", "/overview", "/admin", "/patients"]) {
    await page.goto(path);
    await expect(page).toHaveURL(
      new RegExp(`/login\\?reason=required&next=${encodeURIComponent(path)}`),
    );
  }
});

for (const role of roles) {
  const account = accounts[role];

  test(`${role}: signs in, stays in its own shell, is refused the others, signs out`, async ({
    page,
  }, info) => {
    const width = info.project.use.viewport!.width;
    await signInWithForm(page, account.email);
    await expect(page).toHaveURL(new RegExp(`${account.home}$`));
    await expect(
      page.getByText("Demonstration product. Synthetic data. Not for clinical use."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoSeriousViolations(page, `${role} home ${account.home}`);
    await shot(page, `${account.shell}-${role}`, width);

    // Navigation: the four patient destinations.
    if (account.shell === "patient") {
      const nav = page.getByRole("navigation", { name: "Patient" });
      await expect(nav.getByRole("link")).toHaveText([
        "Today",
        "Progress",
        "Appointments",
        /Messages/,
      ]);
      await nav.getByRole("link", { name: "Progress" }).click();
      await expect(page).toHaveURL(/\/progress$/);
      await expect(nav.getByRole("link", { name: "Progress" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expectNoSeriousViolations(page, "/progress");
      await shot(page, "patient-progress", width);
    }
    if (account.shell === "clinician") {
      const nav = page.getByRole("navigation", { name: "Clinician" });
      await expect(nav.getByRole("link")).toHaveText([
        "Overview",
        "Patients",
        "Schedule",
        /^Messages/,
        "Review queue",
      ]);
      for (const [name, url] of [
        ["Patients", /\/patients$/],
        ["Review queue", /\/review-queue$/],
      ] as const) {
        await nav.getByRole("link", { name }).click();
        await expect(page).toHaveURL(url);
        await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
        await expectNoSeriousViolations(page, name);
      }
      await shot(page, "clinician-review-queue", width);
      await page.goto(account.home);
    }
    if (account.shell === "admin") {
      const nav = page.getByRole("navigation", { name: "Administration" });
      await expect(nav.getByRole("link")).toHaveText(["Patients"]);
      await expect(page.getByRole("heading", { level: 1, name: "Patients" })).toBeVisible();
    }

    // Every other shell is refused: the visitor is redirected to their own home.
    for (const [shell, entry] of Object.entries(shellEntry)) {
      if (shell === account.shell) continue;
      await page.goto(entry);
      await expect(page).toHaveURL(new RegExp(`${account.home}$`));
    }
    // The API refuses too, whatever the web does: a patient may not read the role matrix.
    const status = await page.evaluate(async () => (await fetch("/api/roles")).status);
    expect(status).toBe(role === "clinic_admin" ? 200 : 403);

    // Sign out ends the session on the API and returns to sign-in.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login\?reason=signed-out$/);
    await expect(page.getByText("You are signed out")).toBeVisible();
    await expectNoSeriousViolations(page, "/login after sign-out");
    await page.goto(account.home);
    await expect(page).toHaveURL(/\/login\?reason=required/);
    const after = await page.evaluate(async () => (await fetch("/api/auth/session")).status);
    expect(after).toBe(401);
  });

  test(`${role}: demo mode button signs in with a real session`, async ({ page }) => {
    await page.goto("/login");
    const label = {
      patient: "Patient",
      physical_therapist: "Physical therapist",
      care_coordinator: "Care coordinator",
      clinic_admin: "Clinic administrator",
    }[role];
    await page.getByRole("button", { name: new RegExp(`Sign in as ${label}`) }).click();
    await expect(page).toHaveURL(new RegExp(`${account.home}$`));
    const session = await page.evaluate(async () => (await fetch("/api/auth/session")).json());
    expect(session.role).toBe(role);
    expect(session.user.email).toBe(account.email);
  });
}

test("a return path is honoured when the role may use it, and ignored when it may not", async ({
  page,
}) => {
  await page.goto("/login?reason=required&next=%2Fprogress");
  await page.getByLabel(/^Email/).fill(accounts.patient.email);
  await page.getByLabel(/^Password/).fill("CarePath-Demo-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/progress$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/signed-out/);

  // An off-site return path is dropped, so sign-in lands on the role home.
  await page.goto("/login?reason=required&next=%2F%2Fevil.example");
  await page.getByLabel(/^Email/).fill(accounts.patient.email);
  await page.getByLabel(/^Password/).fill("CarePath-Demo-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/today$/);
});

test("signing out after the session already ended still lands on sign-in", async ({
  page,
  context,
}) => {
  await signInWithForm(page, accounts.patient.email);
  await expect(page).toHaveURL(/\/today$/);
  await context.clearCookies();
  // The shell is already on screen but the session is gone; sign-out treats that as done.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?reason=signed-out$/);
});
