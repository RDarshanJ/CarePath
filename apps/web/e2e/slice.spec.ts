import type { Browser, BrowserContext, Page } from "@playwright/test";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import { ANCHOR, accounts, expect, signInWithForm, test } from "./fixtures";
import {
  expectNoSeriousViolations,
  finishExercise,
  mainText,
  radio,
  shots,
} from "./patient-helpers";

/**
 * The vertical slice as one permanent test (checkpoint C2, WP 3.4b): the walk the advisor did by hand,
 * with the assignment done in the coordinator screen instead of an API call.
 *
 *   new patient onboards with a code (390 wide)
 *   -> the coordinator assigns a therapist in /admin/patients (1440)
 *   -> the therapist builds and publishes version 1 (1440)
 *   -> the patient sees "Your plan is ready", completes the session and reports pain 8 (390)
 *   -> the therapist finds exactly one review task for that check-in (1440)
 *
 * It uses the eligibility code CAREPATH-1-START-2 and runs once, in the desktop project. Each role has
 * its own browser context, so no session is shared.
 */
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const PATIENT = {
  first: "Robin",
  last: "Slice",
  email: "robin.slice@carepath.test",
  password: "a long enough passphrase 2026",
  code: "CAREPATH-1-START-2",
  goal: "Walk to the end of the street and back without stopping.",
};
const FULL_NAME = `${PATIENT.first} ${PATIENT.last}`;

async function open(
  browser: Browser,
  baseURL: string,
  viewport: { width: number; height: number },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, viewport });
  const page = await context.newPage();
  await page.clock.setFixedTime(ANCHOR);
  return { context, page };
}

const next = (page: Page) => page.getByRole("button", { name: "Continue", exact: true }).click();

