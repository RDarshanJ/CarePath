import type { Page } from "@playwright/test";
import { accounts, expectNoSeriousViolations } from "./fixtures";
import {
  desktopOnly,
  expect,
  findPatientId,
  patientApi,
  screenshot as takeScreenshot,
  signInClinician,
  tabTo,
  test,
} from "./clinician-helpers";

/**
 * WP 4.3b: the clinician agenda, the patient record's Appointments tab, and clinician messaging.
 * Real sign-ins and real API calls. Axe (serious and critical) runs on every screen at 1440 and 1024.
 */
desktopOnly();

/** Let the rail's unread count and any polling settle first, so a screenshot is the same on every run. */
async function screenshot(page: Page, name: string, width: 1440 | 1024) {
  await page.waitForTimeout(700);
  await takeScreenshot(page, name, width);
}

const forceFailure = process.env["MESSAGE_FORCE_FAILURE"] === "true";

interface Slot {
  id: string;
  startsAt: string;
  appointmentTypes: string[];
}

test.describe("agenda", () => {
  test.skip(forceFailure, "run with message delivery failing");

  test("a visit the patient books appears on the clinician's agenda, and cancelling updates it (Scenario E)", async ({
    page,
    baseURL,
  }) => {
    await signInClinician(page);
    const therapist = await page.evaluate(async () => {
      const s = (await (await fetch("/api/auth/session")).json()) as { practitionerId: string };
      return s.practitionerId;
    });

    // The patient books through the API (the patient screens are another package's); the clinician looks.
    const patient = await patientApi(accounts.patient.email, baseURL!);
    try {
      const slotsRes = await patient.api.get(`/api/practitioners/${therapist}/slots`);
      expect(slotsRes.ok()).toBe(true);
      const slots = (await slotsRes.json()) as {
        timezone: string;
        days: { date: string; slots: Slot[] }[];
      };
      const day = slots.days[slots.days.length - 1]!;
      const slot = day.slots[day.slots.length - 1]!;
      const book = await patient.api.post(`/api/patients/${patient.patientId}/appointments`, {
        headers: { "x-csrf-token": patient.csrf },
        data: {
          slotId: slot.id,
          type: slot.appointmentTypes[0],
          reason: "Agenda check from the test",
        },
      });
      expect(book.status(), await book.text()).toBe(201);
      const booked = (await book.json()) as { id: string; patient: { name: string }; date: string };

      await page.goto(`/schedule?date=${booked.date}`);
      await expect(page.getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible();
      await expect(page.getByText(`clinic's time zone, ${slots.timezone}`)).toBeVisible();
      const row = page.getByRole("row").filter({ hasText: "Agenda check from the test" });
      await expect(row).toBeVisible();
      await expect(row.getByRole("link", { name: booked.patient.name })).toBeVisible();
      await expectNoSeriousViolations(page, "schedule with a booked visit");

      // Cancelling frees the slot and the agenda says so in words.
      const cancel = await patient.api.post(
        `/api/patients/${patient.patientId}/appointments/${booked.id}/cancel`,
        { headers: { "x-csrf-token": patient.csrf }, data: { reason: "Test cleanup" } },
      );
      expect(cancel.ok()).toBe(true);
      await page.reload();
      await expect(
        page.getByRole("row").filter({ hasText: "Agenda check from the test" }),
      ).toContainText("Cancelled by the patient");
    } finally {
      await patient.dispose();
    }
  });

  test("agenda by day: stepper, zone named, empty day, overview and record tab", async ({
    page,
  }) => {
    await signInClinician(page);
    await expect(page.getByRole("heading", { level: 2, name: /^Visits today/ })).toBeVisible();
    await expect(page.getByText("Next visits today")).toHaveCount(0);
    const visitsToday = page.getByRole("region", { name: /^Visits today/ });
    await expect(visitsToday.getByRole("link").first()).toBeVisible();

    for (const width of [1440, 1024] as const) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
      await page.goto("/overview");
      await expect(page.getByRole("heading", { level: 2, name: /^Visits today/ })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: /^Unread messages/ })).toBeVisible();
      await expectNoSeriousViolations(page, `overview at ${width}`);
      await screenshot(page, "overview-visits", width);

      await page.goto("/schedule");
      await expect(page.getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible();
      await expect(page.getByText(/clinic's time zone, [A-Za-z_/]+ \(/)).toBeVisible();
      const agenda = page.getByRole("table", { name: /^Visits on / });
      await expect(agenda).toBeVisible();
      await expect(agenda.getByRole("row")).not.toHaveCount(1);
      await expectNoSeriousViolations(page, `schedule at ${width}`);
      await screenshot(page, "schedule-today", width);
    }

    // Stepping moves the day; a day far from the seed has nothing and says so.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/schedule");
    const heading = page.getByRole("heading", { level: 2, name: /, today/ });
    await expect(heading).toBeVisible();
    await page.getByRole("button", { name: "Next day" }).click();
    await expect(page).toHaveURL(/date=2026-11-20/);
    await expect(page.getByRole("heading", { level: 2, name: /Nov 20, 2026/ })).toBeVisible();
    await page.getByRole("button", { name: "Today" }).click();
    await expect(page).not.toHaveURL(/date=/);
    await page.goto("/schedule?date=2027-02-03");
    await expect(page.getByRole("heading", { name: "No visits on this day" })).toBeVisible();
    await expectNoSeriousViolations(page, "schedule empty day");
    await screenshot(page, "schedule-empty-day", 1440);

    // The patient record shows the same visits in its Appointments tab.
    await page.goto("/schedule");
    const firstPatient = agendaFirstPatient(page);
    const link = firstPatient;
    const name = (await link.textContent())!.trim();
    await link.click();
    await expect(page.getByRole("tab", { name: "Appointments", selected: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /^Upcoming visits/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /^Past and cancelled visits/ }),
    ).toBeVisible();
    for (const width of [1440, 1024] as const) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
      await expectNoSeriousViolations(page, `record appointments at ${width}`);
      await screenshot(page, "record-appointments", width);
    }
  });
});

