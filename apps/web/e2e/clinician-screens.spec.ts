import { expectNoSeriousViolations } from "./fixtures";
import {
  desktopOnly,
  expect,
  findPatientId,
  screenshot,
  signInClinician,
  test,
} from "./clinician-helpers";

/**
 * Every clinician screen: it loads real data, has its heading, passes axe (no serious or critical
 * findings), shows the demonstration notice, and is screenshotted at 1440 and 1024.
 */
desktopOnly();

test("clinician screens: content, axe and screenshots at 1440 and 1024", async ({ page }) => {
  await signInClinician(page);

  const dana = await findPatientId(page, "Demopatient");
  const stops: { name: string; url: string; ready: (width: number) => Promise<void> }[] = [
    {
      name: "overview",
      url: "/overview",
      ready: async () => {
        await expect(
          page.getByRole("heading", { level: 2, name: /Your review tasks/ }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { level: 2, name: /Check-ins not yet reviewed/ }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { level: 2, name: /Missed activity/ }),
        ).toBeVisible();
        await expect(page.getByRole("heading", { level: 2, name: /Plan updates/ })).toBeVisible();
        await expect(page.getByText("On track")).toHaveCount(0);
      },
    },
    {
      name: "patients",
      url: "/patients",
      ready: async () => {
        await expect(page.getByRole("table", { name: "Patients" })).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Demopatient", exact: false }).first(),
        ).toBeVisible();
      },
    },
    {
      name: "patients-filtered",
      url: "/patients?status=active&plan=published&sort=-lastActivity",
      ready: async () => {
        await expect(page.getByRole("link", { name: /Demopatient/ })).toBeVisible();
        await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
      },
    },
    {
      name: "record-overview",
      url: `/patients/${dana}`,
      ready: async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: /Dana Demopatient/ }),
        ).toBeVisible();
        await expect(page.getByRole("heading", { level: 2, name: "Timeline" })).toBeVisible();
        await expect(
          page.getByRole("heading", { level: 2, name: "What the patient told us at intake" }),
        ).toBeVisible();
        await expect(page.getByText("Pain (patient-reported)").first()).toBeVisible();
        await expect(
          page
            .getByRole("list")
            .getByText(/published/)
            .first(),
        ).toBeVisible();
      },
    },
    {
      name: "record-plan",
      url: `/patients/${dana}?tab=plan`,
      ready: async () => {
        await expect(
          page.getByRole("heading", { level: 2, name: "Version history" }),
        ).toBeVisible();
        await expect(page.getByText("Set by your care team").first()).toBeVisible();
      },
    },
    {
      name: "record-activity",
      url: `/patients/${dana}?tab=activity`,
      ready: async () => {
        await expect(
          page.getByRole("heading", { level: 2, name: "Weekly sessions" }),
        ).toBeVisible();
        await expect(page.getByText("Patient-reported pain").first()).toBeVisible();
      },
    },
    {
      name: "record-check-ins",
      url: `/patients/${dana}?tab=check-ins`,
      ready: async () => {
        await expect(page.getByRole("heading", { level: 2, name: "Check-ins" })).toBeVisible();
      },
    },
    {
      name: "record-history",
      url: `/patients/${dana}?tab=history`,
      ready: async () => {
        await expect(page.getByRole("heading", { level: 2, name: "Record history" })).toBeVisible();
      },
    },
    {
      name: "plan-builder",
      url: `/patients/${dana}/plan`,
      ready: async () => {
        await expect(
          page.getByRole("heading", { level: 1, name: /Care plan for Dana Demopatient/ }),
        ).toBeVisible();
        await expect(page.getByRole("list", { name: "Exercises in this plan" })).toBeVisible();
      },
    },
    {
      name: "review-queue",
      url: "/review-queue",
      ready: async (width) => {
        const table = page.getByRole("table", { name: "Review tasks" });
        await expect(table).toBeVisible();
        if (width < 1280) {
          // Below 1280 the task opens as a side panel instead of a second column.
          await table.getByRole("button").first().click();
          await expect(page.getByRole("dialog")).toBeVisible();
          // The selection is in the address before axe runs, so the page title has settled.
          await expect(page).toHaveURL(/task=/);
        }
        await expect(
          page.getByRole("heading", { level: 3, name: "Why this appeared" }),
        ).toBeVisible();
        await expect(page.getByText(/predict nothing/).first()).toBeVisible();
      },
    },
  ];

  for (const width of [1440, 1024] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
    for (const stop of stops) {
      await page.goto(stop.url);
      await stop.ready(width);
      // Client navigation updates the document title after the screen paints. Axe's document-title
      // rule must not race it: wait for the title this screen is expected to have.
      await expect(page).toHaveTitle(/\| CarePath$/);
      await expect(
        page.getByText("Demonstration product. Synthetic data. Not for clinical use."),
      ).toBeVisible();
      await expectNoSeriousViolations(page, `${stop.name} at ${width}`);
      // No horizontal overflow of the page itself.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${stop.name} at ${width} scrolls sideways`).toBeLessThanOrEqual(0);
      await screenshot(page, stop.name, width);
    }
  }

  // Plan builder: preview and versions views, and the library drawer below 1280.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/patients/${dana}/plan`);
  await page.getByRole("tab", { name: "Patient preview" }).click();
  await expect(page.getByText("Preview, not published")).toBeVisible();
  await expectNoSeriousViolations(page, "plan builder preview");
  await screenshot(page, "plan-builder-preview", 1440);
  await page.getByRole("tab", { name: "Versions" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Version history" })).toBeVisible();
  await expectNoSeriousViolations(page, "plan builder versions");

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(`/patients/${dana}/plan`);
  await page.getByRole("button", { name: "Add exercises" }).first().click();
  const library = page.getByRole("dialog", { name: "Exercise library" });
  await expect(library).toBeVisible();
  await expectNoSeriousViolations(page, "plan builder library drawer");
  await screenshot(page, "plan-builder-library", 1024);
  await page.keyboard.press("Escape");
  await expect(library).toBeHidden();

  // "See intake" opens the patient's intake in a drawer from the builder.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/patients/${dana}/plan`);
  await page.getByRole("button", { name: "See intake" }).click();
  const drawer = page.getByRole("dialog", { name: /Intake for Dana Demopatient/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Main goal")).toBeVisible();
  await expect(drawer.getByText("Pain (patient-reported)")).toBeVisible();
  await expect(page).toHaveTitle(/\| CarePath$/);
  await expectNoSeriousViolations(page, "plan builder intake drawer");
  await screenshot(page, "plan-builder-intake", 1440);
});

test("review queue: 36 px rows, status only when not open, care-team actions unavailable", async ({
  page,
}) => {
  await signInClinician(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/review-queue");
  const table = page.getByRole("table", { name: "Review tasks" });
  await expect(table).toBeVisible();

  // Rows are 36 px.
  const row = table.getByRole("row").nth(1);
  const box = await row.boundingBox();
  expect(box?.height).toBeLessThanOrEqual(36.5);

  // The count is the API total, and an open task carries no status chip.
  const summary = await page.evaluate(async () => {
    const body = (await (await fetch("/api/review-tasks?limit=100")).json()) as {
      total: number;
      items: { id: string; onCareTeam: boolean; kind: string; status: string }[];
    };
    return body;
  });
  await expect(page.getByRole("heading", { level: 2, name: "Tasks" })).toContainText(
    String(summary.total),
  );
  await expect(table.getByText("Open", { exact: true })).toHaveCount(0);

  // A clinical task for a patient outside the care team: the actions are unavailable, with the reason.
  const outside = summary.items.find((t) => !t.onCareTeam && t.kind === "clinical");
  if (outside) {
    await page.goto(`/review-queue?task=${outside.id}`);
    await expect(page.getByRole("button", { name: "Resolve with a note" })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Assign to me|Unassign/ })).toBeDisabled();
    await expect(page.getByText(/You are not on this patient's care team/)).toBeVisible();
  }
});
