import type { Page } from "@playwright/test";
import { expect } from "./fixtures";
import { radio } from "./patient-helpers";

export const cont = (page: Page) =>
  page.getByRole("button", { name: /^(Continue|Save and continue)$/ }).click();

/** Birth date is three parts (CD-102): day, month by name, year. */
export async function fillBirthDate(page: Page, day: string, month: string, year: string) {
  await page.getByLabel("Day", { exact: true }).fill(day);
  await page.getByLabel("Month", { exact: true }).selectOption({ label: month });
  await page.getByLabel("Year", { exact: true }).fill(year);
}

export interface NewPatient {
  first: string;
  last: string;
  email: string;
  password: string;
  code: string;
  goal: string;
  phone: string;
}

/** Steps 1 and 2: the code and date of birth, then the account. Ends on step 3. */
export async function createAccount(page: Page, p: NewPatient) {
  await expect(
    page.getByRole("heading", { level: 1, name: "Your eligibility code" }),
  ).toBeVisible();
  await page.getByLabel(/^Eligibility code/).fill(p.code);
  await fillBirthDate(page, "2", "June", "1991");
  await cont(page);
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  await page.getByLabel(/^First name/).fill(p.first);
  await page.getByLabel(/^Last name/).fill(p.last);
  await page.getByLabel(/^Email/).fill(p.email);
  await page.getByLabel(/^Create a password/).fill(p.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "About you" })).toBeVisible();
}

/** Steps 3 to 11 with the smallest valid answers. Ends on the done screen. */
export async function completeIntake(page: Page, p: NewPatient) {
  await page.getByLabel(/^Phone number/).fill(p.phone);
  await cont(page);
  await expect(page.getByRole("heading", { level: 1, name: "Your goal" })).toBeVisible();
  await page.getByLabel(/^What would you like/).fill(p.goal);
  await cont(page);
  await expect(page.getByRole("heading", { level: 1, name: "Where it bothers you" })).toBeVisible();
  await page.getByRole("radio", { name: "Lower back", exact: true }).click();
  await page.getByRole("radio", { name: "Left side" }).click();
  await cont(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Pain right now and this week" }),
  ).toBeVisible();
  await radio(page, "At its worst in the last week?", "6 of 10").click();
  await radio(page, "At its best in the last week?", "2 of 10").click();
  await radio(page, "How much does it hurt right now?", "4 of 10").click();
  await cont(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "What is hard right now" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Walking" }).click();
  await cont(page);
  await expect(page.getByRole("heading", { level: 1, name: "Your therapist" })).toBeVisible();
  await cont(page);
  await expect(page.getByRole("heading", { level: 1, name: "When you can come in" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Monday" }).click();
  await page.getByRole("checkbox", { name: "Morning" }).click();
  await cont(page);
  await expect(page.getByRole("heading", { level: 1, name: "Sharing and consent" })).toBeVisible();
  await page.getByRole("checkbox", { name: /I agree to treatment and data use/ }).click();
  await page.getByRole("radio", { name: "No, do not allow them" }).click();
  await cont(page);
  await expect(page.getByRole("heading", { level: 1, name: "Review and send" })).toBeVisible();
  await page.getByRole("checkbox", { name: "These answers are right." }).click();
  await page.getByRole("button", { name: "Send to the clinic" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your details are with the clinic" }),
  ).toBeVisible();
}
