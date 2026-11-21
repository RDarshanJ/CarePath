import type { Locator, Page, TestInfo } from "@playwright/test";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import { expect, signInWithForm, test } from "./fixtures";
import {
  arrow,
  expectNoHorizontalOverflow,
  expectNoSeriousViolations,
  personas,
  radio,
  tabTo,
} from "./patient-helpers";

/**
 * D-WP-10 gate additions (rebuild plan section 3): the phase-driven session player and pain reporting.
 *  - The primary action is on screen without scrolling at 375 by 667 and at 390 by 844 in every phase,
 *    and "Stop, this hurts" is on screen in every phase of an open session, even after scrolling.
 *  - Pause, resume (with a reload in between) and stop paths; stop without a number ends the session at
 *    once; after a stop with a number the check-in shows it preselected with its sentence; one contact
 *    notice per screen and the emergency line before sending.
 *  - Rest is a `role="timer"` with milestone announcements, never one per second.
 *  - The set count survives a reload through sessionStorage, which holds nothing but set counts (R1).
 *  - The pain scale wraps as 0 to 5 and 6 to 10 on a phone.
 *  - Reduced motion: the decorative rest bar has no transition.
 *  - Keyboard only: every focused control stays clear of the sticky control bar (WCAG 2.4.11).
 * The file sorts after patient.spec.ts on purpose: it starts its own sessions for personas that spec has
 * already used, and stops any session an earlier run left open, so either order of runs works. Sessions
 * run on patient.flare, never patient.demo: every session adds to Dana Demopatient's record timeline,
 * and clinician-screens.spec (desktop project, after this file's phone run) expects the plan event there.
 */
const phones = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
];
const isPhone = (info: TestInfo) => info.project.name === "mobile-390";

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  try {
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 900);
    console.log(`FAILED ${info.title}\n  url: ${page.url()}\n  page: ${text}`);
  } catch {
    // The page may already be closed.
  }
});

const shotDir = process.env["SCREENSHOT_DIR"];
async function shot(page: Page, name: string) {
  if (!shotDir) return;
  const size = page.viewportSize()!;
  await page.screenshot({ path: `${shotDir}/d10-${name}-${size.width}.png` });
}

async function expectInViewport(page: Page, target: Locator, label: string) {
  const box = await target.boundingBox();
  const vp = page.viewportSize()!;
  expect(box, `${label} is rendered`).not.toBeNull();
  expect(box!.y, `${label} top is on screen`).toBeGreaterThanOrEqual(0);
  expect(
    box!.y + box!.height,
    `${label} bottom is on screen at ${vp.width}x${vp.height}`,
  ).toBeLessThanOrEqual(vp.height + 0.5);
}

/**
 * At 375 by 667 and 390 by 844, from the top of the page: the primary is on screen without scrolling,
 * and so is Stop when the phase has one. Then scrolled to the bottom, the same controls are still on
 * screen (the bar is sticky). The viewport is put back to 390 by 844.
 */
async function expectReachable(
  page: Page,
  phase: string,
  primary: Locator,
  stop = true,
  sticky = true,
) {
  const stopButton = page.getByRole("button", { name: "Stop, this hurts" });
  for (const size of phones) {
    await page.setViewportSize(size);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await expectInViewport(page, primary, `${phase}: primary at the top`);
    if (stop) await expectInViewport(page, stopButton, `${phase}: Stop at the top`);
    if (sticky) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(150);
      await expectInViewport(page, primary, `${phase}: primary scrolled to the end`);
      if (stop) await expectInViewport(page, stopButton, `${phase}: Stop scrolled to the end`);
    }
    await expectNoHorizontalOverflow(page, `${phase} at ${size.width}`);
  }
  await page.setViewportSize(phones[1]!);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Opens the session overview with no session open: an open one left by an earlier run is stopped first. */
