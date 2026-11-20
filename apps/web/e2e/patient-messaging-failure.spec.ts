import { expect, signInWithForm, test } from "./fixtures";
import { expectNoSeriousViolations, personas, shots } from "./patient-helpers";

/**
 * WP 4.3a gate, forced delivery failure. Runs only when the API was started with
 * MESSAGE_FORCE_FAILURE=true (a non-production flag the gate sets for this stage), so that every
 * delivery fails: the sender sees "Not sent" with a plain reason and a Retry button, and the retry
 * goes back through the real endpoint. With the flag on, the retried message fails again, which is the
 * honest outcome and is shown the same way.
 */
test.skip(
  process.env["MESSAGE_FORCE_FAILURE"] !== "true",
  "Needs MESSAGE_FORCE_FAILURE=true on the API",
);

test("a message that cannot be delivered shows Not sent with a retry, and the retry is real", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile-390";
  await signInWithForm(page, personas.resume);
  await expect(page).toHaveURL(/\/today$/);
  await page.goto("/messages");
  await page.getByRole("link", { name: /Rescheduling my visit/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Rescheduling my visit" }),
  ).toBeVisible();

  const text = `Forced failure ${info.project.name}`;
  const composer = page.getByRole("form", { name: "Write a message" });
  await composer.getByLabel(/^Message to your care team/).fill(text);
  await composer.getByRole("button", { name: "Send message" }).click();

  const log = page.getByRole("log", { name: "Messages in this conversation" });
  const row = log.getByRole("listitem").filter({ hasText: text });
  await expect(row).toHaveCount(1);
  await expect(row.getByText(/^Not sent\./)).toBeVisible({ timeout: 20_000 });
  await expect(row.getByText(/Your message is saved here/)).toBeVisible();
  await expect(row.getByRole("button", { name: "Retry sending" })).toBeVisible();
  if (mobile) await shots(page, "e11-not-sent");
  await expectNoSeriousViolations(page, "message not sent");

  const retry = page.waitForResponse(
    (r) => /\/messages\/[^/]+\/retry$/.test(r.url()) && r.request().method() === "POST",
  );
  await row.getByRole("button", { name: "Retry sending" }).click();
  expect((await retry).status()).toBe(200);
  // It is the same message: still one copy, and it ends as Not sent again because delivery is forced to fail.
  await expect(row).toHaveCount(1);
  await expect(row.getByText(/^Not sent\./)).toBeVisible({ timeout: 20_000 });
  await expect(row.getByRole("button", { name: "Retry sending" })).toBeVisible();

  await page.goto("/messages");
  await expect(
    page.getByText(/of your messages (was|were) not sent|1 of your messages was not sent/),
  ).toBeVisible();
  await expectNoSeriousViolations(page, "messages list with a failed message");
});
