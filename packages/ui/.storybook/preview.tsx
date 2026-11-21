import { useEffect, type ReactNode } from "react";
import type { Decorator, Preview } from "@storybook/react-vite";
import { ThemeScope, type ThemeName } from "../src";
import "../src/fonts";
import "./preview.css";

/*
 * Every story renders inside a ThemeScope. The toolbar switches the token theme (patient or clinician)
 * through data-theme; the Playwright spec sets the same global from the URL (globals=theme:clinician).
 * Portalled overlays take the theme from ThemeScope's context, and the iframe body gets the theme's
 * canvas colour so a story is judged on the same background as the app.
 */
function ThemeFrame({ theme, children }: { theme: ThemeName; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    document.body.classList.add("bg-bg", "text-ink");
  }, [theme]);
  return (
    <ThemeScope theme={theme} className="min-h-screen bg-bg p-4 text-ink sm:p-6">
      <div id="story-main" className="mx-auto max-w-5xl">
        {children}
      </div>
    </ThemeScope>
  );
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame theme={context.globals["theme"] === "clinician" ? "clinician" : "patient"}>
    <Story />
  </ThemeFrame>
);

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Token theme (data-theme)",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        dynamicTitle: true,
        items: [
          { value: "patient", title: "Patient" },
          { value: "clinician", title: "Clinician" },
        ],
      },
    },
  },
  initialGlobals: {
    theme: "patient",
    // The addon's panel runs axe on request; an automatic run on load would collide with the Playwright spec's run.
    a11y: { manual: true },
    viewport: { value: "desktop1440", isRotated: false },
  },
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    options: { storySort: { order: ["Primitives", "Composed", "Healthcare"] } },
    viewport: {
      options: {
        mobile375: {
          name: "Phone, 375 px",
          styles: { width: "375px", height: "812px" },
          type: "mobile",
        },
        desktop1440: {
          name: "Desktop, 1440 px",
          styles: { width: "1440px", height: "900px" },
          type: "desktop",
        },
      },
    },
    a11y: { test: "error" },
  },
};

export default preview;
