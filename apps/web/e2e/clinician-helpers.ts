import { mkdirSync } from "node:fs";
import { request, type APIRequestContext, type Page } from "@playwright/test";
import { accounts, expect, PASSWORD, signInWithForm, test as base } from "./fixtures";

/** Helpers for the clinician specs (WP 3.3). Real sign-ins, real API calls, no fixtures or mocks. */
export const test = base;
export { expect };

/** Screenshots are written only when SCREENSHOT_DIR is set (a work package gate); a plain run leaves the tree alone. */
export const SHOTS = process.env["SCREENSHOT_DIR"];

/** Clinician specs run at the desktop width only; the mobile project has nothing to check here. */
export function desktopOnly() {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 1200,
    "The clinician workspace is a desktop screen set",
  );
}

export async function signInClinician(page: Page) {
  await signInWithForm(page, accounts.physical_therapist.email);
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
}

export async function screenshot(page: Page, name: string, width: 1440 | 1024) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}-${width}.png`, fullPage: false });
}

export interface PatientApi {
  api: APIRequestContext;
  patientId: string;
  csrf: string;
  dispose: () => Promise<void>;
}

/** A signed-in API session for a seeded patient, used to create real check-ins and read the patient's own plan. */
export async function patientApi(email: string, baseURL: string): Promise<PatientApi> {
  const api = await request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
  const login = await api.post("/api/auth/login", { data: { email, password: PASSWORD } });
  expect(login.ok(), `patient login ${email}`).toBe(true);
  const session = (await login.json()) as { patientId: string; csrfToken: string };
  return {
    api,
    patientId: session.patientId,
    csrf: session.csrfToken,
    dispose: () => api.dispose(),
  };
}

/** The first patient record whose name matches, found through the real directory search. */
export async function findPatientId(page: Page, query: string): Promise<string> {
  const result = await page.evaluate(async (q) => {
    const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}&limit=5`);
    return (await res.json()) as { items: { id: string; givenName: string; familyName: string }[] };
  }, query);
  const first = result.items[0];
  expect(first, `patient matching ${query}`).toBeTruthy();
  return first!.id;
}

/** Press Tab until the locator has focus; fails after `max` presses. Keyboard-only navigation. */
export async function tabTo(
  page: Page,
  target: ReturnType<Page["locator"]>,
  max = 300,
  key = "Tab",
) {
  for (let i = 0; i < max; i++) {
    const focused = await target.evaluate((el) => el === document.activeElement).catch(() => false);
    if (focused) return;
    await page.keyboard.press(key);
  }
  throw new Error(`Tab never reached ${String(target)} within ${max} presses`);
}

/**
 * An active patient on the signed-in clinician's care team with a published plan, who is not one of the
 * named demo personas (their surnames end in "patient"). The seed's names can change, so tests pick by
 * these rules (and, when given, the current plan version), in directory name order, not by name.
 */
export async function teamPatient(
  page: Page,
  nth: number,
  version?: { exactly?: number; atLeast?: number },
) {
  const picked = await page.evaluate(
    async ([n, want]) => {
      const session = (await (await fetch("/api/auth/session")).json()) as {
        practitionerId: string;
      };
      const list = (await (
        await fetch(
          `/api/patients?status=active&planStage=published&clinicianId=${session.practitionerId}&sort=name&limit=100`,
        )
      ).json()) as {
        items: {
          id: string;
          givenName: string;
          familyName: string;
          currentVersionNumber: number | null;
        }[];
      };
      const eligible = list.items.filter(
        (i) =>
          !i.familyName.endsWith("patient") &&
          (want?.exactly === undefined || i.currentVersionNumber === want.exactly) &&
          (want?.atLeast === undefined || (i.currentVersionNumber ?? 0) >= want.atLeast),
      );
      const p = eligible[n];
      return p ? { id: p.id, name: `${p.givenName} ${p.familyName}` } : null;
    },
    [nth, version] as const,
  );
  expect(picked, `team patient number ${nth}`).toBeTruthy();
  return picked!;
}
