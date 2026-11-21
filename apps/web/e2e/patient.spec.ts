import type { Page, TestInfo } from "@playwright/test";
import {
  EMERGENCY_NOTICE,
  EXERCISE_CONTENT_NOTICE,
  findBannedDiagnosticTerms,
} from "@carepath/shared";
import { expect, signInWithForm, test } from "./fixtures";
import {
  expectNoHorizontalOverflow,
  expectNoSeriousViolations,
  mainText,
  personas,
  radio,
  shots,
  arrow,
  finishExercise,
  tabTo,
} from "./patient-helpers";

/**
 * WP 3.2b gate: the patient experience end to end against the real API.
 *  - Scenario A (onboarding) and Scenario C (guided session) at 390 by 844, with screenshots of each
 *    screen at 390 and 1440.
 *  - A keyboard-only pass of the session flow, 200 percent zoom on Today, reload resume.
 *  - A 1440 smoke of the read-only patient screens.
 * axe (wcag2a, 2aa, 21a, 21aa, 22aa) runs on every screen and fails on serious or critical findings.
 */
const isMobile = (info: TestInfo) => info.project.name === "mobile-390";

/** When a test fails, print where the page was and what it said, so the failure can be read from the log. */
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  try {
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 900);
    console.log(`FAILED ${info.title}\n  url: ${page.url()}\n  page: ${text}`);
  } catch {
    // The page may already be closed.
  }
});

async function api<T = unknown>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (p) => (await fetch(`/api${p}`)).json(), path);
}
async function patientIdOf(page: Page): Promise<string> {
  return (await api<{ patientId: string }>(page, "/auth/session")).patientId;
}

