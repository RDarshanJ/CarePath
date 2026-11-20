import {
  request as playwrightRequest,
  type APIRequestContext,
  type Browser,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import { ANCHOR, PASSWORD, expect, signInWithForm, test } from "./fixtures";
import {
  expectNoHorizontalOverflow,
  expectNoSeriousViolations as axe,
  mainText,
  personas,
  shots,
  tabTo,
} from "./patient-helpers";

/**
 * WP 4.3a gate: patient appointments and messages against the real API.
 *  - Scenario E at 390 and 1440: Today shows the next visit and unread count, the booking list is
 *    preselected from intake, a visit is booked, rescheduled and cancelled with a reason, then a thread is
 *    read, answered by the therapist while open (5 second poll) and written to.
 *  - Two browsers book the same time: the second gets "That time was just taken", fresh times and
 *    the nearest open ones, with the visit type and filters kept.
 *  - A keyboard-only pass of booking, cancelling and sending.
 * Everything a test books is cancelled again, so the slots return to the list and the suite can be re-run.
 * axe (wcag2a to 22aa) runs on every screen and fails on serious or critical findings.
 */
const isMobile = (info: TestInfo) => info.project.name === "mobile-390";

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  try {
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 900);
    console.log(`FAILED ${info.title}\n  url: ${page.url()}\n  page: ${text}`);
  } catch {
    // The page may already be closed.
  }
});

/** The patient's single care-team thread, from their own session. */
async function conversationIdOf(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const list = (await (await fetch("/api/conversations")).json()) as { items: { id: string }[] };
    return list.items[0]!.id;
  });
}

/** The therapist writes into a patient's thread, over the API with their own session. */
async function therapistWrites(baseURL: string, conversationId: string, body: string) {
  const api: APIRequestContext = await playwrightRequest.newContext({ baseURL });
  try {
    const login = await api.post("/api/auth/login", {
      headers: { origin: baseURL },
      data: { email: "therapist.demo@carepath.test", password: PASSWORD },
    });
    expect(login.status()).toBe(200);
    const { csrfToken } = (await login.json()) as { csrfToken: string };
    const res = await api.post(`/api/conversations/${conversationId}/messages`, {
      headers: { origin: baseURL, "x-csrf-token": csrfToken },
      data: { body },
    });
    expect(res.status()).toBe(201);
  } finally {
    await api.dispose();
  }
}

/**
 * axe with the phone's sticky tab bar out of the way. At rest the bar covers the bottom 64 px of the viewport,
 * and axe counts a control it covers as too small to tap; a person scrolls such a control clear of the bar
 * (the scroll-padding in the app layout does this for keyboard focus). The bar's own size is checked by
 * the other screens, where nothing sits under it.
 */
async function expectNoSeriousViolations(page: Page, label: string) {
  await page.addStyleTag({ content: "nav[aria-label=Patient]{position:static !important}" });
  try {
    await axe(page, label);
  } finally {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("style")) {
        if (el.textContent?.startsWith("nav[aria-label=Patient]")) el.remove();
      }
    });
  }
}

