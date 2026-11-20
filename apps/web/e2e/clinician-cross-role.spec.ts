import { expectNoSeriousViolations, signInWithForm } from "./fixtures";
import { desktopOnly, expect, findPatientId, signInClinician, test } from "./clinician-helpers";

/**
 * Cross-role: the clinician publishes a new plan version for Noel Noaipatient, then Noel signs in as a
 * patient (a separate browser context, a real sign-in) and sees the new plan, its change note and the
 * exercise that was added. Nothing is read from the clinician's session.
 */
desktopOnly();

test("a plan published by the clinician reaches the patient with its change note", async ({
  page,
  browser,
}) => {
  await signInClinician(page);
  const noel = await findPatientId(page, "Noaipatient");

  const before = await page.evaluate(async (id) => {
    const plan = (await (await fetch(`/api/patients/${id}/care-plan`)).json()) as {
      plan: { version: { number: number }; items: { exercise: { id: string } }[] };
    };
    const have = new Set(plan.plan.items.map((i) => i.exercise.id));
    const lib = (await (await fetch(`/api/exercises?limit=100`)).json()) as {
      items: { id: string; name: string }[];
    };
    return {
      version: plan.plan.version.number,
      added: lib.items.find((e) => !have.has(e.id))!.name,
    };
  }, noel);

  await page.goto(`/patients/${noel}/plan`);
  await expect(
    page.getByRole("heading", { level: 1, name: /Care plan for Noel Noaipatient/ }),
  ).toBeVisible();
  await page.getByLabel("Search the library").fill(before.added);
  await page.getByRole("button", { name: `Add ${before.added} to the plan` }).click();
  await expect(page.getByText(/Draft saved at/)).toBeVisible();

  const next = before.version + 1;
  await page
    .getByRole("button", { name: new RegExp(`Review and publish version ${next}`) })
    .click();
  const dialog = page.getByRole("dialog", { name: `Publish version ${next}` });
  const note =
    "We added one gentle exercise because your last session went well. Tell us how it feels.";
  await dialog.getByLabel(/^Note to the patient/).fill(note);
  await dialog.getByRole("button", { name: `Publish version ${next}` }).click();
  await expect(page).toHaveURL(new RegExp(`/patients/${noel}\\?tab=plan$`));

  // The patient, in a fresh context.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const patientPage = await context.newPage();
  await signInWithForm(patientPage, "patient.noai@carepath.test");
  await expect(patientPage).toHaveURL(/\/today$/);

  const seen = await patientPage.evaluate(async () => {
    const session = (await (await fetch("/api/auth/session")).json()) as { patientId: string };
    const plan = (await (await fetch(`/api/patients/${session.patientId}/care-plan`)).json()) as {
      plan: {
        version: { number: number; changeNoteForPatient: string; publishedBy: { name: string } };
        items: { exercise: { name: string } }[];
        diffFromPrevious: { added: { name: string }[] };
      };
    };
    return {
      patientId: session.patientId,
      version: plan.plan.version.number,
      note: plan.plan.version.changeNoteForPatient,
      author: plan.plan.version.publishedBy.name,
      names: plan.plan.items.map((i) => i.exercise.name),
      added: plan.plan.diffFromPrevious.added.map((a) => a.name),
    };
  });
  expect(seen.patientId).toBe(noel);
  expect(seen.version).toBe(next);
  expect(seen.note).toBe(note);
  expect(seen.names).toContain(before.added);
  expect(seen.added).toEqual([before.added]);
  expect(seen.author).toContain("Terry Demotherapist");

  // The patient screens show it: Today carries the change note, the plan lists the new exercise.
  await expect(patientPage.getByText(note)).toBeVisible();
  await patientPage.goto("/plan");
  await expect(patientPage.getByText(before.added).first()).toBeVisible();
  await expectNoSeriousViolations(patientPage, "patient plan after the clinician published");
  await context.close();
});
