// Starts `next start`, screenshots /design-system at 390, 768 and 1440 wide with the system Chrome, then stops the server.
// Usage: pnpm --filter @carepath/web screenshots   (run `pnpm --filter @carepath/web build` first)
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const PORT = 3107;
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const out = fileURLToPath(new URL("../../../docs/design-system/screenshots/", import.meta.url));
const webDir = fileURLToPath(new URL("..", import.meta.url));
const widths = [390, 768, 1440];

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith(".png")) rmSync(out + f);

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"],
  {
    cwd: webDir,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  },
);
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
};
process.on("exit", stop);

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/design-system`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`next start did not become ready:\n${serverLog}`);
}

let failures = 0;
try {
  await waitReady();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox"],
  });
  for (const width of widths) {
    const ctx = await browser.newContext({
      viewport: { width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const problems = [];
    page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    await page.goto(`${BASE}/design-system`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 0) problems.push(`horizontal overflow of ${overflow}px at ${width}`);
    const fonts = await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => f.status === "loaded")
        .map((f) => `${f.family} ${f.weight}`),
    );
    for (const need of ["IBM Plex Sans 400", "IBM Plex Sans 600", "IBM Plex Mono 400"]) {
      if (!fonts.includes(need)) problems.push(`font not loaded: ${need}`);
    }

    await page.screenshot({ path: `${out}gallery-${width}-top.png` });
    const ids = await page.$$eval("main > section", (els) => els.map((e) => e.id));
    for (const id of ids) {
      await page.locator(`#${id}`).screenshot({ path: `${out}gallery-${width}-${id}.png` });
    }

    // Open overlays in each theme pane and capture the viewport.
    const overlayShots = [
      ["dialog", "Open dialog"],
      ["drawer", "Open side panel"],
      ["sheet", "Open bottom sheet"],
      ["popover", "Why we ask"],
      ["menu", "Actions"],
      ["toast", "Show toast"],
    ];
    for (const [theme, idx] of [
      ["patient", 0],
      ["clinician", 1],
    ]) {
      for (const [name, label] of overlayShots) {
        const trigger = page
          .locator("#overlays")
          .getByRole("button", { name: label, exact: true })
          .nth(idx);
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click();
        await page.waitForTimeout(350);
        if (name === "toast") {
          await page.screenshot({ path: `${out}overlay-${width}-${theme}-${name}.png` });
        } else {
          await page.screenshot({ path: `${out}overlay-${width}-${theme}-${name}.png` });
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
      }
    }
    if (problems.length) {
      failures += problems.length;
      console.error(`FAIL ${width}px:\n  ${problems.join("\n  ")}`);
    } else {
      console.log(
        `ok ${width}px: ${ids.length} sections, no console errors, no horizontal overflow, fonts loaded`,
      );
    }
    await ctx.close();
  }
  await browser.close();
} catch (e) {
  failures++;
  console.error(e);
} finally {
  stop();
}
console.log(`screenshots written to ${out}`);
process.exit(failures ? 1 : 0);
