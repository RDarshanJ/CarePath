import { defineConfig } from "@playwright/test";

/**
 * D-WP-4: axe on every story of the static Storybook build (packages/ui/.storybook-static) at 375 and
 * 1440. Separate from the app's end-to-end stage: it needs no API, database or `next start`, only the
 * static folder, which serve-static.mjs serves. Run through scripts/gate-wp-d4.sh (system Chrome, see
 * e2e/playwright.config.ts for why).
 */
const port = process.env["STORYBOOK_PORT"] ?? "6104";
const chrome = process.env["PLAYWRIGHT_CHROME_PATH"];

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: "../.playwright-results-storybook",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
    launchOptions: { ...(chrome ? { executablePath: chrome } : {}), args: ["--no-sandbox"] },
  },
  webServer: {
    command: "node serve-static.mjs",
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { STORYBOOK_PORT: port },
  },
  projects: [
    { name: "phone-375", use: { viewport: { width: 375, height: 812 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
