import type { Page, TestInfo } from "@playwright/test";
import { findBannedDiagnosticTerms } from "@carepath/shared";
import { expect, signInWithForm, test } from "./fixtures";
import { cont, fillBirthDate, type NewPatient } from "./onboarding-helpers";
import {
  expectNoHorizontalOverflow,
  expectNoSeriousViolations,
  mainText,
  personas,
  radio,
  shots,
  tabTo,
} from "./patient-helpers";

/**
 * D-WP-8: onboarding (A1, DR-002 A, DR-004 5.2) and Sharing and consent (CD-140 to CD-145), against the
 * real API. The onboarding flow runs at 390 by 844; the consent screen runs at both widths.
 */
const isMobile = (info: TestInfo) => info.project.name === "mobile-390";

async function api<T = unknown>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (p) => (await fetch(`/api${p}`)).json(), path);
}

const casey: NewPatient = {
  first: "Casey",
  last: "Morgan",
  email: "casey.morgan.onboarding@carepath.test",
  password: "a long enough passphrase 2026",
  code: "CAREPATH-1-START-1",
  goal: "Walk to the corner shop without stopping to rest.",
  phone: "(555) 555-0142",
};

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  try {
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 900);
    console.log(`FAILED ${info.title}\n  url: ${page.url()}\n  page: ${text}`);
  } catch {
    // The page may already be closed.
  }
});

