// Design capture and probe (rebuild plan section 2, gates G4, G5 and G8).
//
// Captures every screen and state of the baseline set (docs/design/baseline/) at six widths with the same
// file names, and writes `_probe.json` next to the images: per image, horizontal overflow, computed
// background colours, every warm background (hue 25 to 65, saturation above 0.10), interactive targets
// under 24 px and under the theme floor (48 px in the patient theme), and axe serious or critical findings
// at 375, 768 and 1440. Later work packages run it for their own screens to produce before and after pairs.
//
// It needs a running API and `next start` against a freshly seeded database (small profile) with the clock
// fixed to the seed anchor; `scripts/design-capture.sh` sets that up under the web lock. Run from apps/web.
//
// Environment:
//   CAPTURE_DIR      required; output directory (created). Use docs/design/after/<wp>/ for a recorded set.
//   WEB_PORT         required; the `next start` port.
//   CAREPATH_FIXED_NOW  browser clock, default the seed anchor 2026-11-19T16:00:00.000Z.
//   SCREENS          optional comma list of screen-name prefixes, for example "clinician-schedule,admin-".
//   WIDTHS           optional comma list, default 375,390,768,1024,1440,1920.
//   PROBE_FAIL_ON    optional comma list of warm, overflow, axe, small: exit 1 when the probe finds one.
//   PLAYWRIGHT_CHROME_PATH  default /usr/bin/google-chrome.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { colours } from "../../../packages/ui/src/tokens/tokens.ts";