async function onboard(page: Page) {
  await page.goto("/login");
  await page.getByRole("link", { name: "Start here" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  await page.getByLabel(/^First name/).fill(PATIENT.first);
  await page.getByLabel(/^Last name/).fill(PATIENT.last);
  await page.getByLabel(/^Email/).fill(PATIENT.email);
  await page.getByLabel(/^Password/).fill(PATIENT.password);
  await next(page);

  await page.getByLabel(/^Date of birth/).fill("1991-06-02");
  await page.getByLabel(/^Eligibility code/).fill(PATIENT.code);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "About you" })).toBeVisible();
  await page.getByLabel(/^Phone number/).fill("(555) 555-0188");
  await next(page);

  await expect(page.getByRole("heading", { level: 1, name: "Your goal" })).toBeVisible();
  await page.getByLabel(/^What would you like/).fill(PATIENT.goal);
  await next(page);

  await expect(page.getByRole("heading", { level: 1, name: "Where it bothers you" })).toBeVisible();
  await page.getByRole("radio", { name: "Lower back", exact: true }).click();
  await page.getByRole("radio", { name: "Left side" }).click();
  // The body-area picture appears with its caption and a plain description.
  await expect(
    page.getByRole("img", { name: /seen from behind, from the lower ribs/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Illustration only. Follow the written steps from your care team."),
  ).toBeVisible();
  await next(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Pain right now and this week" }),
  ).toBeVisible();
  await radio(page, "At its worst in the last week?", "6 of 10").click();
  await radio(page, "At its best in the last week?", "2 of 10").click();
  await radio(page, "How much does it hurt right now?", "4 of 10").click();
  await next(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "What is hard right now" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Walking" }).click();
  await next(page);

  await expect(page.getByRole("heading", { level: 1, name: "Your therapist" })).toBeVisible();
  await next(page);

  await expect(page.getByRole("heading", { level: 1, name: "When you can come in" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Monday" }).click();
  await page.getByRole("checkbox", { name: "Morning" }).click();
  await next(page);

  await expect(page.getByRole("heading", { level: 1, name: "Sharing and consent" })).toBeVisible();
  await page.getByRole("checkbox", { name: /I agree to treatment and data use/ }).click();
  await next(page);

  await expect(page.getByRole("heading", { level: 1, name: "Review and send" })).toBeVisible();
  await page.getByRole("checkbox", { name: "These answers are right." }).click();
  await page.getByRole("button", { name: "Send to the clinic" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your details are with the clinic" }),
  ).toBeVisible();
}

test("the slice: onboarding, assignment in the UI, plan, session, pain check-in, review task", async ({
  browser,
  baseURL,
}, info) => {
  test.skip(
    info.project.name !== "desktop-1440",
    "The slice runs once, in the desktop project; the patient parts resize to 390 wide themselves",
  );
  test.setTimeout(240_000);

  // 1. A new patient completes onboarding.
  const patient = await open(browser, baseURL!, PHONE);
  await onboard(patient.page);
  await patient.page.getByRole("link", { name: "Go to Today" }).click();
  await expect(
    patient.page.getByRole("heading", { level: 2, name: "Your details are with the clinic" }),
  ).toBeVisible();
  await shots(patient.page, "slice-01-today-awaiting");

  // 2. The coordinator assigns a therapist on the administrative patient list. No clinical field is shown.
  const coordinator = await open(browser, baseURL!, DESKTOP);
  const cp = coordinator.page;
  await signInWithForm(cp, accounts.care_coordinator.email);
  await expect(cp).toHaveURL(/\/admin\/patients$/);
  await expect(cp.getByRole("heading", { level: 1, name: "Patients" })).toBeVisible();
  await cp.getByLabel("Search by name or MRN").fill(PATIENT.last);
  const row = cp.getByRole("row", { name: new RegExp(FULL_NAME) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Awaiting assignment");
  await expect(row).toContainText("Not assigned");
  expect(await mainText(cp)).not.toMatch(/pain|goal|limitation/i);
  await shots(cp, "slice-02-admin-awaiting");
  await expectNoSeriousViolations(cp, "admin patients awaiting assignment");

  await cp.getByRole("button", { name: `Assign therapist to ${FULL_NAME}` }).click();
  const dialog = cp.getByRole("dialog", { name: `Assign a therapist to ${FULL_NAME}` });
  await expect(dialog).toBeVisible();
  // Choosing nothing is refused in words and nothing is posted.
  await dialog.getByRole("button", { name: "Assign therapist" }).click();
  await expect(dialog.getByText("Choose a therapist to assign.")).toBeVisible();
  await expect(dialog.getByText(/\d+ active patients?/).first()).toBeVisible();
  await dialog.getByRole("radio", { name: /Demotherapist/ }).click();
  await shots(cp, "slice-03-admin-assign-dialog", { overlay: true });
  await expectNoSeriousViolations(cp, "assign therapist dialog");
  await dialog.getByRole("button", { name: "Assign therapist" }).click();
  await expect(dialog).toBeHidden();
  await expect(cp.getByText(/is now the primary therapist for Robin Slice/)).toBeVisible();
  await expect(cp.getByRole("row", { name: new RegExp(FULL_NAME) })).toHaveCount(0);
  await shots(cp, "slice-04-admin-assigned");
  // The patient is now active with the therapist: visible under "Active".
  await cp.getByLabel("Status").click();
  await cp.getByRole("option", { name: "Active", exact: true }).click();
  await expect(cp.getByRole("row", { name: new RegExp(FULL_NAME) })).toContainText("Demotherapist");
  await coordinator.context.close();

  // 3. The therapist builds and publishes version 1.
  const therapist = await open(browser, baseURL!, DESKTOP);
  const tp = therapist.page;
  await signInWithForm(tp, accounts.physical_therapist.email);
  await expect(tp).toHaveURL(/\/overview$/);
  await tp.goto("/patients");
  await tp.getByLabel(/^Search by name/).fill(PATIENT.last);
  // The search is applied to the address after a short pause; click only once it has been.
  await expect(tp).toHaveURL(/q=Slice/);
  await tp.getByRole("link", { name: FULL_NAME }).click();
  await expect(tp).toHaveURL(/\/patients\/[0-9a-f-]{36}/);
  const patientId = tp.url().match(/\/patients\/([0-9a-f-]{36})/)![1]!;

  await tp.goto(`/patients/${patientId}/plan`);
  await expect(
    tp.getByRole("heading", { level: 1, name: /Care plan (builder|for)/ }),
  ).toBeVisible();
  await tp.getByLabel(/^Plan title/).fill("Back mobility, first plan");
  await tp
    .getByLabel(/^Plan instructions/)
    .fill("Do these on the days shown. Stop and tell us if anything feels sharp.");
  const library = tp.getByLabel("Search the library");
  for (const name of ["Pelvic tilt", "Single knee to chest"]) {
    await library.fill(name);
    await tp.getByRole("button", { name: `Add ${name} to the plan` }).click();
    await expect(tp.getByRole("button", { name: `${name} is in the plan` })).toBeVisible();
  }
  const exercises = tp.getByRole("list", { name: "Exercises in this plan" });
  await expect(exercises.getByRole("listitem")).toHaveCount(2);
  // Thursday is the fixed day of the test clock, so the session is due today.
  for (let i = 0; i < 2; i++) {
    const thursday = exercises
      .getByRole("listitem")
      .nth(i)
      .getByRole("checkbox", { name: "Thursday" });
    if (!(await thursday.isChecked())) await thursday.click();
    await expect(thursday).toBeChecked();
  }
  await expect(tp.getByText(/Draft saved at/)).toBeVisible();
  await tp.getByRole("button", { name: /Review and publish version 1/ }).click();
  const publish = tp.getByRole("dialog", { name: "Publish version 1" });
  await expect(publish).toBeVisible();
  await publish.getByRole("button", { name: "Publish version 1" }).click();
  await expect(tp).toHaveURL(new RegExp(`/patients/${patientId}\\?tab=plan$`));
  await expect(tp.getByText("Version 1 published", { exact: false }).first()).toBeVisible();

  // 4. The patient sees the first plan as ready, not as changed, and completes the session.
  const pp = patient.page;
  await pp.goto("/today");
  await expect(pp.getByRole("heading", { level: 3, name: "Your plan is ready" })).toBeVisible();
  await expect(pp.getByText("Your plan changed")).toHaveCount(0);
  await expect(pp.getByText(/^Added:|^Removed:|^Changed:/)).toHaveCount(0);
  await expect(pp.getByText(/planned so far this week/).first()).toBeVisible();
  await shots(pp, "slice-05-today-plan-ready");
  // The sticky tab bar covers the foot of a tall page at the top; axe checks controls in view.
  await pp.getByRole("button", { name: "Got it" }).scrollIntoViewIfNeeded();
  await expectNoSeriousViolations(pp, "today with the first plan");

  await pp.getByRole("link", { name: "Start today's session" }).click();
  await expect(pp.getByRole("heading", { level: 1, name: "Today's session" })).toBeVisible();
  // Each exercise shows its own picture, and every picture carries the caption.
  await expect(pp.getByRole("img", { name: /lying on a mat with both knees bent/ })).toBeVisible();
  await expect(pp.getByRole("img", { name: /lying on a mat with one knee held/ })).toBeVisible();
  await expect(
    pp.getByText("Illustration only. Follow the written steps from your care team."),
  ).toHaveCount(2);
  await shots(pp, "slice-06-session-overview");
  await pp.getByRole("button", { name: "Begin session" }).click();
  await expect(pp.getByText("Exercise 1 of 2")).toBeVisible();
  await expect(pp.getByRole("img", { name: /lying on a mat with both knees bent/ })).toBeVisible();
  await shots(pp, "slice-07-session-exercise");
  await finishExercise(pp);
  await expect(pp.getByText("Exercise 2 of 2")).toBeVisible();
  await finishExercise(pp);
  await expect(pp.getByRole("heading", { level: 1, name: "All exercises done" })).toBeVisible();
  await pp.getByRole("button", { name: "Finish session" }).click();
  await expect(pp.getByRole("heading", { level: 1, name: "Session complete" })).toBeVisible();

  await radio(pp, "How much does it hurt right now?", "8 of 10").click();
  await pp.getByRole("radio", { name: "About what I expected" }).click();
  await pp.getByRole("button", { name: "Send check-in" }).click();
  await expect(pp.getByText("You reported pain of 8 out of 10").first()).toBeVisible();
  await expect(pp.getByTestId("check-in-done").getByText(EMERGENCY_NOTICE)).toBeVisible();
  await shots(pp, "slice-08-checkin-sent");
  await pp.getByRole("link", { name: "Back to Today" }).click();
  await expect(pp.getByRole("heading", { level: 2, name: "Done for today" })).toBeVisible();
  await shots(pp, "slice-09-today-done");
  await expectNoSeriousViolations(pp, "today done");
  await patient.context.close();

  // 5. The therapist finds exactly one review task for the check-in.
  const tasks = await tp.evaluate(async (id) => {
    const res = await fetch(`/api/patients/${id}/review-tasks?limit=50`);
    const body = (await res.json()) as { items: { status: string; rule: { name: string } }[] };
    return body.items.map((t) => `${t.status}: ${t.rule.name}`);
  }, patientId);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]).toMatch(/^open: Reported pain/);

  await tp.goto("/review-queue");
  await expect(tp.getByRole("heading", { level: 1, name: "Review queue" })).toBeVisible();
  await expect(tp.locator("main")).toContainText(FULL_NAME);
  await expect(tp.locator("main")).toContainText("Reported pain 8 of 10");
  await therapist.context.close();
});
