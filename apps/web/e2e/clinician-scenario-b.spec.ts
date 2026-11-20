import { expectNoSeriousViolations } from "./fixtures";
import {
  desktopOnly,
  expect,
  teamPatient,
  screenshot,
  signInClinician,
  test,
} from "./clinician-helpers";

/**
 * Scenario B at 1440 by 900: build a plan from the library, set dose and weekly schedule, add a goal
 * and instructions, reorder with the move buttons, rely on autosave (reload keeps the draft), check
 * the patient preview, publish version 2 with the required patient-facing note, and read the history.
 * The patient is the first non-persona patient on the clinician\'s care team (published plan, no login needed).
 */
desktopOnly();

test("Scenario B: draft, autosave, reorder, preview, publish version 2 with a note, history", async ({
  page,
}) => {
  await signInClinician(page);
  const patient = await teamPatient(page, 0, { exactly: 1 });
  const ivy = patient.id;

  // An exercise the current plan does not have.
  const choice = await page.evaluate(async (id) => {
    const plan = (await (await fetch(`/api/patients/${id}/care-plan`)).json()) as {
      plan: { items: { exercise: { id: string; name: string } }[] };
    };
    const have = new Set(plan.plan.items.map((i) => i.exercise.id));
    const lib = (await (await fetch(`/api/exercises?limit=100`)).json()) as {
      items: { id: string; name: string }[];
    };
    const pick = lib.items.find((e) => !have.has(e.id));
    return { name: pick!.name, existing: plan.plan.items.map((i) => i.exercise.name) };
  }, ivy);

  await page.goto(`/patients/${ivy}`);
  await page.getByRole("link", { name: "Open care plan builder" }).click();
  await expect(page).toHaveURL(new RegExp(`/patients/${ivy}/plan$`));
  const exercises = page.getByRole("list", { name: "Exercises in this plan" });
  await expect(exercises.getByRole("listitem")).toHaveCount(choice.existing.length);
  await expect(
    page.getByText(/The patient sees version 1 until you publish version 2/),
  ).toBeVisible();

  // Library search and filter.
  const search = page.getByLabel("Search the library");
  await search.fill(choice.name);
  await expect(
    page.getByRole("list", { name: "Exercise library" }).getByRole("listitem"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: `Add ${choice.name} to the plan` }).click();
  await expect(page.getByRole("button", { name: `${choice.name} is in the plan` })).toBeVisible();
  await expect(exercises.getByRole("listitem")).toHaveCount(choice.existing.length + 1);

  const added = exercises.getByRole("listitem", {
    name: new RegExp(`${choice.existing.length + 1}\\. ${choice.name}`),
  });
  await added.getByLabel("Repetitions").fill("12");
  await added.getByLabel("Sets").fill("3");
  await added.getByRole("checkbox", { name: "Tuesday" }).click();
  await expect(added.getByRole("checkbox", { name: "Tuesday" })).toBeChecked();
  await added
    .getByLabel("Instructions for the patient (optional)")
    .fill("Move slowly and stay in a comfortable range.");

  await page
    .getByLabel(/^Plan instructions/)
    .fill("Do these three days a week. Stop and tell your therapist if anything feels sharp.");
  await page.getByRole("button", { name: "Add a goal" }).click();
  const goal = page.getByRole("group", { name: /^Goal \d+ fields$/ }).last();
  await goal.getByRole("textbox", { name: /^Goal \d+$/ }).fill("Walk to the mailbox and back");
  await goal.getByLabel("Target").fill("400");
  await goal.getByLabel("Unit").fill("meters");

  // Reorder with buttons, no drag: the new exercise moves above the last existing one.
  await page.getByRole("button", { name: `Move ${choice.name} up` }).click();
  const names = await exercises.getByRole("heading", { level: 3 }).allTextContents();
  expect(names.at(-2)).toContain(choice.name);
  await expect(page.getByRole("status").filter({ hasText: "moved to position" })).toBeAttached();
  // No drag handles anywhere in the builder.
  await expect(page.locator("[draggable='true']")).toHaveCount(0);

  // Autosave: the status says so, and a reload keeps everything.
  await expect(page.getByText(/Draft saved at/)).toBeVisible();
  await expectNoSeriousViolations(page, "plan builder with edits");
  await screenshot(page, "plan-builder-edited", 1440);
  await page.reload();
  await expect(exercises.getByRole("listitem")).toHaveCount(choice.existing.length + 1);
  const afterReload = await exercises.getByRole("heading", { level: 3 }).allTextContents();
  expect(afterReload).toEqual(names);
  await expect(
    page
      .getByRole("group", { name: /^Goal \d+ fields$/ })
      .last()
      .getByRole("textbox", { name: /^Goal \d+$/ }),
  ).toHaveValue("Walk to the mailbox and back");

  // The draft is not what the patient has: the current plan is still version 1 (AC-B1).
  const current = await page.evaluate(async (id) => {
    const body = (await (await fetch(`/api/patients/${id}/care-plan`)).json()) as {
      plan: { version: { number: number }; items: { exercise: { name: string } }[] };
    };
    return {
      version: body.plan.version.number,
      names: body.plan.items.map((i) => i.exercise.name),
    };
  }, ivy);
  expect(current.version).toBe(1);
  expect(current.names).not.toContain(choice.name);

  // Preview matches the patient rendering and carries the fixed copy.
  await page.getByRole("tab", { name: "Patient preview" }).click();
  await expect(page.getByText("Preview, not published")).toBeVisible();
  await expect(page.getByText("3 sets of 12 repetitions").first()).toBeVisible();
  await expect(page.getByText("Set by your care team").first()).toBeVisible();
  await expect(
    page
      .getByRole("article")
      .getByText("These exercises are fictional and have not been medically reviewed."),
  ).toBeVisible();
  await expect(page.getByText("Walk to the mailbox and back")).toBeVisible();
  await page.getByRole("tab", { name: "Build" }).click();

  // Publish: version 2 needs a note to the patient.
  await page.getByRole("button", { name: /Review and publish version 2/ }).click();
  const dialog = page.getByRole("dialog", { name: "Publish version 2" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`Added: ${choice.name}`)).toBeVisible();
  await expectNoSeriousViolations(page, "publish dialog");
  await dialog.getByRole("button", { name: "Publish version 2" }).click();
  await expect(
    dialog.getByText("Write a short note for the patient about what changed."),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
  const note =
    "Added one exercise for your hip and a short walking goal. This follows what we talked about at your visit.";
  await dialog.getByLabel(/^Note to the patient/).fill(note);
  await dialog.getByRole("button", { name: "Publish version 2" }).click();

  // Back on the record: version 2 is current, with the note and the computed change.
  await expect(page).toHaveURL(new RegExp(`/patients/${ivy}\\?tab=plan$`));
  await expect(page.getByText("Version 2 published", { exact: false }).first()).toBeVisible();
  const currentPlan = page
    .getByRole("region", { name: /Current plan/ })
    .or(page.locator("#current-plan-heading").locator("xpath=ancestor::section"));
  await expect(currentPlan.getByText(note)).toBeVisible();
  await expect(currentPlan.getByText(`Added: ${choice.name}`)).toBeVisible();

  const history = page.locator("#versions-heading").locator("xpath=ancestor::section");
  await expect(history.getByText("Version 2")).toBeVisible();
  await expect(history.getByText("Version 1")).toBeVisible();
  await history.getByRole("button", { name: "View version 1" }).click();
  const drawer = page.getByRole("dialog", { name: "Version 1" });
  await expect(drawer.getByText("Earlier version")).toBeVisible();
  await expect(drawer.getByText(choice.name)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expectNoSeriousViolations(page, "record plan tab after publish");

  // Immutable history: the record history lists the publication.
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText("Plan version published").first()).toBeVisible();
});
