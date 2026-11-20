import { expectNoSeriousViolations } from "./fixtures";
import {
  desktopOnly,
  expect,
  patientApi,
  screenshot,
  signInClinician,
  test,
} from "./clinician-helpers";

/**
 * Scenario D at 1440 by 900. A patient submits a check-in at the pain threshold through the API
 * (the patient screens belong to WP 3.2b); the clinician then finds the task in the review queue,
 * reads why it appeared, opens its source check-in, takes it, marks the check-in reviewed and
 * resolves it with a note. Copy stays rule-based: no score and no prediction.
 */
desktopOnly();

test("Scenario D: a threshold check-in becomes one task the clinician reviews and resolves", async ({
  page,
  baseURL,
}) => {
  const patient = await patientApi("patient.noai@carepath.test", baseURL!);
  const created = await patient.api.post(`/api/patients/${patient.patientId}/check-ins`, {
    headers: { "x-csrf-token": patient.csrf },
    data: {
      sessionId: null,
      painScore: 7,
      difficulty: "harder",
      notes: "Sore after the walking exercise.",
    },
  });
  expect(created.status()).toBe(201);
  const result = (await created.json()) as { checkIn: { id: string }; painNotice: unknown };
  const checkInId = result.checkIn.id;
  await patient.dispose();

  await signInClinician(page);
  await page
    .getByRole("navigation", { name: "Clinician" })
    .getByRole("link", { name: "Review queue" })
    .click();
  await expect(page).toHaveURL(/\/review-queue/);
  await expect(page.getByRole("heading", { level: 1, name: "Review queue" })).toBeVisible();

  // Prioritised: the list is in the order the API ranks it (priority, then oldest).
  const ranked = await page.evaluate(async () => {
    const body = (await (await fetch("/api/review-tasks?limit=50")).json()) as {
      items: { id: string; patient: { familyName: string }; explanation: string }[];
    };
    return body.items.map((t) => ({ family: t.patient.familyName, explanation: t.explanation }));
  });
  const list = page.getByRole("table", { name: "Review tasks" });
  await expect(list.getByRole("button")).toHaveCount(ranked.length);
  const shown = await list
    .locator("tbody tr")
    .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
  ranked.forEach((expected, i) => {
    expect(shown[i]).toContain(expected.family);
    expect(shown[i]).toContain(expected.explanation);
  });

  // The new task: one, for Noel, with the rule's own explanation.
  const mineRow = list.getByRole("row", { name: /Noel Noaipatient.*Reported pain 7 of 10/ });
  await expect(mineRow).toHaveCount(1);
  await mineRow.getByRole("button").click();

  const why = page
    .getByRole("heading", { level: 3, name: "Why this appeared" })
    .locator("xpath=..");
  await expect(
    why.getByText("Reported pain 7 of 10. Clinic rule: 7 or higher.").first(),
  ).toBeVisible();
  await expect(why.getByText("Reported pain", { exact: true })).toBeVisible();
  await expect(why.getByText("Value read")).toBeVisible();
  await expect(why.getByText("Clinic threshold")).toBeVisible();
  // Rule-based, never predictive.
  await expect(page.getByText(/predict nothing/).first()).toBeVisible();
  await expect(
    page.getByText(/risk score|likelihood|probability|predicted|will deteriorate/i),
  ).toHaveCount(0);
  await expectNoSeriousViolations(page, "review queue with a selected task");
  await screenshot(page, "review-queue-task", 1440);

  // The source link opens the check-in, highlighted.
  await page.getByRole("link", { name: "Open the check-in this came from" }).click();
  await expect(page).toHaveURL(new RegExp(`tab=check-ins&checkIn=${checkInId}`));
  const row = page.locator(`#check-in-${checkInId}`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("7 of 10");
  await expect(row).toContainText("Mark reviewed");
  await expectNoSeriousViolations(page, "linked check-in");
  await page.goBack();

  // Take the task, mark the check-in reviewed, then resolve with a note.
  await page
    .getByRole("table", { name: "Review tasks" })
    .getByRole("row", { name: /Noel Noaipatient.*Reported pain 7 of 10/ })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: "Assign to me" }).click();
  await expect(page.getByText("Task assigned to you", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Terry Demotherapist", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Mark check-in reviewed" }).click();
  await expect(page.getByText("Check-in marked reviewed", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Resolve with a note" }).click();
  const dialog = page.getByRole("dialog", { name: "Resolve this task" });
  await dialog.getByRole("button", { name: "Resolve task" }).click();
  await expect(dialog.getByText("Write a short note before you continue.")).toBeVisible();
  await dialog
    .getByLabel(/^Note/)
    .fill("Called the patient. Sore after walking. Reduced the walking time for this week.");
  await dialog.getByRole("button", { name: "Resolve task" }).click();
  await expect(page.getByText("Task resolved", { exact: true }).first()).toBeVisible();

  // It left the open queue (AC-D5) and kept its history with resolver and time.
  await expect(
    page
      .getByRole("table", { name: "Review tasks" })
      .getByRole("row", { name: /Noel Noaipatient.*Reported pain 7 of 10/ }),
  ).toHaveCount(0);
  await page.getByLabel("Show").click();
  await page.getByRole("option", { name: "Resolved and dismissed" }).click();
  const closed = page
    .getByRole("table", { name: "Review tasks" })
    .getByRole("row", { name: /Noel Noaipatient.*Reported pain 7 of 10/ });
  await expect(closed).toBeVisible();
  // A closed task shows its status in words; the raw enum never appears.
  await expect(closed.getByText("Resolved", { exact: true })).toBeVisible();
  await closed.getByRole("button").click();
  await expect(page.getByRole("heading", { level: 3, name: "Resolved" })).toBeVisible();
  await expect(page.getByText("Note: Called the patient.")).toBeVisible();
  await expect(page.getByText("Terry Demotherapist").first()).toBeVisible();
  await expectNoSeriousViolations(page, "resolved task");

  // Empty state names the last check (AC-D6): nothing is assigned to a fresh filter.
  await page.goto("/review-queue?assigned=unassigned&rule=missing_intake&status=closed");
  await expect(page.getByRole("heading", { name: "No tasks match these filters" })).toBeVisible();
  await page.goto("/review-queue?assigned=me&rule=missing_intake");
  await expect(page.getByRole("heading", { name: "No tasks match these filters" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters" }).last()).toBeVisible();
  await expect(page.getByText(/Last checked \d{1,2}:\d{2}/)).toBeVisible();
  await expectNoSeriousViolations(page, "empty review queue");
  await screenshot(page, "review-queue-empty", 1440);
});