async function overview(page: Page) {
  // Sign-in ends in a full page load (D-WP-U); wait for Today before going anywhere else.
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  await page.goto("/session");
  if (/\/session\/[0-9a-f-]{36}$/.test(page.url())) {
    await page.getByRole("button", { name: "Stop, this hurts" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Stop session" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Session stopped" })).toBeVisible();
    await page.goto("/session");
  }
  await expect(page.getByRole("heading", { level: 1, name: "Today's session" })).toBeVisible();
}

async function begin(page: Page) {
  await page.getByRole("button", { name: "Begin session" }).click();
  await expect(page).toHaveURL(/\/session\/[0-9a-f-]{36}$/);
  await expect(page.getByText(/^Exercise 1 of \d+$/)).toBeVisible();
}

const status = (page: Page) => page.locator('main [role="status"]').last();

test.describe("D-WP-10 session player", () => {
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, info) => {
    test.skip(!isPhone(info), "the phone sizes are set inside each test; 1440 has its own test");
  });

  test("every phase keeps the primary and Stop on screen; rest is a timer with milestones; reload keeps the set", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await signInWithForm(page, personas.flare);
    await overview(page);
    await expectReachable(
      page,
      "overview",
      page.getByRole("button", { name: "Begin session" }),
      false,
      false,
    );
    await expectNoSeriousViolations(page, "overview");
    await shot(page, "overview");
    await begin(page);

    // Work: name, dose, primary, then picture and steps (DR-004 5.2).
    const done = page.getByRole("button", { name: /^Done with/ });
    await expectReachable(page, "work", done);
    const order = await page.evaluate(() => {
      const y = (el: Element | null) => (el ? el.getBoundingClientRect().top : -1);
      return {
        name: y(document.querySelector("main h1")),
        dose: y(document.querySelector('[data-testid="set-label"]')),
        primary: y(document.querySelector('[data-testid="control-bar"]')),
        steps: y(document.getElementById("how-heading")),
      };
    });
    expect(order.name).toBeLessThan(order.dose);
    expect(order.dose).toBeLessThan(order.primary);
    expect(order.primary).toBeLessThan(order.steps);
    await expect(page.getByText("Get ready", { exact: true })).toBeVisible();
    await expectNoSeriousViolations(page, "work");
    await shot(page, "work");

    // Rest between sets: a timer that is not live, a status line for milestones only.
    const label = await done.innerText();
    expect(label).toBe("Done with set 1");
    await done.click();
    await expect(page.getByRole("heading", { level: 1, name: "Rest" })).toBeFocused();
    const timer = page.getByRole("timer");
    await expect(timer).toHaveAttribute("aria-live", "off");
    await expect(status(page)).toContainText(
      /Set 1 done\. Rest for \d+ seconds\. Next: set 2 of \d\./,
    );
    await expectReachable(page, "rest", page.getByRole("button", { name: "Skip rest" }));
    await expectNoSeriousViolations(page, "rest");
    await shot(page, "rest");
    // "Add 15 seconds" lengthens the rest; the clock reads more than before.
    const before = await page.getByTestId("rest-timer").innerText();
    await page.getByRole("button", { name: "Add 15 seconds" }).click();
    const seconds = (t: string) => {
      const [m, s] = t.split(":").map(Number);
      return m! * 60 + s!;
    };
    expect(seconds(await page.getByTestId("rest-timer").innerText())).toBeGreaterThan(
      seconds(before),
    );
    // Pause rest stops the clock.
    await page.getByRole("button", { name: "Pause rest" }).click();
    const paused = await page.getByTestId("rest-timer").innerText();
    await page.waitForTimeout(2200);
    await expect(page.getByTestId("rest-timer")).toHaveText(paused);
    await page.getByRole("button", { name: "Continue rest" }).click();
    // The ten-second milestone, then the end of rest returns to work on its own with an announcement.
    await expect(status(page)).toHaveText(/^10 seconds left\.\u200b?$/, { timeout: 70_000 });
    await expect(status(page)).toHaveText(
      /^Rest is over\. Start set 2 when you are ready\.\u200b?$/,
      {
        timeout: 15_000,
      },
    );
    await expect(page.getByTestId("set-label")).toHaveText(/^Set 2 of \d$/);

    // A reload keeps the set count (interface state in this tab, R1).
    await page.reload();
    await expect(page.getByTestId("set-label")).toHaveText(/^Set 2 of \d$/);
    const stored = await page.evaluate(() =>
      Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)]),
    );
    expect(stored.length).toBeGreaterThan(0);
    for (const [k, v] of stored) {
      expect(k).toMatch(/^cp-sets:[0-9a-f-]{36}$/);
      expect(v).toMatch(/^\d+$/);
    }

    // Finish the exercise: the Next phase, with its own rest and the next exercise.
    for (let i = 0; i < 6; i++) {
      const b = page.getByRole("button", { name: /^Done with/ });
      const text = await b.innerText();
      await b.click();
      if (/finish exercise|this exercise/.test(text)) break;
      await page.getByRole("button", { name: "Skip rest" }).click();
    }
    const start = page.getByRole("button", { name: "Start exercise 2" });
    await expect(start).toBeVisible();
    await expect(page.getByText(/done\. Next exercise$/)).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();
    await expectReachable(page, "next", start);
    await expectNoSeriousViolations(page, "next");
    await shot(page, "next");
    await start.click();
    await expect(page.getByText("Exercise 2 of 4", { exact: true })).toBeVisible();

    // Pause, reload while paused, resume (AC-C1).
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Session paused" })).toBeFocused();
    await expectReachable(page, "paused", page.getByRole("button", { name: "Resume session" }));
    await shot(page, "paused");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Session paused" })).toBeVisible();
    await page.getByRole("button", { name: "Resume session" }).click();
    await expect(page.getByText("Exercise 2 of 4", { exact: true })).toBeVisible();

    // Skip with "It hurts" offers the stop path in the same sheet; skip the rest with a plain reason.
    await page.getByRole("button", { name: "Skip exercise" }).click();
    const sheet = page.getByRole("dialog", { name: "Skip this exercise?" });
    await sheet.getByRole("radio", { name: "It hurts" }).click();
    await expect(sheet.getByRole("button", { name: "Stop the session instead" })).toBeVisible();
    await expectNoSeriousViolations(page, "skip sheet with it hurts");
    await shot(page, "skip-it-hurts");
    await sheet.getByRole("radio", { name: "I am too tired today" }).click();
    await expect(sheet.getByRole("button", { name: "Stop the session instead" })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Skip exercise" }).click();
    await expect(page.getByText("Exercise 3 of 4", { exact: true })).toBeVisible();
    for (const n of [3, 4]) {
      await page.getByRole("button", { name: "Skip exercise" }).click();
      await page.getByRole("dialog").getByRole("radio", { name: "I am too tired today" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Skip exercise" }).click();
      if (n === 3) await expect(page.getByText("Exercise 4 of 4", { exact: true })).toBeVisible();
    }

    // Finish phase, then the post-session check-in with the send action on screen.
    const finish = page.getByRole("button", { name: "Finish session" });
    await expectReachable(page, "finish", finish);
    await finish.click();
    await expect(page.getByRole("heading", { level: 1, name: "Session complete" })).toBeFocused();
    const send = page.getByRole("button", { name: "Send check-in" });
    await expectReachable(page, "complete check-in", send, false);
    // The emergency line is on screen before sending, once (feature D, item 2).
    await expect(page.getByText(EMERGENCY_NOTICE)).toHaveCount(1);
    await expectNoSeriousViolations(page, "complete check-in");
    await shot(page, "complete");
    await radio(page, "How much does it hurt right now?", "2 of 10").click();
    await expect(page.getByText("You chose 2 of 10.")).toBeVisible();
    await send.click();
    await expect(page.getByRole("heading", { name: "Check-in sent" })).toBeFocused();
    await expect(page.getByText("Your therapist will see this.").first()).toBeVisible();
  });

  test("Stop without a number ends the session at once and the check-in asks next", async ({
    page,
  }) => {
    await signInWithForm(page, personas.flare);
    await overview(page);
    await begin(page);
    const sessionId = page.url().split("/").pop()!;
    await page.getByRole("button", { name: "Stop, this hurts" }).click();
    const sheet = page.getByRole("dialog", { name: "Stop this session?" });
    await expect(
      sheet.getByRole("radiogroup", { name: "How much does it hurt right now?" }),
    ).toBeVisible();
    await expect(sheet.getByText(/^Optional\./)).toBeVisible();
    await expectNoSeriousViolations(page, "stop sheet");
    await shot(page, "stop-sheet");
    // No number chosen: Stop session still ends it, with no error.
    await sheet.getByRole("button", { name: "Stop session" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Session stopped" })).toBeFocused();
    const detail = await page.evaluate(async (id) => {
      const s = await (await fetch("/api/auth/session")).json();
      return (await fetch(`/api/patients/${s.patientId}/sessions/${id}`)).json();
    }, sessionId);
    expect(detail.status).toBe("stopped_discomfort");
    expect(detail.checkInRequested).toBe(true);
    expect(
      detail.activities.every(
        (a: { discomfortLevel: number | null }) => a.discomfortLevel === null,
      ),
    ).toBe(true);

    // One contact notice and one emergency line on the screen; nothing preselected.
    await expect(page.getByText(EMERGENCY_NOTICE)).toHaveCount(1);
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(page.getByText(/You told us \d+ when you stopped/)).toHaveCount(0);
    await expectReachable(
      page,
      "stopped check-in",
      page.getByRole("button", { name: "Send check-in" }),
      false,
    );
    await expectNoSeriousViolations(page, "stopped without a number");
    await shot(page, "stopped-no-number");

    // The number is still required to send a check-in; then the notice is not shown a second time.
    await page.getByRole("button", { name: "Send check-in" }).click();
    await expect(page.getByText("Choose a pain number from 0 to 10").first()).toBeVisible();
    await radio(page, "How much does it hurt right now?", "7 of 10").click();
    await page.getByRole("button", { name: "Send check-in" }).click();
    await expect(page.getByRole("heading", { name: "Check-in sent" })).toBeVisible();
    await expect(page.getByText(EMERGENCY_NOTICE)).toHaveCount(1);
    await expect(page.getByText("You reported pain of 7 out of 10.").first()).toBeVisible();
  });

  test("Stop with a number: the check-in shows it preselected with its sentence, wrapped 0 to 5 and 6 to 10", async ({
    page,
  }) => {
    await signInWithForm(page, personas.flare);
    await overview(page);
    await begin(page);
    // Stop from the paused phase too: it is on screen there.
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Session paused" })).toBeVisible();
    await page.getByRole("button", { name: "Stop, this hurts" }).click();
    const sheet = page.getByRole("dialog", { name: "Stop this session?" });
    await radio(sheet, "How much does it hurt right now?", "8 of 10").click();
    await sheet.getByLabel(/^What happened/).fill("Sharp pain on the left side.");
    // Typed health text never reaches browser storage (R1).
    const storage = await page.evaluate(
      () => JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage }),
    );
    expect(storage).not.toContain("Sharp pain");
    await sheet.getByRole("button", { name: "Stop session" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Session stopped" })).toBeVisible();
    await expect(
      page.getByText(
        /You reported pain of 8 out of 10\. If you are worried, contact your clinic at/,
      ),
    ).toBeVisible();
    await expect(page.getByText(EMERGENCY_NOTICE)).toHaveCount(1);
    await expect(radio(page, "How much does it hurt right now?", "8 of 10")).toBeChecked();
    await expect(page.getByText("You told us 8 when you stopped.")).toBeVisible();
    await expect(page.getByText("You chose 8 of 10.")).toBeVisible();

    // The scale wraps as 0 to 5 and 6 to 10 at both phone widths.
    for (const size of phones) {
      await page.setViewportSize(size);
      await page.waitForTimeout(150);
      const top = async (n: number) =>
        (await radio(
          page,
          "How much does it hurt right now?",
          n === 0
            ? "0 of 10, no pain"
            : n === 10
              ? "10 of 10, worst pain imaginable"
              : `${n} of 10`,
        ).boundingBox())!;
      const [r0, r5, r6, r10] = await Promise.all([top(0), top(5), top(6), top(10)]);
      expect(Math.abs(r0.y - r5.y)).toBeLessThan(2);
      expect(r6.y).toBeGreaterThan(r5.y + r5.height - 1);
      expect(Math.abs(r6.y - r10.y)).toBeLessThan(2);
      expect(Math.abs(r0.x - r6.x)).toBeLessThan(2);
      expect(r0.height).toBeGreaterThanOrEqual(48);
    }
    await page.setViewportSize(phones[1]!);
    await expectNoSeriousViolations(page, "stopped with a number");
    await shot(page, "stopped-with-number");

    // A reload keeps the preselection: it comes from the server, not from browser storage.
    await page.reload();
    await expect(radio(page, "How much does it hurt right now?", "8 of 10")).toBeChecked();
    await page.getByRole("button", { name: "Send check-in" }).click();
    await expect(page.getByRole("heading", { name: "Check-in sent" })).toBeVisible();
    await expect(page.getByText(EMERGENCY_NOTICE)).toHaveCount(1);
    await shot(page, "stopped-sent");
  });

  test("keyboard only: the session and the check-in, with focus never under the control bar", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInWithForm(page, personas.flare);
    await overview(page);
    await page.setViewportSize(phones[0]!);
    await tabTo(page, "Begin session");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/^Exercise 1 of \d+$/)).toBeVisible();

    const covered: string[] = [];
    const checkFocus = async () => {
      const hit = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const bars = Array.from(document.querySelectorAll<HTMLElement>("[data-sticky-bar]"));
        for (const bar of bars) {
          if (bar.contains(el)) continue;
          const a = el.getBoundingClientRect();
          const b = bar.getBoundingClientRect();
          if (a.bottom > b.top + 1 && a.top < b.bottom - 1 && a.right > b.left && a.left < b.right)
            return (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName)
              .trim()
              .slice(0, 40);
        }
        return null;
      });
      if (hit) covered.push(hit);
    };
    // Walk every Tab stop of the work phase once.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      await checkFocus();
    }
    // Then through the session: Done per set, Skip rest, Start the next exercise.
    for (let guard = 0; guard < 60; guard++) {
      if (await page.getByRole("heading", { level: 1, name: "All exercises done" }).isVisible())
        break;
      const next = page.getByRole("button", { name: /^Start exercise \d+$/ });
      if (await next.isVisible()) {
        await tabTo(page, /^Start exercise \d+$/);
        await checkFocus();
        await page.keyboard.press("Enter");
        continue;
      }
      if (await page.getByRole("button", { name: "Skip rest" }).isVisible()) {
        await tabTo(page, "Skip rest");
        await checkFocus();
        await page.keyboard.press("Enter");
        continue;
      }
      await tabTo(page, /^Done with/);
      await checkFocus();
      await page.keyboard.press("Space");
      await page.waitForTimeout(200);
    }
    await tabTo(page, "Finish session");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Session complete" })).toBeFocused();
    // The check-in: the scale by arrow keys, every stop checked against the send bar.
    await tabTo(page, /\d+ of 10/);
    for (let i = 0; i < 3; i++) await arrow(page, "ArrowRight");
    await expect(page.getByText(/You chose \d+ of 10\./)).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      await checkFocus();
      if (
        (await page.evaluate(() => document.activeElement?.textContent?.trim())) === "Send check-in"
      )
        break;
    }
    await tabTo(page, "Send check-in");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Check-in sent" })).toBeFocused();
    expect(covered, "focused controls covered by a sticky bar").toEqual([]);
  });

  test("reduced motion: the rest bar does not animate and the phases still change", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await signInWithForm(page, personas.flare);
    await overview(page);
    await begin(page);
    await page.getByRole("button", { name: /^Done with set 1$/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Rest" })).toBeVisible();
    const bar = page.getByTestId("rest-timer").locator("xpath=following-sibling::div/div");
    const duration = await bar.evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration.split(",").every((d) => parseFloat(d) === 0)).toBe(true);
    await shot(page, "rest-reduced-motion");
    await page.getByRole("button", { name: "Skip rest" }).click();
    await expect(page.getByTestId("set-label")).toHaveText(/^Set 2 of \d$/);
    // Leave nothing open for the next test or spec.
    await page.getByRole("button", { name: "Stop, this hurts" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Stop session" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Session stopped" })).toBeVisible();
  });
});

