import { expectNoSeriousViolations } from "./fixtures";
import {
  desktopOnly,
  expect,
  teamPatient,
  signInClinician,
  tabTo,
  test,
} from "./clinician-helpers";

/**
 * Keyboard-only pass of the plan builder at 1440 by 900 (PRD section 14, AC-B8): after the page is
 * loaded, everything is done with Tab, Shift+Tab, Enter, Space, arrows and Escape. Every stop
 * has a visible focus indicator. The patient is a non-persona patient on the care team whose plan is at version 2 or later.
 */
desktopOnly();

test("plan builder works by keyboard alone, with visible focus and Escape closing overlays", async ({
  page,
}) => {
  await signInClinician(page);
  const maple = (await teamPatient(page, 0, { atLeast: 2 })).id;

  const pick = await page.evaluate(async (id) => {
    const plan = (await (await fetch(`/api/patients/${id}/care-plan`)).json()) as {
      plan: { version: { number: number }; items: { exercise: { id: string } }[] };
    };
    const have = new Set(plan.plan.items.map((i) => i.exercise.id));
    const lib = (await (await fetch(`/api/exercises?limit=100`)).json()) as {
      items: { id: string; name: string }[];
    };
    return {
      version: plan.plan.version.number,
      name: lib.items.find((e) => !have.has(e.id))!.name,
    };
  }, maple);
  const next = pick.version + 1;

  await page.goto(`/patients/${maple}/plan`);
  await expect(page.getByRole("heading", { level: 1, name: /Care plan for/ })).toBeVisible();

  // Skip link and first stops show a focus ring.
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: s.outlineWidth, tag: el.tagName };
  });
  expect(outline.style).not.toBe("none");

  // Library: search, then add with Enter.
  const search = page.getByLabel("Search the library");
  await tabTo(page, search);
  await page.keyboard.type(pick.name);
  const add = page.getByRole("button", { name: `Add ${pick.name} to the plan` });
  await expect(add).toBeVisible();
  await tabTo(page, add);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: `${pick.name} added at position` }),
  ).toBeAttached();

  // The skip link jumps past the library to the plan title; Shift+Tab reaches it from the library.
  const skip = page.getByRole("link", { name: "Skip the library and go to the plan" });
  await tabTo(page, skip, 300, "Shift+Tab");
  expect(await skip.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel(/^Plan title/)).toBeFocused();

  // Every focus stop between here and the item's controls has a visible indicator.
  const item = page.getByRole("listitem", { name: new RegExp(pick.name) });
  const moveUp = item.getByRole("button", { name: `Move ${pick.name} up` });
  await tabTo(page, moveUp);
  const focusIndicator = await moveUp.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(focusIndicator).not.toBe("none");

  // Reorder with Enter on the move buttons; focus stays on a move button.
  await page.keyboard.press("Enter");
  const heads = await page
    .getByRole("list", { name: "Exercises in this plan" })
    .getByRole("heading", { level: 3 })
    .allTextContents();
  expect(heads.at(-2)).toContain(pick.name);
  const stillOnMove = await page.evaluate(
    () => document.activeElement?.getAttribute("aria-label") ?? "",
  );
  expect(stillOnMove).toContain(pick.name);
  await tabTo(page, item.getByRole("button", { name: `Move ${pick.name} down` }));
  await page.keyboard.press("Enter");
  const back = await page
    .getByRole("list", { name: "Exercises in this plan" })
    .getByRole("heading", { level: 3 })
    .allTextContents();
  expect(back.at(-1)).toContain(pick.name);

  // Dose and schedule by keyboard: Repetitions, then a day checkbox with Space.
  const reps = item.getByLabel("Repetitions");
  await tabTo(page, reps);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("15");
  const saturday = item.getByRole("checkbox", { name: "Saturday" });
  await tabTo(page, saturday);
  await page.keyboard.press("Space");
  await expect(saturday).toBeChecked();

  await expect(page.getByText(/Draft saved at/)).toBeVisible();
  await expectNoSeriousViolations(page, "plan builder, keyboard pass");

  // Publish: Enter opens the dialog, Escape closes it and focus returns to the button.
  const publish = page.getByRole("button", {
    name: new RegExp(`Review and publish version ${next}`),
  });
  await tabTo(page, publish);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: `Publish version ${next}` });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(publish).toBeFocused();

  // Again: type the note, Tab to Publish, Enter.
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  const note = dialog.getByLabel(/^Note to the patient/);
  await tabTo(page, note);
  await page.keyboard.type("Added one exercise and changed the repetitions. Tell us how it feels.");
  await tabTo(page, dialog.getByRole("button", { name: `Publish version ${next}` }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/patients/${maple}\\?tab=plan$`));
  await expect(page.getByText(`Added: ${pick.name}`)).toBeVisible();
});
