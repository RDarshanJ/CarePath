import type { Page } from "@playwright/test";
import { accounts, expect, signInWithForm, test } from "./fixtures";

/**
 * WP B-CR, CR-12 and DR-002 R2: a patient name or MRN typed into the search is sent in a request
 * body and never appears in a URL, in the address bar or in any request the browser makes.
 */
const TERM = "Demopatient";

/** Collects every request URL the page makes, so none can carry the term. */
function watch(page: Page) {
  const urls: string[] = [];
  const posts: { url: string; body: string | null }[] = [];
  page.on("request", (r) => {
    urls.push(r.url());
    if (r.method() === "POST" && r.url().includes("/api/patients/search")) {
      posts.push({ url: r.url(), body: r.postData() });
    }
  });
  return { urls, posts };
}

async function expectTermOnlyInBody(page: Page, seen: ReturnType<typeof watch>) {
  // The search runs after a short pause, so wait for the request itself.
  await expect.poll(() => seen.posts.length).toBeGreaterThan(0);
  expect(page.url().toLowerCase()).not.toContain(TERM.toLowerCase());
  expect(page.url()).not.toMatch(/[?&]q=/);
  for (const u of seen.urls) {
    expect(decodeURIComponent(u).toLowerCase(), u).not.toContain(TERM.toLowerCase());
  }
  expect(seen.posts.some((p) => p.body?.includes(TERM))).toBe(true);
}

test("clinician directory: searching puts the term in a POST body, not in any URL", async ({
  page,
}) => {
  const seen = watch(page);
  await signInWithForm(page, accounts.physical_therapist.email);
  await expect(page).toHaveURL(/\/overview$/);
  await page.goto("/patients");
  await page.getByLabel("Search by name or MRN").fill(TERM);
  await expect(page.getByRole("link", { name: new RegExp(TERM) }).first()).toBeVisible();
  await expectTermOnlyInBody(page, seen);
});

test("admin patients: searching puts the term in a POST body, not in any URL", async ({ page }) => {
  const seen = watch(page);
  await signInWithForm(page, accounts.care_coordinator.email);
  await expect(page).toHaveURL(/\/admin\/patients$/);
  await page.getByLabel("Search by name or MRN").fill(TERM);
  // Any result or the empty line: the request has been made once the status text settles.
  await expect.poll(() => seen.posts.length).toBeGreaterThan(0);
  await expectTermOnlyInBody(page, seen);
});
