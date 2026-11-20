import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import {
  colours,
  contrastPairs,
  density,
  elevation,
  fonts,
  radius,
  renderTokensCss,
  scrim,
  type ColourTokens,
  type ThemeName,
} from "./tokens";

const themes: ThemeName[] = ["patient", "clinician"];
const threshold = { text: 4.5, ui: 3 } as const;
const srcDir = fileURLToPath(new URL("..", import.meta.url));
const finalJsonPath = fileURLToPath(
  new URL("../../../../docs/design/tokens-final.json", import.meta.url),
);

/** HSL hue (degrees) and saturation (0 to 1) of a 6-digit hex colour. */
function hsl(hex: string): { h: number; s: number } {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return { h: 0, s: 0 };
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: d / (1 - Math.abs(max + min - 1)) };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("WCAG contrast for every foreground/background token pair", () => {
  for (const theme of themes) {
    describe(`${theme} theme`, () => {
      for (const pair of contrastPairs) {
        const min = threshold[pair.rule];
        it(`${pair.fg} on ${pair.bg} >= ${min}:1 (${pair.why})`, () => {
          const ratio = contrastRatio(colours[theme][pair.fg], colours[theme][pair.bg]);
          expect(
            ratio,
            `${pair.fg} ${colours[theme][pair.fg]} on ${pair.bg} ${colours[theme][pair.bg]}`,
          ).toBeGreaterThanOrEqual(min);
        });
      }
    });
  }

  it("covers every status family with a text pair on its own tint", () => {
    for (const s of ["success", "warning", "error", "info", "neutral"]) {
      expect(contrastPairs.some((p) => p.fg === `${s}-ink` && p.bg === `${s}-bg`)).toBe(true);
    }
    expect(
      contrastPairs.some((p) => p.fg === "critical-subtle-ink" && p.bg === "critical-subtle-bg"),
    ).toBe(true);
    expect(contrastPairs.some((p) => p.fg === "ai-ink" && p.bg === "ai-bg")).toBe(true);
    expect(contrastPairs.some((p) => p.fg === "selected-ink" && p.bg === "selected-bg")).toBe(true);
  });

  it("uses link, not primary, as a text colour (DR-001 section 8)", () => {
    expect(contrastPairs.some((p) => p.fg === "primary" && p.rule === "text")).toBe(false);
  });

  it("matches the DR-001 values", () => {
    for (const t of themes) {
      const c = colours[t];
      expect(c.bg).toBe("#F5F7FA");
      expect(c.surface).toBe("#FFFFFF");
      expect(c.ink).toBe("#172B4D");
      expect(c["ink-muted"]).toBe("#42526E");
      expect(c.primary).toBe("#175CD3");
      expect(c["border-control"]).toBe("#697A93");
      expect(c.focus).toBe("#172B4D");
      expect([c["success-ink"], c["success-bg"]]).toEqual(["#05603A", "#ECFDF3"]);
      expect([c["warning-ink"], c["warning-bg"]]).toEqual(["#93370D", "#FEF7C3"]);
      expect([c["error-ink"], c["error-bg"]]).toEqual(["#B42318", "#FEF3F2"]);
      expect([c["info-ink"], c["info-bg"]]).toEqual(["#065986", "#F0F9FF"]);
    }
  });

  it("uses one colour map for both themes", () => {
    expect(colours.clinician).toEqual(colours.patient);
  });

  it("equals docs/design/tokens-final.json (colours, density, fonts, overlay)", () => {
    const final = JSON.parse(readFileSync(finalJsonPath, "utf8")) as {
      colours: Record<ThemeName, Record<string, string>>;
      density: Record<ThemeName, Record<string, unknown>>;
      textExtra: Record<ThemeName, Record<string, [number, number]>>;
      fonts: Record<string, string>;
      overlay: Record<string, string>;
    };
    for (const t of themes) {
      expect({ ...colours[t] }).toEqual(final.colours[t]);
      const { textExtra, ...rest } = density[t];
      expect(rest).toEqual(final.density[t]);
      expect(textExtra).toEqual(final.textExtra[t]);
    }
    expect({ ...fonts }).toEqual(final.fonts);
    expect(scrim).toBe(final.overlay["scrim"]);
    expect(elevation.overlay).toBe(final.overlay["shadow-overlay"]);
  });
});