function agendaFirstPatient(page: Page) {
  return page
    .getByRole("table", { name: /^Visits on / })
    .getByRole("row")
    .nth(1)
    .getByRole("link");
}

test.describe("messages", () => {
  test.skip(forceFailure, "run with message delivery failing");

  test("a clinician reads a thread, it clears the unread count, and a sent message is delivered", async ({
    page,
  }) => {
    await signInClinician(page);
    await page.goto("/inbox");
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
    const list = page.getByRole("region", { name: /^Conversations/ });
    const rows = list.getByRole("link");
    await expect(rows.first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose a conversation" })).toBeVisible();

    for (const width of [1440, 1024] as const) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
      await page.goto("/inbox");
      await expect(rows.first()).toBeVisible();
      await expectNoSeriousViolations(page, `messages list at ${width}`);
      await screenshot(page, "messages-list", width);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/inbox");
    await rows.first().click();
    await expect(page).toHaveURL(/\/inbox\?c=/);
    const thread = page.getByRole("log", { name: /^Messages with / });
    await expect(thread).toBeVisible();
    // Every message names its sender and role; the composer carries the reply time and the emergency notice.
    await expect(
      page.getByText("Not monitored for emergencies. If this is an emergency, call 911."),
    ).toBeVisible();
    await expect(page.getByText(/usually replies within/)).toBeVisible();
    const people = thread.getByRole("listitem");
    if ((await people.count()) > 0) {
      await expect(people.first()).toContainText(/Patient|Physical therapist|Care coordinator/);
    }

    const text = "Test reply from the end-to-end run";
    await page.getByLabel(/^Message to /).fill(text);
    await page.getByRole("button", { name: "Send message" }).click();
    const sent = thread.getByRole("listitem").filter({ hasText: text });
    await expect(sent).toBeVisible();
    await expect(sent).toContainText("Sent", { timeout: 20_000 });
    await expect(sent).toContainText("You (");
    for (const width of [1440, 1024] as const) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
      await expectNoSeriousViolations(page, `message thread at ${width}`);
      await screenshot(page, "messages-thread", width);
    }
  });

  test("keyboard only: step the agenda, open a conversation and send with Ctrl+Enter", async ({
    page,
  }) => {
    await signInClinician(page);

    await page.goto("/schedule");
    await expect(page.getByRole("heading", { level: 1, name: "Schedule" })).toBeVisible();
    const next = page.getByRole("button", { name: "Next day" });
    await tabTo(page, next);
    const focus = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as HTMLElement);
      return s.outlineStyle;
    });
    expect(focus).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/date=2026-11-20/);

    await page.goto("/inbox");
    const first = page
      .getByRole("region", { name: /^Conversations/ })
      .getByRole("link")
      .first();
    await tabTo(page, first);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/inbox\?c=/);
    const box = page.getByLabel(/^Message to /);
    await tabTo(page, box);
    const text = "Keyboard reply from the end-to-end run";
    await page.keyboard.type(text);
    await page.keyboard.press("Control+Enter");
    await expect(page.getByRole("log", { name: /^Messages with / }).getByText(text)).toBeVisible();
    await expect(box).toHaveValue("");
    // Wait for delivery so no queued message outlives this test.
    await expect(
      page
        .getByRole("log", { name: /^Messages with / })
        .getByRole("listitem")
        .filter({ hasText: text }),
    ).toContainText("Sent", { timeout: 20_000 });
  });
});