test.describe("Onboarding", () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, info) => {
    test.skip(!isMobile(info), "Onboarding runs at 390 by 844");
  });

  test("a new patient completes all 11 steps, with errors, resume and consent", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    const progress = page.getByRole("progressbar", { name: "Onboarding progress" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Your eligibility code" }),
    ).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuetext", "Step 1 of 11");
    // The length and the safe stopping point are said before anything is asked.
    await expect(
      page.getByText(/About 10 minutes\. Steps 1 and 2 create your account/),
    ).toBeVisible();
    await expect(page.getByText(/every step you finish is saved/)).toBeVisible();
    await shots(page, "o01-code");

    // Failed step: summary takes focus, errors are linked to their fields (AC-A6).
    await cont(page);
    const summary = page.getByRole("alert").filter({ hasText: "to fix" });
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("2 things to fix");
    await expect(page.getByLabel(/^Eligibility code/)).toHaveAttribute("aria-invalid", "true");
    await shots(page, "o01b-code-errors");
    await expectNoSeriousViolations(page, "onboarding code with errors");
    await summary.getByRole("link", { name: /Enter your date of birth/ }).click();
    await expect(page.getByLabel("Day", { exact: true })).toBeFocused();

    await page.getByLabel(/^Eligibility code/).fill(casey.code);
    await fillBirthDate(page, "31", "February", "1991");
    await cont(page);
    await expect(page.getByText("must be a real date").first()).toBeVisible();
    await fillBirthDate(page, "2", "June", "1991");
    await expectNoSeriousViolations(page, "onboarding code");
    await cont(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeFocused();
    await expect(progress).toHaveAttribute("aria-valuetext", "Step 2 of 11");
    await page.getByLabel(/^First name/).fill(casey.first);
    await page.getByLabel(/^Last name/).fill(casey.last);
    await page.getByLabel(/^Email/).fill(casey.email);
    await page.getByLabel(/^Create a password/).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "at least 12" }).first()).toBeVisible();
    await shots(page, "o02b-account-errors");
    await page.getByLabel(/^Create a password/).fill(casey.password);
    await shots(page, "o02-account");
    await expectNoSeriousViolations(page, "onboarding account");

    // Back keeps what was typed.
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel(/^Eligibility code/)).toHaveValue(casey.code);
    await expect(page.getByLabel("Year", { exact: true })).toHaveValue("1991");
    await cont(page);
    await expect(page.getByLabel(/^Email/)).toHaveValue(casey.email);

    // A used, expired or unknown code is refused, creates nothing and returns to step 1 (AC-A3).
    await page.getByRole("button", { name: "Back" }).click();
    for (const bad of ["CAREPATH-1-USED", "CAREPATH-1-EXPIRED", "NOT-A-CODE"]) {
      await page.getByLabel(/^Eligibility code/).fill(bad);
      await cont(page);
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Your eligibility code" }),
      ).toBeVisible();
      await expect(page.getByText("This code was not accepted").first()).toBeVisible();
      await expect(page.getByLabel(/^Eligibility code/)).toHaveAttribute("aria-invalid", "true");
      const status = await page.evaluate(async () => (await fetch("/api/auth/session")).status);
      expect(status).toBe(401);
    }
    await shots(page, "o01c-code-rejected");
    await expectNoSeriousViolations(page, "onboarding code rejected");
    // A pasted code with spaces and lower case works, and the email and name were kept.
    await page.getByLabel(/^Eligibility code/).fill("  carepath-1-start-1 ");
    await cont(page);
    await expect(page.getByLabel(/^Email/)).toHaveValue(casey.email);
    await page.getByLabel(/^Create a password/).fill(casey.password);
    await page.getByRole("button", { name: "Create account" }).click();

    // Step 3: saved on Continue, with a polite status that names the step.
    await expect(page.getByRole("heading", { level: 1, name: "About you" })).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuetext", "Step 3 of 11");
    await expect(page.getByText("Casey Morgan")).toBeVisible();
    await expect(page.getByText("Your account is created.")).toBeVisible();
    await shots(page, "o03-about-you");
    await expectNoSeriousViolations(page, "onboarding about you");
    await page.getByLabel(/^Phone number/).fill("call me");
    await cont(page);
    await expect(page.getByRole("alert").filter({ hasText: "digits" }).first()).toBeVisible();
    await page.getByLabel(/^Phone number/).fill(casey.phone);
    await cont(page);

    await expect(page.getByRole("heading", { level: 1, name: "Your goal" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Saved: About you" })).toBeVisible();
    await shots(page, "o04-goal");
    await page.getByLabel(/^What would you like/).fill(casey.goal);
    await expectNoSeriousViolations(page, "onboarding goal");
    await cont(page);

    // Resume (AC-A1): reload and the summary shows what is saved and where to go on.
    await expect(
      page.getByRole("heading", { level: 1, name: "Where it bothers you" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await expect(
      page.getByText("You are on step 5 of 11. Your earlier answers are saved."),
    ).toBeVisible();
    const list = page.getByRole("list", { name: "Your steps" });
    await expect(list.getByRole("listitem").filter({ hasText: "Your goal" })).toContainText("Done");
    await expect(
      list.getByRole("listitem").filter({ hasText: "Where it bothers you" }),
    ).toContainText("Next");
    await expect(list.getByRole("listitem").filter({ hasText: "Review and send" })).toContainText(
      "Not started",
    );
    await shots(page, "o00-resume");
    await expectNoSeriousViolations(page, "onboarding resume summary");
    await page.getByRole("button", { name: "Change Your goal" }).click();
    await expect(page.getByLabel(/^What would you like/)).toHaveValue(casey.goal);
    await page.getByRole("button", { name: "Save and return to summary" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 5: two errors, then plain radios, no picture.
    await cont(page);
    await expect(page.getByRole("alert").filter({ hasText: "to fix" })).toContainText(
      "2 things to fix",
    );
    await shots(page, "o05b-body-errors");
    await page.getByRole("radio", { name: "Lower back", exact: true }).click();
    await page.getByRole("radio", { name: "Left side" }).click();
    expect(await page.getByRole("img").count()).toBe(0);
    await shots(page, "o05-body-area");
    await expectNoSeriousViolations(page, "onboarding body area");
    await cont(page);

    // Step 6: pain is a radio group with anchors, never a slider, and no band word.
    await expect(
      page.getByRole("heading", { level: 1, name: "Pain right now and this week" }),
    ).toBeVisible();
    expect(await page.locator('input[type="range"], [role="slider"]').count()).toBe(0);
    await expect(page.getByText("0 No pain").first()).toBeVisible();
    await expect(page.getByText("10 Worst pain imaginable").first()).toBeVisible();
    await cont(page);
    await expect(page.getByRole("alert").filter({ hasText: "to fix" })).toContainText(
      "3 things to fix",
    );
    await radio(page, "At its worst in the last week?", "3 of 10").click();
    await radio(page, "At its best in the last week?", "7 of 10").click();
    await radio(page, "How much does it hurt right now?", "4 of 10").click();
    await cont(page);
    await expect(
      page.getByText("The best number cannot be higher than the worst").first(),
    ).toBeVisible();
    await shots(page, "o06b-pain-error");
    await radio(page, "At its worst in the last week?", "8 of 10").click();
    expect(await mainText(page)).not.toMatch(/\b(mild|moderate|severe)\b/i);
    await shots(page, "o06-pain");
    await expectNoSeriousViolations(page, "onboarding pain");
    await cont(page);

    // Step 7: a checkbox group where "None of these" is exclusive.
    await expect(
      page.getByRole("heading", { level: 1, name: "What is hard right now" }),
    ).toBeVisible();
    const walking = page.getByRole("checkbox", { name: "Walking" });
    const none = page.getByRole("checkbox", { name: "None of these" });
    await walking.click();
    await page.getByRole("checkbox", { name: "Using stairs" }).click();
    await none.click();
    await expect(none).toBeChecked();
    await expect(walking).not.toBeChecked();
    await walking.click();
    await expect(none).not.toBeChecked();
    await page.getByRole("checkbox", { name: "Using stairs" }).click();
    await shots(page, "o07-limitations");
    await expectNoSeriousViolations(page, "onboarding limitations");
    await cont(page);

    await expect(page.getByRole("heading", { level: 1, name: "Your therapist" })).toBeVisible();
    await shots(page, "o08-preferences");
    await expectNoSeriousViolations(page, "onboarding preferences");
    await cont(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "When you can come in" }),
    ).toBeVisible();
    await cont(page);
    await expect(page.getByRole("alert").filter({ hasText: "to fix" })).toContainText(
      "2 things to fix",
    );
    await page.getByRole("checkbox", { name: "Monday" }).click();
    await page.getByRole("checkbox", { name: "Wednesday" }).click();
    await page.getByRole("checkbox", { name: "Morning" }).click();
    await shots(page, "o09-availability");
    await expectNoSeriousViolations(page, "onboarding availability");
    await cont(page);

    // Step 10 (CD-142): required is an unticked checkbox, optional is a Yes or No pair with no preselect.
    await expect(
      page.getByRole("heading", { level: 1, name: "Sharing and consent" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /I agree to treatment and data use/ }),
    ).not.toBeChecked();
    const yes = page.getByRole("radio", { name: "Yes, allow automated drafting tools" });
    const no = page.getByRole("radio", { name: "No, do not allow them" });
    await expect(yes).toHaveAttribute("aria-checked", "false");
    await expect(no).toHaveAttribute("aria-checked", "false");
    expect(await page.getByRole("switch").count()).toBe(0);
    await expect(page.getByText("Required", { exact: true })).toBeVisible();
    await expect(page.getByText("Optional", { exact: true }).first()).toBeVisible();
    // The motion tracking consent is not offered (C3 item 5).
    await expect(page.getByText(/camera/i)).toHaveCount(0);
    await expect(page.getByText(/If you do not agree, you can stop here/)).toBeVisible();
    await page.getByText("Read the full wording").first().click();
    await expect(
      page.getByText(/Demonstration wording|This is demonstration wording/).first(),
    ).toBeVisible();
    await cont(page);
    await expect(page.getByRole("alert").filter({ hasText: "to fix" })).toContainText(
      "2 things to fix",
    );
    await shots(page, "o10b-consent-errors");
    await page.getByRole("checkbox", { name: /I agree to treatment and data use/ }).click();
    await yes.click();
    await shots(page, "o10-consent");
    await expectNoSeriousViolations(page, "onboarding consent");
    await cont(page);

    // Step 11: review, change and return, then send.
    await expect(page.getByRole("heading", { level: 1, name: "Review and send" })).toBeVisible();
    await expect(page.getByText("Walk to the corner shop")).toBeVisible();
    expect(findBannedDiagnosticTerms(await mainText(page))).toEqual([]);
    await page.getByRole("button", { name: "Send to the clinic" }).click();
    await expect(page.getByText("Tick the box to confirm").first()).toBeVisible();
    await shots(page, "o11b-review-error");
    await page.getByRole("button", { name: "Change Your goal" }).click();
    await page
      .getByLabel(/^What would you like/)
      .fill("Walk to the corner shop and back without resting.");
    await page.getByRole("button", { name: "Save and return to review" }).click();
    await expect(page.getByText("and back without resting")).toBeVisible();
    await shots(page, "o11-review");
    await expectNoSeriousViolations(page, "onboarding review");
    await page.getByRole("checkbox", { name: "These answers are right." }).click();
    await page.getByRole("button", { name: "Send to the clinic" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Your details are with the clinic" }),
    ).toBeVisible();
    await shots(page, "o12-done");
    await expectNoSeriousViolations(page, "onboarding done");

    // Stored: submitted; the required consent is active, the optional one allowed as chosen (AC-A2).
    const id = (await api<{ patientId: string }>(page, "/auth/session")).patientId;
    const intake = await api<{ status: string; missing: string[] }>(page, `/patients/${id}/intake`);
    expect(intake.status).toBe("submitted");
    expect(intake.missing).toEqual([]);
    const consents = await api<{ types: { type: string; active: unknown }[] }>(
      page,
      `/patients/${id}/consents`,
    );
    expect(consents.types.find((t) => t.type === "treatment_and_data_use")?.active).toBeTruthy();
    expect(consents.types.find((t) => t.type === "ai_assisted_features")?.active).toBeTruthy();
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/today$/);
  });

  test("a reload on the account step warns first and nothing is stored in the browser", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/^Eligibility code/).click();
    await page.getByLabel(/^Eligibility code/).fill(casey.code);
    await fillBirthDate(page, "2", "June", "1991");
    await cont(page);
    await page.getByLabel(/^First name/).click();
    await page.getByLabel(/^First name/).fill(casey.first);
    await page.getByLabel(/^Last name/).fill(casey.last);
    await page.getByLabel(/^Email/).fill(casey.email);
    await page.getByLabel(/^Create a password/).fill(casey.password);

    const storage = () =>
      page.evaluate(() => ({
        local: Object.keys(window.localStorage),
        session: Object.keys(window.sessionStorage),
        cookies: document.cookie,
      }));
    const before = await storage();
    expect(before.local).toEqual([]);
    expect(before.session).toEqual([]);

    // The reload is stopped by the browser's own confirmation. Declining it keeps the page as it is.
    const dialogs: string[] = [];
    page.once("dialog", (d) => {
      dialogs.push(d.type());
      void d.dismiss();
    });
    void page.evaluate(() => window.location.reload());
    await expect.poll(() => dialogs).toEqual(["beforeunload"]);
    await expect(page.getByLabel(/^Email/)).toHaveValue(casey.email);

    // Following an in-app link asks first too, and staying changes nothing.
    await page.getByRole("link", { name: "Sign in" }).click();
    const leave = page.getByRole("alertdialog", { name: "Leave without saving?" });
    await expect(leave).toBeVisible();
    await leave.getByRole("button", { name: "Stay on this page" }).click();
    await expect(page.getByLabel(/^Email/)).toHaveValue(casey.email);

    const after = await storage();
    expect(after.local).toEqual([]);
    expect(after.session).toEqual([]);
    expect(JSON.stringify(after)).not.toContain(casey.email);
    expect(JSON.stringify(after)).not.toContain(casey.password);
  });

  test("steps 1 and 2 work by keyboard alone", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/^Eligibility code/).focus();
    await page.keyboard.type(casey.code);
    await page.keyboard.press("Tab");
    await page.keyboard.type("2");
    await page.keyboard.press("Tab");
    await page.keyboard.type("June");
    await page.keyboard.press("Tab");
    await page.keyboard.type("1991");
    await tabTo(page, "Continue");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.type(casey.first);
    await page.keyboard.press("Tab");
    await page.keyboard.type(casey.last);
    await page.keyboard.press("Tab");
    await page.keyboard.type(casey.email);
    await page.keyboard.press("Tab");
    await page.keyboard.type("short");
    await tabTo(page, "Create account");
    await page.keyboard.press("Enter");
    const summary = page.getByRole("alert").filter({ hasText: "to fix" });
    await expect(summary).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel(/^Create a password/)).toBeFocused();
  });

  test("a returning patient sees the summary and resumes at the first open step", async ({
    page,
  }) => {
    await signInWithForm(page, personas.intake);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Onboarding progress" })).toHaveAttribute(
      "aria-valuetext",
      /Step \d+ of 11/,
    );
    await expectNoHorizontalOverflow(page, "onboarding resume");
    await shots(page, "o14-resume-intake");
    await expectNoSeriousViolations(page, "onboarding resume");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Pain right now and this week" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Where it bothers you" }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { checked: true }).first()).toBeVisible();
    await page.goto("/today");
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("a signed-out visitor can open onboarding and nothing else in the patient app", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expectNoHorizontalOverflow(page, "onboarding");
    for (const path of ["/today", "/progress", "/plan", "/consent", "/check-in", "/session"]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`/login\\?reason=required&next=${encodeURIComponent(path)}`),
      );
    }
  });
});