/** Tab until an element with this tag has focus (a textarea has no accessible name in `tabTo`'s sense). */
async function tabToTag(page: Page, tag: string, limit = 40) {
  for (let i = 0; i < limit; i++) {
    const now = await page.evaluate(() => document.activeElement?.tagName ?? "");
    if (now === tag) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached a ${tag}`);
}

async function signIn(page: Page, email: string) {
  await signInWithForm(page, email);
  await expect(page).toHaveURL(/\/today$/);
}

const upcoming = (page: Page) =>
  page.locator("section[aria-labelledby=upcoming-heading] > ul > li");

/** First open time on the booking screen: its day heading and clock text. */
async function firstTime(page: Page) {
  const day = page.locator("section[aria-labelledby^='day-']").first();
  await expect(day).toBeVisible();
  const heading = (await day.getByRole("heading").innerText()).trim();
  const button = day.getByRole("button").first();
  const time = ((await button.textContent()) ?? "").split(",").pop()!.trim();
  return { day, heading, button, time };
}

async function cancelVisit(page: Page, card: Locator, reason: string) {
  await card.getByRole("button", { name: /^Cancel visit/ }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this visit?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel visit", exact: true }).click();
  await expect(dialog.getByText("Tell us why you are cancelling")).toBeVisible();
  await dialog.getByLabel(/^Why are you cancelling/).fill(reason);
  await dialog.getByRole("button", { name: "Cancel visit", exact: true }).click();
  await expect(page).toHaveURL(/\/appointments\?cancelled=/);
  await expect(page.getByText("Visit cancelled")).toBeVisible();
}

async function goToAppointments(page: Page) {
  await page
    .getByRole("navigation", { name: "Patient" })
    .getByRole("link", { name: "Appointments" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible();
}

test.describe("Scenario E: appointments and messages", () => {
  test("Today, booking from intake availability, reschedule, cancel with a reason", async ({
    page,
    baseURL,
  }, info) => {
    const mobile = isMobile(info);
    await signIn(page, personas.demo);

    // The therapist's reply arrives before Today loads, so Today has an unread count to show.
    const convo = await conversationIdOf(page);
    await therapistWrites(baseURL!, convo, "Please bring your exercise log to your next visit.");
    await expect
      .poll(async () =>
        page.evaluate(
          async () =>
            ((await (await fetch("/api/conversations")).json()) as { unreadTotal: number })
              .unreadTotal,
        ),
      )
      .toBeGreaterThan(0);
    await page.goto("/today");

    // Today: next visit and unread count, in the plain list (REQ-TOD-01).
    await expect(page.getByRole("heading", { level: 3, name: "Next appointment" })).toBeVisible();
    await expect(page.getByText(/^Tomorrow, 8:00 AM to 8:45 AM/)).toBeVisible();
    await expect(page.getByText(/unread message/).first()).toBeVisible();
    await expect(
      page.getByText(/^Appointment reminder: your visit is tomorrow at 8:00 AM/),
    ).toBeVisible();
    const headings = await page.locator("main h2, main h3").allInnerTexts();
    const order = ["Daily check-in", "Next appointment", "Messages", "This week"];
    const at = order.map((h) => headings.findIndex((t) => t.includes(h)));
    expect(at.every((p) => p >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);

    // Navigation: bottom tabs on a phone, the header from md up (checkpoint C2).
    const nav = page.getByRole("navigation", { name: "Patient" });
    await expect(nav.getByRole("link")).toHaveText([
      "Today",
      "Progress",
      "Appointments",
      /Messages/,
    ]);
    await expect(nav.getByRole("link", { name: /Messages/ })).toContainText("unread");
    const box = (await nav.boundingBox())!;
    const viewport = page.viewportSize()!;
    if (mobile) expect(box.y + box.height).toBeGreaterThan(viewport.height - 4);
    else expect(box.y + box.height).toBeLessThan(260);
    await expectNoHorizontalOverflow(page, "today with visit and messages");
    if (mobile) await shots(page, "e01-today");
    await expectNoSeriousViolations(page, "today with visit and messages");

    // Appointments: upcoming and past, a reminder, the zone named.
    await goToAppointments(page);
    await expect(page).toHaveURL(/\/appointments$/);
    await expect(page.getByText(/in Mountain Standard Time, the clinic's time zone/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Upcoming" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Past" })).toBeVisible();
    await expect(page.getByText("Reminder", { exact: true })).toBeVisible();
    await expect(upcoming(page)).toHaveCount(1);
    await expect(page.getByText("Completed").first()).toBeVisible();
    await expect(page.getByText("Cancelled by you").first()).toBeVisible();
    expect(await mainText(page)).not.toMatch(/\b(completed|cancelled_by_patient|booked)\b(?! )/);
    await expectNoHorizontalOverflow(page, "appointments");
    if (mobile) await shots(page, "e02-appointments");
    await expectNoSeriousViolations(page, "appointments");

    // Booking: the intake availability preselects the filters; times are a list grouped by day.
    await page.getByRole("link", { name: "Book a visit" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Book a visit" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Your therapist" })).toBeVisible();
    await expect(page.getByText("Terry Demotherapist", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Follow-up visit/ })).toBeChecked();
    for (const d of ["Monday", "Wednesday", "Friday", "Morning"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${d}`) })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    for (const d of ["Tuesday", "Thursday", "Afternoon", "Evening"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${d}`) })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
    await expect(page.getByText("Mountain Standard Time", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/Set from the availability you gave at intake/)).toBeVisible();
    // Never asked again: no field for days or times of availability, only the filters.
    await expect(page.getByLabel(/best days/i)).toHaveCount(0);
    const first = await firstTime(page);
    expect(first.heading).toMatch(/^(Monday|Wednesday|Friday),/);
    expect(first.time).toMatch(/AM$/);
    await expectNoHorizontalOverflow(page, "booking times");
    if (mobile) await shots(page, "e03-booking-times");
    await expectNoSeriousViolations(page, "booking times");

    await first.button.click();
    await expect(page.getByRole("heading", { level: 1, name: "Check and confirm" })).toBeFocused();
    await expect(page.getByText("Nothing is booked until you confirm.")).toBeVisible();
    await expect(page.getByText("Mountain Standard Time").first()).toBeVisible();
    const reason = `Scenario E ${info.project.name}`;
    await page.getByLabel(/^What would you like to work on/).fill(reason);
    if (mobile) await shots(page, "e04-booking-confirm");
    await expectNoSeriousViolations(page, "booking confirm");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page).toHaveURL(/\/appointments\?booked=/);
    await expect(page.getByText("Visit booked", { exact: true })).toBeVisible();
    await expect(upcoming(page)).toHaveCount(2);
    if (mobile) await shots(page, "e05-booked");
    await expectNoSeriousViolations(page, "appointments after booking");

    // Reschedule: pick the next open time; the original stays until the new one is confirmed.
    const mine = upcoming(page).filter({ hasText: reason });
    await expect(mine).toHaveCount(1);
    await mine.getByRole("link", { name: /^Reschedule/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Choose a new time" })).toBeVisible();
    await expect(page.getByText("Your current visit", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    if (mobile) await shots(page, "e06-reschedule");
    await expectNoSeriousViolations(page, "reschedule times");
    const slots = page.locator("section[aria-labelledby^='day-'] button");
    await slots.nth(1).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Confirm the new time" }),
    ).toBeVisible();
    await expect(page.getByText(/^This replaces your visit on/)).toBeVisible();
    await page.getByRole("button", { name: "Confirm new time" }).click();
    await expect(page).toHaveURL(/\/appointments\?moved=/);
    await expect(page.getByText("Visit moved", { exact: true })).toBeVisible();
    await expect(upcoming(page)).toHaveCount(2);

    // Cancel with a reason (AC-E4); the time is bookable again.
    const moved = upcoming(page).nth(1);
    await cancelVisit(page, moved, `Plans changed ${info.project.name}`);
    await expect(upcoming(page)).toHaveCount(1);
    await expectNoSeriousViolations(page, "appointments after cancelling");
    await page.getByRole("link", { name: "Book a visit" }).click();
    const again = await firstTime(page);
    expect(again.heading).toBe(first.heading);

    // Messages: unread in the list, a thread with names and roles, read on open.
    await page
      .getByRole("navigation", { name: "Patient" })
      .getByRole("link", { name: /Messages/ })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
    await expect(
      page.getByText(/Your care team usually replies within one business day/).first(),
    ).toBeVisible();
    await expect(page.getByText(/\d+ unread messages?/)).toBeVisible();
    if (mobile) await shots(page, "e07-messages");
    await expectNoSeriousViolations(page, "messages list");
    await page.getByRole("link", { name: /Plan change question/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Plan change question" }),
    ).toBeVisible();
    const log = page.getByRole("log", { name: "Messages in this conversation" });
    await expect(log.getByText("Terry Demotherapist").first()).toBeVisible();
    await expect(log.getByText("Physical therapist").first()).toBeVisible();
    await expect(
      log.getByText("Please bring your exercise log to your next visit.").first(),
    ).toBeVisible();
    // Every message names its sender and role.
    const items = log.getByRole("listitem");
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toContainText(/(Patient|Physical therapist|Care coordinator)/);
    }
    // Composer: reply time and the shared emergency notice (AC-E10).
    const composer = page.getByRole("form", { name: "Write a message" });
    await expect(
      composer.getByText("Your care team usually replies within one business day."),
    ).toBeVisible();
    await expect(composer.getByText(EMERGENCY_NOTICE)).toBeVisible();
    // Opening the thread cleared its unread count: the nav badge goes (AC-E9).
    await expect(
      page.getByRole("navigation", { name: "Patient" }).getByRole("link", { name: /Messages/ }),
    ).toHaveText("Messages");
    await expectNoHorizontalOverflow(page, "thread");
    if (mobile) await shots(page, "e08-thread");
    await expectNoSeriousViolations(page, "thread");

    // Polling while open: the therapist's next message appears without a reload (ADR-12).
    const live = `Live reply ${info.project.name}`;
    await therapistWrites(baseURL!, convo, live);
    await expect(log.getByText(live)).toBeVisible({ timeout: 20_000 });
    await expect(log.getByText("New", { exact: true }).first()).toBeVisible();

    // Send: Sending, then Sent once delivery runs.
    const mineText = `Thank you, I will. ${info.project.name}`;
    await composer.getByLabel(/^Message to your care team/).fill(mineText);
    await composer.getByRole("button", { name: "Send message" }).click();
    const sent = log.getByRole("listitem").filter({ hasText: mineText });
    await expect(sent).toHaveCount(1);
    await expect(sent.getByText("Dana Demopatient")).toBeVisible();
    await expect(sent.getByText("Sent", { exact: true })).toBeVisible({ timeout: 20_000 });
    if (mobile) await shots(page, "e09-thread-sent");
    await expectNoSeriousViolations(page, "thread after sending");

    // Writing nothing says so.
    await composer.getByRole("button", { name: "Send message" }).click();
    await expect(composer.getByText("Write your message before you send it.")).toBeVisible();
  });

  test("two browsers book one time: the second is told it was just taken", async ({
    browser,
    page,
  }, info) => {
    test.skip(!isMobile(info), "The two-browser test runs once, at 390 by 844");
    const first = page;
    const second = await openSecond(browser, info);
    try {
      await signIn(first, personas.demo);
      await signIn(second, personas.resume);
      await first.goto("/appointments/book");
      await second.goto("/appointments/book");
      const a = await firstTime(first);
      const b = await firstTime(second);
      const dayId = await dayIdOf(a.day);
      expect(b.heading).toBe(a.heading);
      expect(b.time).toBe(a.time);

      // Both people pick the same time and reach the confirm step.
      await a.button.click();
      await b.button.click();
      const reasonA = "Scenario E first browser";
      const reasonB = "Scenario E second browser";
      await first.getByLabel(/^What would you like to work on/).fill(reasonA);
      await second.getByLabel(/^What would you like to work on/).fill(reasonB);

      await first.getByRole("button", { name: "Confirm booking" }).click();
      await expect(first).toHaveURL(/\/appointments\?booked=/);
      await expect(first.getByText("Visit booked", { exact: true })).toBeVisible();

      await second.getByRole("button", { name: "Confirm booking" }).click();
      const notice = second.getByRole("alert").filter({ hasText: "That time was just taken" });
      await expect(notice).toBeVisible();
      await expect(notice).toContainText("Nothing was booked");
      await expect(notice.locator("xpath=..")).toBeFocused();
      // Selections are kept: the visit type and the intake filters are as they were (AC-E8).
      await expect(second.getByRole("radio", { name: /Follow-up visit/ })).toBeChecked();
      await expect(second.getByRole("button", { name: /^Friday/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      // The list is fresh: the taken time is gone, and the closest open times are offered.
      await expect(second.getByRole("heading", { level: 1, name: "Book a visit" })).toBeVisible();
      const offered = notice.getByRole("listitem").getByRole("button");
      expect(await offered.count()).toBeGreaterThanOrEqual(1);
      const gone = second.locator(`section[aria-labelledby='day-${dayId}']`).getByRole("button", {
        name: new RegExp(`, ${a.time}$`),
      });
      await expect(gone).toHaveCount(0);
      await shots(second, "e10-just-taken");
      await expectNoSeriousViolations(second, "that time was just taken");

      await offered.first().click();
      await expect(
        second.getByRole("heading", { level: 1, name: "Check and confirm" }),
      ).toBeVisible();
      await second.getByLabel(/^What would you like to work on/).fill(reasonB);
      await second.getByRole("button", { name: "Confirm booking" }).click();
      await expect(second).toHaveURL(/\/appointments\?booked=/);

      // Tidy up: both visits are cancelled and the times return.
      await cancelVisit(
        second,
        upcoming(second).filter({ hasText: reasonB }),
        "Scenario E tidy up",
      );
      await cancelVisit(first, upcoming(first).filter({ hasText: reasonA }), "Scenario E tidy up");
    } finally {
      await second.context().close();
    }
  });

  test("keyboard only: book, cancel and send a message", async ({ page }, info) => {
    test.skip(!isMobile(info), "The keyboard pass runs once, at 390 by 844");
    await signIn(page, personas.demo);
    await page.goto("/appointments");
    await tabTo(page, /^Book a visit$/);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Book a visit" })).toBeVisible();
    // A filter toggles with Space and reports its state.
    await tabTo(page, /Tuesday$/);
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: /^Tuesday/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await tabTo(page, /^Nov \d+, \d+:\d\d (AM|PM)$/);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Check and confirm" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.type("Scenario E keyboard");
    await tabTo(page, "Confirm booking");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/appointments\?booked=/);
    await expect(page.getByText("Visit booked", { exact: true })).toBeVisible();

    // Cancel it, again with the keyboard; the dialog traps focus and Escape closes it.
    await tabTo(page, /^Cancel visit on .*/);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Cancel this visit?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    const card = upcoming(page).filter({ hasText: "Scenario E keyboard" });
    await card.getByRole("button", { name: /^Cancel visit/ }).focus();
    await page.keyboard.press("Enter");
    await tabToTag(page, "TEXTAREA");
    await page.keyboard.type("Keyboard tidy up");
    await tabTo(page, "Cancel visit");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Visit cancelled")).toBeVisible();

    // Messages: reach the composer and send with Tab and Enter.
    await page.goto("/messages");
    await tabTo(page, /^Plan change question/);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Plan change question" }),
    ).toBeVisible();
    await tabToTag(page, "TEXTAREA");
    await page.keyboard.type("Sent from the keyboard");
    await tabTo(page, "Send message");
    await page.keyboard.press("Enter");
    const log = page.getByRole("log", { name: "Messages in this conversation" });
    await expect(
      log.getByRole("listitem").filter({ hasText: "Sent from the keyboard" }),
    ).toHaveCount(1);
  });
});

/** A second browser context with its own session, at the same size and with the same fixed clock. */
async function openSecond(browser: Browser, info: TestInfo) {
  const context = await browser.newContext({
    baseURL: info.project.use.baseURL!,
    viewport: info.project.use.viewport!,
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(ANCHOR);
  return page;
}

async function dayIdOf(day: Locator): Promise<string> {
  const labelled = (await day.getAttribute("aria-labelledby")) ?? "";
  return labelled.replace(/^day-/, "");
}
