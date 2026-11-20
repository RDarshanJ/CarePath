import { defineConfig } from "@playwright/test";

/**
 * End-to-end stage of `pnpm verify` (WP 3.2a). Runs against `next start` and the API started by
 * scripts/e2e.sh on the gate's ports, with system Chrome (PLAYWRIGHT_CHROME_PATH): the Playwright
 * CDN is blocked in the build environment (docs/decisions/tooling-probe.md). The pairing of
 * Playwright 1.65.1 with system Chrome 153 is unverified beyond these tests.
 * Use 127.0.0.1, not localhost: the API's Origin check lists exactly http://127.0.0.1:<web port>.
 */
const webPort = process.env["WEB_PORT"] ?? "3090";
const chrome = process.env["PLAYWRIGHT_CHROME_PATH"];

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "../.playwright-results",
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "off",
    launchOptions: {
      ...(chrome ? { executablePath: chrome } : {}),
      args: ["--no-sandbox"],
    },
  },
  projects: [
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
});