test.describe("Sharing and consent", () => {
  test("explicit Allow and Stop allowing, with a result line and history, and no switch", async ({
    page,
  }, info) => {
    const wide = !isMobile(info);
    await signInWithForm(page, personas.noai);
    await page.getByRole("link", { name: "Sharing and consent", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sharing and consent" }),
    ).toBeVisible();
    expect(await page.getByRole("switch").count()).toBe(0);
    await expect(page.getByText(/^Agreed on /)).toBeVisible();
    await expect(page.getByText("Not allowed", { exact: true })).toBeVisible();
    await expect(page.getByText(/camera/i)).toHaveCount(0);
    await expect(page.getByText(/Not available yet/)).toHaveCount(0);
    // The required consent is withdrawn through the clinic: a call and a message.
    await expect(page.getByRole("link", { name: /^Call / })).toHaveAttribute("href", /^tel:/);
    await expect(page.getByRole("link", { name: "Message your care team" })).toHaveAttribute(
      "href",
      "/messages",
    );
    await expectNoHorizontalOverflow(page, "consent");
    await shots(page, "o20-consent");
    await expectNoSeriousViolations(page, "consent");

    const allow = page.getByRole("button", { name: "Allow automated drafting tools" });
    await allow.click();
    await expect(page.getByRole("status").filter({ hasText: "are now allowed" })).toContainText(
      "Saved",
    );
    await expect(page.getByText(/^Allowed since /)).toBeVisible();
    await shots(page, "o21-consent-allowed");
    const stop = page.getByRole("button", { name: "Stop allowing automated drafting tools" });
    await expect(stop).toBeVisible();
    await stop.click();
    await expect(
      page.getByRole("status").filter({ hasText: "are no longer allowed" }),
    ).toBeVisible();
    await expect(page.getByText("Not allowed", { exact: true })).toBeVisible();

    // History: one line per change, in words, with the wording version.
    const history = wide
      ? page.getByRole("table", { name: /Consent history/ })
      : page.getByRole("list", { name: /Consent history/ });
    await expect(history).toContainText("Stopped allowing");
    await expect(history).toContainText("Allowed");
    await expect(history).toContainText("Agreed");
    await expect(history).toContainText("2026-11-01");
    await history.scrollIntoViewIfNeeded();
    await shots(page, "o22-consent-history");
    await expectNoSeriousViolations(page, "consent history");
  });
});