describe("shape, type and target rules", () => {
  it("never exceeds radius 10", () => {
    expect(Math.max(...Object.values(radius))).toBeLessThanOrEqual(10);
    expect(radius.control).toBe(6);
    expect(radius.container).toBe(10);
  });

  it("uses the plan's type scales and body sizes", () => {
    expect(density.patient.scale).toEqual([15, 17, 20, 24, 32, 40]);
    expect(density.clinician.scale).toEqual([12, 13, 14, 15, 18, 24]);
    expect(density.patient.text.body).toEqual([17, 26]);
    expect(density.clinician.text.table).toEqual([13, 18]);
    expect(density.clinician.text.body).toEqual([14, 20]);
  });

  it("keeps every text role on its theme's scale", () => {
    for (const t of themes) {
      for (const [role, [size]] of Object.entries({
        ...density[t].text,
        ...density[t].textExtra,
      })) {
        expect(density[t].scale, `${t} ${role}`).toContain(size);
      }
    }
  });

  it("meets minimum target sizes and row height", () => {
    expect(density.patient["target-min"]).toBe(48);
    expect(density.clinician["target-min"]).toBe(32);
    expect(density.clinician["target-floor"]).toBeGreaterThanOrEqual(24);
    expect(density.clinician["row-h"]).toBe(36);
    expect(density.patient.measure).toBe("60ch");
  });

  it("uses IBM Plex Sans headings in both themes and no serif anywhere", () => {
    for (const t of themes) expect(density[t]["font-heading"]).toContain("IBM Plex Sans");
    const css = renderTokensCss();
    expect(css).not.toMatch(/Serif/);
    for (const value of [
      ...Object.values(fonts),
      ...themes.map((t) => density[t]["font-heading"]),
    ]) {
      expect(value).not.toMatch(/Serif/);
    }
  });

  it("loads only the DR-001 faces (Plex Sans 400, 400 italic, 500, 600; Plex Mono 400)", () => {
    const src = readFileSync(join(srcDir, "fonts.ts"), "utf8");
    const imports = [...src.matchAll(/^import "([^"]+)";/gm)].map((m) => m[1]).sort();
    expect(imports).toEqual([
      "@fontsource/ibm-plex-mono/latin-400.css",
      "@fontsource/ibm-plex-sans/latin-400-italic.css",
      "@fontsource/ibm-plex-sans/latin-400.css",
      "@fontsource/ibm-plex-sans/latin-500.css",
      "@fontsource/ibm-plex-sans/latin-600.css",
    ]);
  });
});

describe("palette restrictions", () => {
  const entries = (t: ThemeName) => Object.entries(colours[t]) as [keyof ColourTokens, string][];

  it("contains no purple or magenta", () => {
    for (const t of themes) {
      for (const [name, value] of entries(t)) {
        const { h, s } = hsl(value);
        const purple = s > 0.15 && h >= 255 && h <= 335;
        expect(purple, `${t} ${name} ${value}`).toBe(false);
      }
    }
  });

  it("status tokens are not brand blue", () => {
    for (const t of themes) {
      for (const [name, value] of entries(t)) {
        if (!/^(success|warning|error|critical)-/.test(name)) continue;
        const { h, s } = hsl(value);
        expect(s > 0.3 && h >= 195 && h <= 255, `${t} ${name} ${value}`).toBe(false);
      }
      expect(colours[t]["info-ink"]).not.toBe(colours[t].primary);
    }
  });

  it("keeps ai-* tokens at low saturation so generated content stays neutral", () => {
    for (const t of themes) {
      const ai = entries(t).filter(([name]) => name.startsWith("ai-"));
      expect(ai.map(([n]) => n).sort()).toEqual(["ai-bg", "ai-ink", "ai-rule"]);
      for (const [name, value] of ai) {
        expect(hsl(value).s, `${t} ${name} ${value}`).toBeLessThanOrEqual(0.35);
      }
    }
  });

  // Acceptance test for DESIGN-BRIEF section 19: no cream, paper, beige or tan neutral anywhere.
  it("contains no warm neutral", () => {
    const neutrals = [
      "bg",
      "surface",
      "surface-sunken",
      "surface-elevated",
      "border",
      "neutral-bg",
      "disabled-bg",
      "ai-bg",
    ] as const;
    for (const t of themes) {
      for (const name of neutrals) {
        const value = colours[t][name];
        const { h, s } = hsl(value);
        expect(
          s === 0 || (h >= 190 && h <= 240),
          `${t} ${name} ${value} (hue ${h.toFixed(0)})`,
        ).toBe(true);
      }
    }
  });

  it("derives the scrim and overlay shadow from ink", () => {
    const n = parseInt(colours.patient.ink.slice(1), 16);
    const rgb = `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
    expect(scrim.startsWith(rgb)).toBe(true);
    expect(elevation.overlay.split(rgb).length - 1).toBe(2);
  });
});

describe("generated tokens.css", () => {
  it("is in sync with tokens.ts (run pnpm --filter @carepath/ui tokens:build)", () => {
    const onDisk = readFileSync(join(srcDir, "styles/tokens.css"), "utf8");
    expect(onDisk).toBe(renderTokensCss());
  });

  it("removes motion under prefers-reduced-motion", () => {
    const css = renderTokensCss();
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*--cp-duration-base: 0ms/);
  });
});

describe("source rules", () => {
  const files = walk(srcDir).filter(
    (f) => /\.(tsx?|css)$/.test(f) && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  );

  it("has no gradients", () => {
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/gradient\(/);
  });

  it("has no raw hex colours outside the token source", () => {
    for (const f of files.filter(
      (f) => !f.endsWith("tokens/tokens.ts") && !f.endsWith("styles/tokens.css"),
    )) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(
        /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/,
      );
    }
  });

  it("uses shadows only through the overlay token", () => {
    for (const f of files.filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(f, "utf8");
      const matches = src.match(/\bshadow-[\w-]+/g) ?? [];
      for (const m of matches) expect(["shadow-overlay", "shadow-none"], `${f}: ${m}`).toContain(m);
    }
    expect(elevation.overlay).toContain("rgb(");
  });

  it("uses no radius above the container radius", () => {
    for (const f of files.filter((f) => f.endsWith(".tsx"))) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/\brounded-(lg|xl|2xl|3xl)\b/);
    }
  });
});