const OUT = process.env.CAPTURE_DIR;
const WEB_PORT = process.env.WEB_PORT;
if (!OUT || !WEB_PORT) {
  console.error("design-capture: set CAPTURE_DIR and WEB_PORT (see the header of this file)");
  process.exit(2);
}
const out = resolve(OUT);
const BASE = `http://127.0.0.1:${WEB_PORT}`;
const ANCHOR = process.env.CAREPATH_FIXED_NOW ?? "2026-11-19T16:00:00.000Z";
const PASSWORD = "CarePath-Demo-2026";
const WIDTHS = (process.env.WIDTHS ?? "375,390,768,1024,1440,1920").split(",").map(Number);
const HEIGHT = { 375: 812, 390: 844, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 };
const AXE_WIDTHS = new Set([375, 768, 1440]);
const FILTER = (process.env.SCREENS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const FAIL_ON = new Set(
  (process.env.PROBE_FAIL_ON ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

// Status, data-visualisation and accent tokens may be warm (warning yellow, the orange chart and diverging
// ends). They are reported separately; only a warm colour that is not one of them counts as a finding.
const warmTokenValues = {};
for (const [name, hex] of Object.entries(colours.patient)) {
  if (/^(warning|error|critical|chart|seq|div|success|info|accent)-/.test(name)) {
    const n = parseInt(hex.slice(1), 16);
    warmTokenValues[`${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`] = name;
  }
}

mkdirSync(out, { recursive: true });
const want = (name) => FILTER.length === 0 || FILTER.some((p) => name.startsWith(p));
const probes = [];
const failures = [];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});

async function newPage() {
  const width = WIDTHS[0];
  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport: { width, height: HEIGHT[width] ?? 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(ANCHOR);
  return page;
}

async function signIn(page, email) {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

/** Runs in the page: overflow, backgrounds, warm backgrounds and small targets. */
function probeInPage(warmTokens) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const toRgba = (value) => {
    const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(value);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "transparent";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const hsl = ([r, g, b]) => {
    const [R, G, B] = [r / 255, g / 255, b / 255];
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    const d = max - min;
    if (d === 0) return { h: 0, s: 0 };
    const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
    return { h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(max + min - 1)) };
  };
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls =
      typeof el.className === "string" && el.className
        ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ""}`;
  };
  const visible = (el, r) => {
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };

  const bgs = {};
  const warm = [];
  const warmToken = [];
  for (const el of [
    document.documentElement,
    document.body,
    ...document.body.querySelectorAll("*"),
  ]) {
    const r = el.getBoundingClientRect();
    if (el !== document.documentElement && el !== document.body && !visible(el, r)) continue;
    const raw = getComputedStyle(el).backgroundColor;
    const rgba = toRgba(raw);
    if (rgba[3] === 0) continue;
    // A probe reports computed colours; it styles nothing.
    // eslint-disable-next-line no-restricted-syntax
    const key = `rgb(${rgba.slice(0, 3).join(", ")})${rgba[3] < 1 ? ` a${rgba[3].toFixed(2)}` : ""}`;
    bgs[key] = (bgs[key] ?? 0) + 1;
    const { h, s } = hsl(rgba);
    if (h >= 25 && h <= 65 && s > 0.1) {
      const token = warmTokens[rgba.slice(0, 3).join(",")];
      const entry = { bg: key, el: describe(el), ...(token ? { token } : {}) };
      (token ? warmToken : warm).push(entry);
    }
  }

  const interactive = document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="option"], [tabindex]:not([tabindex="-1"])',
  );
  const small = [];
  const underFloor = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const theme = el.closest("[data-theme]")?.getAttribute("data-theme") ?? "patient";
    const floor = theme === "patient" ? 48 : 24;
    const size = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (r.width < 24 || r.height < 24) small.push(`${describe(el)} ${size}`);
    if (r.width < floor || r.height < floor) underFloor.push(`${theme} ${describe(el)} ${size}`);
  }
  const main = document.querySelector("main [data-theme], main")?.closest("[data-theme]");
  return {
    theme:
      main?.getAttribute("data-theme") ??
      document.querySelector("[data-theme]")?.getAttribute("data-theme") ??
      null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bgs,
    warm,
    warmToken,
    h1: document.querySelector("h1")?.textContent?.trim() ?? null,
    smallTargets: small.length,
    smallTargetList: small.slice(0, 12),
    underThemeFloor: underFloor.length,
    underThemeFloorList: underFloor.slice(0, 12),
  };
}

async function axe(page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
}

/**
 * Captures the page in its current state at every width. Full pages grow the viewport to the document
 * height (a full-page capture would draw sticky bars mid-page); overlays capture the viewport only.
 */
async function capture(page, name, { overlay = false } = {}) {
  if (!want(name)) return;
  for (const width of WIDTHS) {
    const height = HEIGHT[width] ?? 900;
    const file = `${name}-${width}.png`;
    try {
      await page.setViewportSize({ width, height });
      await settle(page);
      const probe = await page.evaluate(probeInPage, warmTokenValues);
      const entry = {
        file,
        url: new URL(page.url()).pathname + new URL(page.url()).search,
        ...probe,
      };
      if (AXE_WIDTHS.has(width)) entry.violations = await axe(page);
      if (!overlay) {
        const full = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width, height: Math.max(height, full) });
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: `${out}/${file}` });
      probes.push(entry);
      const notes = [];
      if (entry.overflowX > 1) notes.push(`overflow ${entry.overflowX}px`);
      if (entry.warm.length) notes.push(`warm ${entry.warm.length}`);
      if (entry.violations?.length) notes.push(`axe ${entry.violations.length}`);
      console.log(`saved ${file}${notes.length ? `  [${notes.join(", ")}]` : ""}`);
    } catch (e) {
      failures.push(`${file}: ${e.message.split("\n")[0]}`);
      console.error(`FAILED ${file}: ${e.message.split("\n")[0]}`);
    }
  }
  await page.setViewportSize({ width: WIDTHS[0], height: HEIGHT[WIDTHS[0]] ?? 900 });
}

async function group(names, fn) {
  if (!names.some(want)) return;
  const page = await newPage();
  try {
    await fn(page);
  } catch (e) {
    failures.push(`${names.join(", ")}: ${e.message.split("\n")[0]}`);
    console.error(`FAILED group ${names[0]}: ${e.message}`);
  } finally {
    await page.context().close();
  }
}

const h1 = (page, name) => page.getByRole("heading", { level: 1, name }).first().waitFor();

// Public: landing, sign-in, sign-in with errors.
await group(["public-"], async (page) => {
  await page.goto("/");
  await h1(page, /Sign in/);
  await capture(page, "public-landing");
  await page.goto("/login");
  await h1(page, /Sign in/);
  await capture(page, "public-sign-in");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("alert").first().waitFor();
  await capture(page, "public-sign-in-errors");
});

// Onboarding, signed out: account, account with errors, eligibility code.
await group(["patient-onboarding-1", "patient-onboarding-2"], async (page) => {
  await page.goto("/onboarding");
  await h1(page, "Create your account");
  await capture(page, "patient-onboarding-1-account");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "to fix" }).waitFor();
  await capture(page, "patient-onboarding-1-account-errors");
  await page.getByLabel(/^First name/).fill("Casey");
  await page.getByLabel(/^Last name/).fill("Morgan");
  await page.getByLabel(/^Email/).fill("casey.morgan.capture@carepath.test");
  await page.getByLabel(/^Password/).fill("a long enough passphrase 2026");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await h1(page, "Your eligibility code");
  await capture(page, "patient-onboarding-2-code");
});

// Onboarding resume: the intake persona lands on its first open step.
await group(["patient-onboarding-resume"], async (page) => {
  await signIn(page, "patient.intake@carepath.test");
  await h1(page, "Pain right now and this week");
  await capture(page, "patient-onboarding-resume-step");
});

// Patient demo: the main screens.
const patientScreens = [
  "patient-today",
  "patient-plan",
  "patient-check-in",
  "patient-progress",
  "patient-appointments",
  "patient-booking",
  "patient-reschedule",
  "patient-messages",
  "patient-message-thread",
  "patient-consent",
];
await group(patientScreens, async (page) => {
  await signIn(page, "patient.demo@carepath.test");
  const visit = async (name, path, heading) => {
    if (!want(name)) return;
    await page.goto(path);
    await h1(page, heading);
    await capture(page, name);
  };
  await visit("patient-today", "/today", "Today");
  await visit("patient-plan", "/plan", "Care plan");
  await visit("patient-check-in", "/check-in", "Daily check-in");
  await visit("patient-progress", "/progress", "Progress");
  await visit("patient-appointments", "/appointments", "Appointments");
  await visit("patient-booking", "/appointments/book", "Book a visit");
  if (want("patient-reschedule")) {
    await page.goto("/appointments");
    await h1(page, "Appointments");
    const href = await page.locator('a[href$="/reschedule"]').first().getAttribute("href");
    await visit("patient-reschedule", href, "Choose a new time");
  }
  await visit("patient-messages", "/messages", "Messages");
  if (want("patient-message-thread")) {
    await page.goto("/messages");
    await h1(page, "Messages");
    const href = await page.locator('a[href^="/messages/"]').first().getAttribute("href");
    await page.goto(href);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await capture(page, "patient-message-thread");
  }
  await visit("patient-consent", "/consent", "Sharing and consent");
});

// Session and discomfort chain, on one persona with a rest day (patient.flare): Today, the session overview,
// the player, paused, the stop confirmation, the pain sheet and the stopped screen. Each state is captured
// at every width before moving on, so all six widths show the same state.
await group(
  ["patient-today-session-persona", "patient-session-", "patient-discomfort-"],
  async (page) => {
    await signIn(page, "patient.flare@carepath.test");
    await h1(page, "Today");
    await capture(page, "patient-today-session-persona");
    await page.getByRole("link", { name: "Start a session anyway" }).click();
    await h1(page, "Today's session");
    await capture(page, "patient-session-intro");
    await page.getByRole("button", { name: "Begin session" }).click();
    await page.waitForURL(/\/session\/[0-9a-f-]{36}$/);
    await page.getByText(/^Exercise 1 of /).waitFor();
    await capture(page, "patient-session-player");
    await page.getByRole("button", { name: "Pause" }).click();
    await h1(page, "Session paused");
    await capture(page, "patient-session-paused");
    await page.getByRole("button", { name: "Resume session" }).click();
    await page.getByText(/^Exercise 1 of /).waitFor();
    await page.getByRole("button", { name: "Stop, this hurts" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Stop session" }).waitFor();
    await capture(page, "patient-discomfort-confirm", { overlay: true });
    await dialog.getByRole("button", { name: "Stop session" }).click();
    await dialog.getByText("Choose how much it hurts").waitFor();
    await dialog.getByRole("radio", { name: /^8 of 10/ }).click();
    await dialog.getByLabel(/^What happened/).fill("Sharp pain on the left side.");
    await capture(page, "patient-discomfort-pain-sheet", { overlay: true });
    await dialog.getByRole("button", { name: "Stop session" }).click();
    await h1(page, "Session stopped");
    await capture(page, "patient-discomfort-stopped");
  },
);

// Clinician (therapist.demo): overview, directory, record tabs, plan builder, queue, schedule, inbox.
await group(["clinician-"], async (page) => {
  await signIn(page, "therapist.demo@carepath.test");
  const visit = async (name, path, heading) => {
    if (!want(name)) return;
    await page.goto(path);
    await h1(page, heading);
    await capture(page, name);
  };
  await visit("clinician-overview", "/overview", "Overview");
  await visit("clinician-patients", "/patients", "Patients");
  await page.goto("/patients");
  await h1(page, "Patients");
  const record = await page
    .getByRole("link", { name: /Demopatient/ })
    .first()
    .getAttribute("href");
  await visit("clinician-record-overview", record, /Demopatient/);
  for (const tab of ["plan", "activity", "appointments", "check-ins", "history"]) {
    await visit(`clinician-record-${tab}`, `${record}?tab=${tab}`, /Demopatient/);
  }
  await visit("clinician-plan-builder", `${record}/plan`, /Care plan for/);
  await visit("clinician-review-queue", "/review-queue", "Review queue");
  await visit("clinician-schedule", "/schedule", "Schedule");
  await visit("clinician-inbox", "/inbox", "Messages");
  if (want("clinician-inbox-thread")) {
    await page.goto("/inbox");
    await h1(page, "Messages");
    const href = await page.locator('a[href^="/inbox?c="]').first().getAttribute("href");
    await visit("clinician-inbox-thread", href, "Messages");
  }
});

// Admin (coordinator.demo): home redirect, patients, assign dialog.
await group(["admin-"], async (page) => {
  await signIn(page, "coordinator.demo@carepath.test");
  if (want("admin-home")) {
    await page.goto("/admin");
    await h1(page, "Patients");
    await capture(page, "admin-home");
  }
  await page.goto("/admin/patients");
  await h1(page, "Patients");
  await capture(page, "admin-patients");
  if (want("admin-assign-dialog")) {
    await page.locator('button[aria-label^="Assign therapist to"]').first().click();
    await page.getByRole("dialog").waitFor();
    await capture(page, "admin-assign-dialog", { overlay: true });
  }
});

// D-WP-2: the /design-system gallery at every width, then explicitly under reduced motion, and at
// 200 percent zoom of a 1280 px window (a 640 CSS px viewport drawn at device scale 2).
await group(["design-system"], async (page) => {
  await page.goto("/design-system");
  await h1(page, "Tokens and components");
  await capture(page, "design-system");
});
if (want("design-system-reduced-motion")) {
  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(ANCHOR);
  try {
    await page.goto("/design-system");
    await h1(page, "Tokens and components");
    await settle(page);
    const anim = await page.evaluate(
      () =>
        [...document.querySelectorAll("*")].filter((el) => {
          const cs = getComputedStyle(el);
          return cs.animationName !== "none" || parseFloat(cs.transitionDuration) > 0;
        }).length,
    );
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 1440, height: full });
    await page.screenshot({ path: `${out}/design-system-reduced-motion-1440.png` });
    probes.push({
      file: "design-system-reduced-motion-1440.png",
      url: "/design-system",
      animatedElements: anim,
      warm: [],
      warmToken: [],
      overflowX: 0,
      underThemeFloor: 0,
      smallTargets: 0,
    });
    console.log(
      `saved design-system-reduced-motion-1440.png  [animated or transitioning elements: ${anim}]`,
    );
    if (anim > 0) failures.push(`design-system-reduced-motion: ${anim} elements still animate`);
  } catch (e) {
    failures.push(`design-system-reduced-motion: ${e.message.split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}
if (want("design-system-zoom-200")) {
  const ctx = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(ANCHOR);
  try {
    await page.goto("/design-system");
    await h1(page, "Tokens and components");
    await settle(page);
    const probe = await page.evaluate(probeInPage, warmTokenValues);
    const full = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 640, height: full });
    await page.screenshot({ path: `${out}/design-system-zoom-200-1280.png` });
    probes.push({ file: "design-system-zoom-200-1280.png", url: "/design-system", ...probe });
    console.log(
      `saved design-system-zoom-200-1280.png${probe.overflowX > 1 ? `  [overflow ${probe.overflowX}px]` : ""}`,
    );
  } catch (e) {
    failures.push(`design-system-zoom-200: ${e.message.split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}

await browser.close();

probes.sort((a, b) => a.file.localeCompare(b.file, "en", { numeric: true }));
writeFileSync(`${out}/_probe.json`, JSON.stringify(probes, null, 1) + "\n");

const count = (pred) => probes.filter(pred).length;
const findings = {
  warm: probes.filter((p) => p.warm.length),
  overflow: probes.filter((p) => p.overflowX > 1),
  axe: probes.filter((p) => p.violations?.length),
  small: probes.filter((p) => p.underThemeFloor > 0),
};
console.log(`\ndesign-capture: ${probes.length} images in ${out}`);
console.log(
  `  warm backgrounds (not a status or chart token): ${count((p) => p.warm.length)} images`,
);
console.log(
  `  warm status or chart token backgrounds (allowed): ${count((p) => p.warmToken.length)} images`,
);
console.log(`  horizontal overflow: ${findings.overflow.length} images`);
console.log(
  `  axe serious or critical (at ${[...AXE_WIDTHS].join(", ")}): ${findings.axe.length} images`,
);
console.log(`  interactive targets under 24 px: ${count((p) => p.smallTargets > 0)} images`);
console.log(`  interactive targets under the theme floor: ${findings.small.length} images`);
for (const p of findings.warm)
  console.log(
    `  warm: ${p.file}: ${p.warm
      .slice(0, 3)
      .map((w) => `${w.bg} ${w.el}`)
      .join("; ")}`,
  );
for (const p of findings.overflow) console.log(`  overflow: ${p.file}: ${p.overflowX}px`);
for (const p of findings.axe) console.log(`  axe: ${p.file}: ${p.violations.join("; ")}`);
let status = failures.length ? 1 : 0;
for (const f of failures) console.error(`  capture failure: ${f}`);
for (const kind of FAIL_ON) {
  if (findings[kind]?.length) {
    console.error(
      `design-capture: PROBE_FAIL_ON=${kind} and ${findings[kind].length} images have it`,
    );
    status = 1;
  }
}
process.exit(status);