test.describe("Scenario A: onboarding", () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, info) => {
    test.skip(!isMobile(info), "Scenario A runs at 390 by 844; the 1440 smoke is separate");
  });

  test("a new patient completes onboarding with a code, with resume, validation and consent", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    const progress = page.getByRole("progressbar", { name: "Onboarding progress" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuetext", "Step 1 of 11");
    await expect(page.getByText("Step 1 of 11")).toBeVisible();
    await shots(page, "a01-account");

    // Validation: errors linked to their fields and announced in a live region (AC-A6).
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    const summary = page.getByRole("alert").filter({ hasText: "to fix" });
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    const first = page.getByLabel(/^First name/);
    await expect(first).toHaveAttribute("aria-invalid", "true");
    const describedBy = await first.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy!.split(" ").pop()}"]`)).toContainText(
      "Enter your first name",
    );
    await shots(page, "a01b-account-errors");
    await expectNoSeriousViolations(page, "onboarding account with errors");

    // Credentials accept paste: no paste handler blocks the fields.
    await page.getByLabel(/^First name/).fill("Casey");
    await page.getByLabel(/^Last name/).fill("Morgan");
    await page.getByLabel(/^Email/).fill("casey.morgan.onboarding@carepath.test");
    await page.getByLabel(/^Password/).fill("short");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "at least 12" }).first()).toBeVisible();
    await page.getByLabel(/^Password/).fill("a long enough passphrase 2026");
    await expectNoSeriousViolations(page, "onboarding account");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Your eligibility code" }),
    ).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuetext", "Step 2 of 11");
    // Back keeps what was typed.
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel(/^Email/)).toHaveValue("casey.morgan.onboarding@carepath.test");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // A used or expired code is refused and creates nothing (AC-A3).
    await page.getByLabel(/^Date of birth/).fill("1988-04-12");
    for (const bad of ["CAREPATH-1-USED", "CAREPATH-1-EXPIRED", "NOT-A-CODE"]) {
      await page.getByLabel(/^Eligibility code/).fill(bad);
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page.getByText("This code was not accepted").first()).toBeVisible();
      await expect(page.getByLabel(/^Eligibility code/)).toHaveAttribute("aria-invalid", "true");
      const status = await page.evaluate(async () => (await fetch("/api/auth/session")).status);
      expect(status).toBe(401);
    }
    await shots(page, "a02-code-error");
    await expectNoSeriousViolations(page, "onboarding code with error");

    // A pasted code with spaces and lower case works.
    await page.getByLabel(/^Eligibility code/).fill("  carepath-1-start-1 ");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "About you" })).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuetext", "Step 3 of 11");
    await expect(page.getByText("Casey Morgan")).toBeVisible();
    await shots(page, "a03-about-you");
    await page.getByLabel(/^Phone number/).fill("(555) 555-0142");
    await page.getByLabel(/^Phone number/).fill("call me");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "digits" }).first()).toBeVisible();
    await page.getByLabel(/^Phone number/).fill("(555) 555-0142");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Your goal" })).toBeVisible();
    await shots(page, "a04-goal");
    await page
      .getByLabel(/^What would you like/)
      .fill("Walk to the corner shop without stopping to rest.");
    // Autosave: the step is stored without pressing Continue.
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible({
      timeout: 8000,
    });
    await expectNoSeriousViolations(page, "onboarding goal");

    // Resume (AC-A1): reload, and the flow opens at the first step still open, with the goal intact.
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Where it bothers you" }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Onboarding progress" })).toHaveAttribute(
      "aria-valuetext",
      "Step 5 of 11",
    );
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel(/^What would you like/)).toHaveValue(
      "Walk to the corner shop without stopping to rest.",
    );
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "to fix" })).toContainText(
      "2 things to fix",
    );
    await page.getByRole("radio", { name: "Lower back", exact: true }).click();
    await page.getByRole("radio", { name: "Left side" }).click();
    await shots(page, "a05-body-area");
    await expectNoSeriousViolations(page, "onboarding body area");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Pain is a radio group of buttons, never a slider.
    await expect(
      page.getByRole("heading", { level: 1, name: "Pain right now and this week" }),
    ).toBeVisible();
    expect(await page.locator('input[type="range"], [role="slider"]').count()).toBe(0);
    await radio(page, "At its worst in the last week?", "3 of 10").click();
    await radio(page, "At its best in the last week?", "7 of 10").click();
    await radio(page, "How much does it hurt right now?", "4 of 10").click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByText("The best number cannot be higher than the worst").first(),
    ).toBeVisible();
    await shots(page, "a06-pain-error");
    await radio(page, "At its worst in the last week?", "8 of 10").click();
    await expectNoSeriousViolations(page, "onboarding pain");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "What is hard right now" }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: "Walking" }).click();
    await page.getByRole("checkbox", { name: "Using stairs" }).click();
    await shots(page, "a07-limitations");
    await expectNoSeriousViolations(page, "onboarding limitations");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Your therapist" })).toBeVisible();
    await shots(page, "a08-preferences");
    await expectNoSeriousViolations(page, "onboarding preferences");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "When you can come in" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "to fix" })).toContainText(
      "2 things to fix",
    );
    await page.getByRole("checkbox", { name: "Monday" }).click();
    await page.getByRole("checkbox", { name: "Wednesday" }).click();
    await page.getByRole("checkbox", { name: "Morning" }).click();
    await shots(page, "a09-availability");
    await expectNoSeriousViolations(page, "onboarding availability");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Consent: required and optional are separate; the optional one is off by default (AC-A8).
    await expect(
      page.getByRole("heading", { level: 1, name: "Sharing and consent" }),
    ).toBeVisible();
    await expect(page.getByText("Required", { exact: true })).toBeVisible();
    await expect(page.getByText("Optional", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Allow automated drafting tools" }),
    ).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Sharing and consent, in the footer")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Tick the box to agree").first()).toBeVisible();
    await shots(page, "a10-consent-error");
    await page.getByRole("checkbox", { name: /I agree to treatment and data use/ }).click();
    await shots(page, "a10b-consent");
    await expectNoSeriousViolations(page, "onboarding consent");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Review: no banned diagnostic term in the screen's own copy (AC-A9).
    await expect(page.getByRole("heading", { level: 1, name: "Review and send" })).toBeVisible();
    await expect(page.getByText("Walk to the corner shop")).toBeVisible();
    const copy = await mainText(page);
    expect(findBannedDiagnosticTerms(copy)).toEqual([]);
    await page.getByRole("button", { name: "Send to the clinic" }).click();
    await expect(page.getByText("Tick the box to confirm").first()).toBeVisible();
    await shots(page, "a11-review");
    await expectNoSeriousViolations(page, "onboarding review");
    // Change goes back to one step and returns to review.
    await page.getByRole("button", { name: "Change Your goal" }).click();
    await page
      .getByLabel(/^What would you like/)
      .fill("Walk to the corner shop and back without resting.");
    await page.getByRole("button", { name: "Save and return to review" }).click();
    await expect(page.getByText("and back without resting")).toBeVisible();
    await page.getByRole("checkbox", { name: "These answers are right." }).click();
    await page.getByRole("button", { name: "Send to the clinic" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Your details are with the clinic" }),
    ).toBeVisible();
    await shots(page, "a12-done");
    await expectNoSeriousViolations(page, "onboarding done");

    // The stored state: submitted, with the required consent active and the optional one off (AC-A2).
    const id = await patientIdOf(page);
    const intake = await api<{ status: string; missing: string[] }>(page, `/patients/${id}/intake`);
    expect(intake.status).toBe("submitted");
    expect(intake.missing).toEqual([]);

    await page.getByRole("link", { name: "Go to Today" }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Your details are with the clinic" }),
    ).toBeVisible();
    await shots(page, "a13-today-awaiting");
    await expectNoSeriousViolations(page, "today awaiting assignment");
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/today$/);

    await page.getByRole("link", { name: "Sharing and consent", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sharing and consent" }),
    ).toBeVisible();
    await expect(page.getByText(/On\. Agreed/)).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Allow automated drafting tools" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  test("a returning patient resumes at the first open step with earlier steps intact", async ({
    page,
  }) => {
    await signInWithForm(page, personas.intake);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Pain right now and this week" }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Onboarding progress" })).toHaveAttribute(
      "aria-valuetext",
      /Step \d+ of 11/,
    );
    await shots(page, "a14-resume-pain");
    await expectNoSeriousViolations(page, "onboarding resume");
    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Where it bothers you" }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { checked: true }).first()).toBeVisible();
    await page.goto("/today");
    await expect(page).toHaveURL(/\/onboarding$/);
  });
});