test.describe("leftovers from WP 3.4b", () => {
  test.skip(forceFailure, "run with message delivery failing");

  test("the plan preview shows exercise illustrations with their caption", async ({ page }) => {
    await signInClinician(page);
    const id = await findPatientId(page, "Demopatient");
    await page.goto(`/patients/${id}/plan`);
    await page.getByRole("tab", { name: "Patient preview" }).click();
    await expect(page.getByText("Preview, not published")).toBeVisible();
    const pictures = page.getByRole("article").getByRole("img");
    await expect(pictures.first()).toBeVisible();
    await expect(
      page.getByText("Illustration only. Follow the written steps from your care team.").first(),
    ).toBeVisible();
    await expectNoSeriousViolations(page, "plan preview with illustrations");
    await screenshot(page, "plan-preview-illustrations", 1440);
  });

  test("an empty review queue shows its true empty state with the picture", async ({ page }) => {
    await signInClinician(page);
    // No seeded clinic has an empty queue, so this one screen state is driven by an empty page from the
    // queue route (a test-only network answer; the queue's real data is covered by the other specs).
    await page.route("**/api/review-tasks?*", (route) =>
      route.fulfill({
        json: {
          items: [],
          nextCursor: null,
          lastCheckedAt: "2026-11-19T16:00:00.000Z",
          rulesLastRunAt: null,
          total: 0,
        },
      }),
    );
    await page.goto("/review-queue");
    await expect(page.getByRole("heading", { name: "Nothing needs attention" })).toBeVisible();
    await expect(page.locator('img[src*="moment-nothing-to-review"]')).toBeVisible();
    await expectNoSeriousViolations(page, "review queue empty");
    await screenshot(page, "review-queue-empty", 1440);
  });
});

test.describe("failed delivery", () => {
  test.skip(!forceFailure, "needs the API started with MESSAGE_FORCE_FAILURE=true");

  test("a message that cannot be delivered says so and offers a retry", async ({ page }) => {
    await signInClinician(page);
    await page.goto("/inbox");
    await page
      .getByRole("region", { name: /^Conversations/ })
      .getByRole("link")
      .first()
      .click();
    const thread = page.getByRole("log", { name: /^Messages with / });
    const text = "This message will not deliver";
    await page.getByLabel(/^Message to /).fill(text);
    await page.getByRole("button", { name: "Send message" }).click();
    const item = thread.getByRole("listitem").filter({ hasText: text });
    await expect(item).toContainText("Not sent", { timeout: 20_000 });
    await expect(item).toContainText("could not be delivered");
    await expect(
      page
        .getByRole("region", { name: /^Conversations/ })
        .getByText("1 message not sent")
        .first(),
    ).toBeVisible();
    await expectNoSeriousViolations(page, "failed message");
    await screenshot(page, "messages-failed", 1440);

    // Retry goes back to queued and, with delivery still forced to fail, ends failed again: the
    // retry is real and the state stays honest. (Delivery after a retry is covered by the API tests.)
    const retried = page.waitForResponse(
      (r) => /\/messages\/[^/]+\/retry$/.test(r.url()) && r.request().method() === "POST",
    );
    await item.getByRole("button", { name: "Try again" }).click();
    expect((await retried).status()).toBe(200);
    await expect(item).toContainText("Not sent", { timeout: 20_000 });
  });
});