test("check-in page: the send bar sits above the tab bar and focus stays clear of both", async ({
  page,
}, info) => {
  test.skip(!isPhone(info), "the tab bar is below 768 px");
  // Read only: nothing is sent, so the persona's data is unchanged for later specs.
  await signInWithForm(page, personas.noai);
  await expect(page).toHaveURL(/\/today$/);
  await page.setViewportSize(phones[0]!);
  await page.goto("/check-in");
  await expect(page.getByRole("heading", { level: 1, name: "Daily check-in" })).toBeVisible();
  const send = page.getByRole("button", { name: "Send check-in" });
  await expectInViewport(page, send, "send at 375 by 667");
  await expect(page.getByText(EMERGENCY_NOTICE)).toBeVisible();
  const boxes = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-sticky-bar]")).map((b) => {
      const r = b.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    }),
  );
  expect(boxes.length).toBe(2);
  const [form, tabs] =
    boxes[0]!.top < boxes[1]!.top ? [boxes[0]!, boxes[1]!] : [boxes[1]!, boxes[0]!];
  // The tab bar is 64.5 px tall (64 px plus a half-pixel rule); half a pixel of overlap is the rule itself.
  expect(form.bottom).toBeLessThanOrEqual(tabs.top + 1);
  const covered: string[] = [];
  await page.locator("body").focus();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      for (const bar of Array.from(document.querySelectorAll<HTMLElement>("[data-sticky-bar]"))) {
        if (bar.contains(el)) continue;
        const a = el.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        if (a.bottom > b.top + 1 && a.top < b.bottom - 1)
          return (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName)
            .trim()
            .slice(0, 40);
      }
      return null;
    });
    if (hit) covered.push(hit);
  }
  expect(covered, "focused controls covered by a sticky bar").toEqual([]);
  await expectNoSeriousViolations(page, "check-in at 375 by 667");
});

test("1440: the player is two columns with the controls beside the steps", async ({
  page,
}, info) => {
  test.skip(isPhone(info), "desktop layout");
  await signInWithForm(page, personas.flare);
  await overview(page);
  await begin(page);
  const bar = (await page.getByTestId("control-bar").boundingBox())!;
  const steps = (await page.locator("#how-heading").boundingBox())!;
  expect(steps.x).toBeGreaterThan(bar.x + bar.width - 1);
  await expectInViewport(page, page.getByRole("button", { name: /^Done with/ }), "primary at 1440");
  await expectNoSeriousViolations(page, "player at 1440");
  await shot(page, "work");
  await page.getByRole("button", { name: "Stop, this hurts" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Stop session" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Session stopped" })).toBeVisible();
  await shot(page, "stopped");
});