test.describe("Scenario C: guided session", () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, info) => {
    test.skip(!isMobile(info), "Scenario C runs at 390 by 844; the 1440 smoke is separate");
  });

  test("Today leads with one action; the session completes, resumes after reload and ends with a check-in", async ({
    page,
  }) => {
    await signInWithForm(page, personas.demo);
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();

    // One primary action, then a plain list in a fixed order (REQ-TOD-01).
    await expect(page.getByRole("link", { name: "Start today's session" })).toHaveCount(1);
    const headings = await page.locator("main h2, main h3").allInnerTexts();
    const order = ["Your plan changed", "Daily check-in", "This week", "Your care plan"];
    const positions = order.map((h) => headings.findIndex((t) => t.includes(h)));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    await expect(page.getByText(/^Note from /)).toBeVisible();
    await expect(
      page.getByText(/^Added:|^Removed:|^Changed:|No exercises were added/).first(),
    ).toBeVisible();
    await shots(page, "c01-today-due");
    await expectNoSeriousViolations(page, "today due");

    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("heading", { name: "Your plan changed" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your plan changed" })).toHaveCount(0);

    await page.getByRole("link", { name: "Start today's session" }).click();
    await expect(page).toHaveURL(/\/session$/);
    await expect(page.getByRole("heading", { level: 1, name: "Today's session" })).toBeVisible();
    await expect(page.getByText(EXERCISE_CONTENT_NOTICE)).toBeVisible();
    await shots(page, "c02-overview");
    await expectNoSeriousViolations(page, "session overview");
    await page.getByRole("button", { name: "Begin session" }).click();
    await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
    const sessionId = page.url().split("/").pop()!;
    const patientId = await patientIdOf(page);

    // Exercise 1: prescribed dose, clinician note, set by set with a rest timer.
    await expect(page.getByText("Exercise 1 of 4")).toBeVisible();
    await expect(page.getByText("Set by your care team", { exact: true })).toBeVisible();
    await expect(page.getByTestId("set-label")).toBeVisible();
    await shots(page, "c03-exercise");
    await expectNoSeriousViolations(page, "exercise");
    const firstLabel = await page.getByRole("button", { name: /^Done with/ }).innerText();
    await page.getByRole("button", { name: /^Done with/ }).click();
    if (/^Done with set 1$/.test(firstLabel)) {
      await expect(page.getByTestId("rest-timer")).toBeVisible();
      await shots(page, "c04-rest");
      await expectNoSeriousViolations(page, "rest timer");
    }
    await finishExercise(page);
    await expect(page.getByText("Exercise 2 of 4")).toBeVisible();

    // Skip needs a reason (AC-C3).
    await page.getByRole("button", { name: "Skip exercise" }).click();
    await expect(page.getByRole("dialog", { name: "Skip this exercise?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Skip exercise" }).click();
    await expect(page.getByRole("dialog").getByText("Choose a reason")).toBeVisible();
    await page.getByRole("radio", { name: "I am too tired today" }).click();
    await shots(page, "c05-skip-sheet", { overlay: true });
    await expectNoSeriousViolations(page, "skip sheet");
    await page.getByRole("dialog").getByRole("button", { name: "Skip exercise" }).click();
    await expect(page.getByText("Exercise 3 of 4")).toBeVisible();

    // Reload resumes at exercise 3 with the first done and the second skipped with its reason (AC-C1, AC-C3).
    await page.reload();
    await expect(page.getByText("Exercise 3 of 4")).toBeVisible();
    const detail = await api<{
      status: string;
      activities: { status: string; skipReason: string | null }[];
    }>(page, `/patients/${patientId}/sessions/${sessionId}`);
    expect(detail.status).toBe("in_progress");
    expect(detail.activities.map((a) => a.status)).toEqual([
      "completed",
      "skipped",
      "pending",
      "pending",
    ]);
    expect(detail.activities[1]!.skipReason).toBe("I am too tired today");
    await expect(page.getByText("Skipped", { exact: true })).toBeVisible();

    // Pause and resume, and a reload while paused keeps it paused.
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Session paused" })).toBeVisible();
    await shots(page, "c06-paused");
    await expectNoSeriousViolations(page, "paused");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Session paused" })).toBeVisible();
    await page.getByRole("button", { name: "Resume session" }).click();
    await expect(page.getByText("Exercise 3 of 4")).toBeVisible();

    await finishExercise(page);
    await expect(page.getByText("Exercise 4 of 4")).toBeVisible();
    await finishExercise(page);
    await expect(page.getByRole("heading", { level: 1, name: "All exercises done" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "All exercises done" })).toBeVisible();
    await shots(page, "c07-finish");
    await page.getByRole("button", { name: "Finish session" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Session complete" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "How did it go?" })).toBeVisible();
    await shots(page, "c08-complete-checkin");
    await expectNoSeriousViolations(page, "session complete with check-in");

    // Check-in: pain is required and is a radio group (AC-C6).
    await page.getByRole("button", { name: "Send check-in" }).click();
    await expect(page.getByText("Choose a pain number from 0 to 10").first()).toBeVisible();
    await radio(page, "How much does it hurt right now?", "3 of 10").click();
    await page.getByRole("radio", { name: "About what I expected" }).click();
    await page.getByRole("button", { name: "Send check-in" }).click();
    await expect(
      page.getByText("Your therapist will see this.", { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByText("You reported pain of 3 out of 10")).toBeVisible();
    await expect(page.getByText(EMERGENCY_NOTICE)).toHaveCount(0);
    await shots(page, "c09-checkin-sent");
    await expectNoSeriousViolations(page, "check-in sent");

    // The page's own "Back to Today" (the header back link of CD-505 has the same name and destination).
    await page.getByRole("main").getByRole("link", { name: "Back to Today" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Done for today" })).toBeVisible();
    await shots(page, "c10-today-done");
    await expectNoSeriousViolations(page, "today done");

    // Progress reads the same rows: the new pain value is labelled Patient-reported and has a table (AC-C2, AC-C7).
    await page
      .getByRole("navigation", { name: "Patient" })
      .getByRole("link", { name: "Progress" })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Patient-reported pain" })).toBeVisible();
    const progressCopy = await mainText(page);
    expect(progressCopy).not.toMatch(/improv/i);
    await shots(page, "c11-progress");
    await expectNoSeriousViolations(page, "progress");
    for (const label of ["weekly sessions", "pain ratings"]) {
      await page.getByRole("button", { name: `Show ${label} as a table` }).click();
    }
    const painTable = page.getByRole("table", { name: /Patient-reported pain by check-in/ });
    await expect(painTable).toBeVisible();
    const progressApi = await api<{
      pain: { points: { painScore: number }[] };
      weeks: { completedSessions: number; assignedSessions: number }[];
    }>(page, `/patients/${patientId}/progress?weeks=4`);
    const shown = await painTable.locator("tbody tr td:nth-child(2)").allInnerTexts();
    expect(shown.map(Number)).toEqual(progressApi.pain.points.map((p) => p.painScore));
    expect(progressApi.pain.points.at(-1)!.painScore).toBe(3);
    const weekTable = page.getByRole("table", { name: /Assigned and completed sessions by week/ });
    const weekRows = await weekTable.locator("tbody tr").count();
    expect(weekRows).toBe(progressApi.weeks.length);
    await shots(page, "c12-progress-tables");
    await expectNoSeriousViolations(page, "progress with tables");
  });

  test("Stop, this hurts ends the session, shows the clinic notice and asks for a pain report", async ({
    page,
  }) => {
    await signInWithForm(page, personas.flare);
    await expect(
      page.getByRole("heading", { level: 2, name: "No session scheduled today" }),
    ).toBeVisible();
    await shots(page, "c13-today-rest-day");
    await expectNoSeriousViolations(page, "today rest day");
    await page.getByRole("link", { name: "Start a session anyway" }).click();
    await page.getByRole("button", { name: "Begin session" }).click();
    await expect(page.getByText(/^Exercise 1 of /)).toBeVisible();
    const sessionId = page.url().split("/").pop()!;
    const patientId = await patientIdOf(page);

    // CR-6: the number is optional at the stop (D-WP-10); here the patient gives one.
    await page.getByRole("button", { name: "Stop, this hurts" }).click();
    await expect(page.getByRole("dialog", { name: "Stop this session?" })).toBeVisible();
    await radio(page.getByRole("dialog"), "How much does it hurt right now?", "8 of 10").click();
    await page
      .getByRole("dialog")
      .getByLabel(/^What happened/)
      .fill("Sharp pain on the left side.");
    await shots(page, "c14-stop-sheet", { overlay: true });
    await expectNoSeriousViolations(page, "stop sheet");
    await page.getByRole("dialog").getByRole("button", { name: "Stop session" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Session stopped" })).toBeVisible();
    await expect(page.getByText("Your therapist will see this.").first()).toBeVisible();
    await expect(
      page.getByText(
        /You reported pain of 8 out of 10\. If you are worried, contact your clinic at \(555\) 555-0110\./,
      ),
    ).toBeVisible();
    await expect(page.getByText(EMERGENCY_NOTICE).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Report your pain" })).toBeVisible();
    await shots(page, "c15-stopped");
    await expectNoSeriousViolations(page, "session stopped");

    const stopped = await api<{ status: string; checkInRequested: boolean }>(
      page,
      `/patients/${patientId}/sessions/${sessionId}`,
    );
    expect(stopped.status).toBe("stopped_discomfort");
    expect(stopped.checkInRequested).toBe(true);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Session stopped" })).toBeVisible();
    await radio(page, "How much does it hurt right now?", "8 of 10").click();
    await page.getByRole("button", { name: "Send check-in" }).click();
    await expect(page.getByRole("heading", { name: "Check-in sent" })).toBeVisible();
    await expect(page.getByText("Your therapist will see this.").first()).toBeVisible();
    // One contact notice per screen (feature D, item 3): the stopped screen already shows it.
    await expect(page.getByText(EMERGENCY_NOTICE)).toHaveCount(1);
    await shots(page, "c16-checkin-high");
    await expectNoSeriousViolations(page, "check-in with pain notice");
  });

  test("the session flow works by keyboard alone", async ({ page }) => {
    await signInWithForm(page, personas.resume);
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByText("Session paused", { exact: true })).toBeVisible();
    // From here no pointer is used. Every action is a Tab to a control and Enter or Space.
    await tabTo(page, "Resume session");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Session paused" })).toBeVisible();
    await tabTo(page, "Resume session");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/^Exercise \d+ of 5$/)).toBeVisible();

    // Skip one exercise with a reason, chosen with the arrow keys.
    await tabTo(page, "Skip exercise");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Skip this exercise?" })).toBeVisible();
    // The reasons are one radio group: a single Tab stop, arrow keys move within it.
    await tabTo(page, /^$/);
    expect(await page.evaluate(() => document.activeElement?.getAttribute("role"))).toBe("radio");
    await arrow(page, "ArrowDown");
    await arrow(page, "ArrowDown");
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
    await tabTo(page, "Skip exercise");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Work through the rest: Done per set, skip the rest timer.
    for (let guard = 0; guard < 40; guard++) {
      if (await page.getByRole("heading", { level: 1, name: "All exercises done" }).isVisible())
        break;
      if (await page.getByRole("button", { name: /^Start exercise \d+$/ }).isVisible()) {
        await tabTo(page, /^Start exercise \d+$/);
        await page.keyboard.press("Enter");
        continue;
      }
      if (await page.getByRole("button", { name: "Skip rest" }).isVisible()) {
        await tabTo(page, "Skip rest");
        await page.keyboard.press("Enter");
        continue;
      }
      await tabTo(page, /^Done with/);
      await page.keyboard.press("Space");
      await page.waitForTimeout(150);
    }
    await expect(page.getByRole("heading", { level: 1, name: "All exercises done" })).toBeFocused();
    await tabTo(page, "Finish session");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Session complete" })).toBeVisible();

    // The pain scale by arrow keys, then send.
    await tabTo(page, /0 of 10|\d+ of 10/);
    for (let i = 0; i < 4; i++) await arrow(page, "ArrowRight");
    await expect(page.getByText(/You chose \d+ of 10/)).toBeVisible();
    await tabTo(page, "Send check-in");
    await page.keyboard.press("Enter");
    // "Your therapist will see this." is also beside the send button (D-WP-10), so wait for the result.
    await expect(page.getByRole("heading", { name: "Check-in sent" })).toBeFocused();
    await expect(page.getByText("Your therapist will see this.").first()).toBeVisible();
    await tabTo(page, "Back to Today");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { level: 2, name: "Done for today" })).toBeVisible();
  });
});

test.describe("read-only screens", () => {
  test("Today at 200 percent zoom keeps its action and does not scroll sideways", async ({
    page,
  }, info) => {
    test.skip(!isMobile(info), "zoom check is for the phone layout");
    await signInWithForm(page, personas.noai);
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    // 200 percent zoom of a 390 px wide screen leaves 195 CSS pixels; this is how reflow is checked.
    await page.setViewportSize({ width: 195, height: 422 });
    await page.waitForTimeout(250);
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Contact care team" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page, "Today at 195 px");
    await expectNoSeriousViolations(page, "today at 200 percent zoom");
    if (process.env["SCREENSHOT_DIR"]) {
      await page.screenshot({
        path: `${process.env["SCREENSHOT_DIR"]}/today-zoom200-390.png`,
        fullPage: true,
      });
    }
    // Text sizes scale with the browser's text size, not fixed pixels.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    await page.waitForTimeout(200);
    await expectNoHorizontalOverflow(page, "Today with 200 percent text");
  });

  test("progress, plan, consent and the contact card, with axe", async ({ page }, info) => {
    const wide = !isMobile(info);
    await signInWithForm(page, personas.noai);
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    await expect(
      page.getByText("Demonstration product. Synthetic data. Not for clinical use."),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Patient" });
    await expect(nav.getByRole("link")).toHaveText([
      "Today",
      "Progress",
      "Appointments",
      /Messages/,
    ]);
    await expectNoHorizontalOverflow(page, "today");
    if (wide) await shots(page, "s01-today");
    await expectNoSeriousViolations(page, "today");
    if (!wide) await shots(page, "c17-today-rest-day-noai");

    await page.getByRole("button", { name: "Contact care team" }).click();
    await expect(page.getByRole("dialog", { name: "Contact your care team" })).toBeVisible();
    await expect(page.getByText(EMERGENCY_NOTICE)).toBeVisible();
    await expect(page.getByRole("link", { name: "(555) 555-0110" })).toBeVisible();
    await shots(page, "s02-contact", { overlay: true });
    await expectNoSeriousViolations(page, "contact care team");
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "View full care plan" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Care plan" })).toBeVisible();
    await expect(page.getByText(EXERCISE_CONTENT_NOTICE)).toBeVisible();
    await expect(page.getByText("Set by your care team").first()).toBeVisible();
    await expectNoHorizontalOverflow(page, "plan");
    await shots(page, "s03-plan");
    await expectNoSeriousViolations(page, "plan");

    await nav.getByRole("link", { name: "Progress" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Patient-reported pain" })).toBeVisible();
    expect(await mainText(page)).not.toMatch(/improv/i);
    await expectNoHorizontalOverflow(page, "progress");
    await shots(page, "s04-progress");
    await expectNoSeriousViolations(page, "progress");

    await page.getByRole("link", { name: "Sharing and consent", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Sharing and consent" }),
    ).toBeVisible();
    await expect(page.getByText(/^On\. Agreed/)).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Allow automated drafting tools" }),
    ).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText(/Not available yet/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page, "consent");
    await shots(page, "s05-consent");
    // The sticky tab bar must not hide a control at rest, so axe sees the switch scrolled into view.
    await page
      .getByRole("switch", { name: "Allow automated drafting tools" })
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expectNoSeriousViolations(page, "consent");

    // The optional consent can be turned on and off, and each change appears in the history.
    const aiSwitch = page.getByRole("switch", { name: "Allow automated drafting tools" });
    await aiSwitch.click();
    await expect(page.getByText("Automated drafting tools are now on.")).toBeVisible();
    await expect(aiSwitch).toHaveAttribute("aria-checked", "true");
    await shots(page, "s06-consent-on");
    await aiSwitch.click();
    await expect(page.getByText("Automated drafting tools are now off.")).toBeVisible();
    await expect(aiSwitch).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("table", { name: /Consent history/ })).toBeVisible();
    await page
      .getByRole("switch", { name: "Allow automated drafting tools" })
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expectNoSeriousViolations(page, "consent history");
  });

  test("a signed-out visitor can open onboarding and nothing else in the patient app", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, "onboarding");
    await expectNoSeriousViolations(page, "onboarding account");
    for (const path of ["/today", "/progress", "/plan", "/consent", "/check-in", "/session"]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`/login\\?reason=required&next=${encodeURIComponent(path)}`),
      );
    }
  });
});
