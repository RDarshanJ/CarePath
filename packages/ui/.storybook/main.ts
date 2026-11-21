import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";
import type { StorybookConfig } from "@storybook/react-vite";

/*
 * Storybook for packages/ui (D-WP-4, rebuild plan section 6). One story per exported component, each
 * showing its states on synthetic content. The static build is scanned by Playwright and axe.
 *
 * Tailwind is compiled by the same PostCSS plugin the web app uses. It is resolved from apps/web, which
 * already depends on it, so this package takes on no dependency the advisor did not approve.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const requireFromWeb = createRequire(path.resolve(here, "../../../apps/web/package.json"));
const tailwindPostcss = requireFromWeb("@tailwindcss/postcss") as () => unknown;

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  typescript: { reactDocgen: false },
  viteFinal: (base) =>
    mergeConfig(base, {
      plugins: [react()],
      css: { postcss: { plugins: [tailwindPostcss()] } },
    }),
};

export default config;
