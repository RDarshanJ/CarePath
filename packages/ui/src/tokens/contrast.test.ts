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
  radius,
  renderTokensCss,
  type ThemeName,
} from "./tokens";

const themes: ThemeName[] = ["patient", "clinician"];
const threshold = { text: 4.5, ui: 3 } as const;
const srcDir = fileURLToPath(new URL("..", import.meta.url));

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
  });

  it("matches the advisor plan section 4 values", () => {
    expect(colours.patient.bg).toBe("#F5F2EA");
    expect(colours.clinician.bg).toBe("#F6F7F6");
    expect(colours.patient.ink).toBe("#1B2622");
    expect(colours.clinician.ink).toBe("#17201D");
    expect(colours.patient["ink-muted"]).toBe("#55615C");
    expect(colours.clinician["ink-muted"]).toBe("#56625E");
    for (const t of themes) {
      expect(colours[t].primary).toBe("#1E4D40");
      expect(colours[t]["border-control"]).toBe("#76817C");
      expect(colours[t].focus).toBe("#0B5FA5");
      expect(colours[t].surface).toBe("#FFFFFF");
      expect([colours[t]["success-ink"], colours[t]["success-bg"]]).toEqual(["#1E5A3A", "#E5F1E8"]);
      expect([colours[t]["warning-ink"], colours[t]["warning-bg"]]).toEqual(["#7A4A00", "#FBF0D9"]);
      expect([colours[t]["error-ink"], colours[t]["error-bg"]]).toEqual(["#8E2A1E", "#FBE9E5"]);
      expect([colours[t]["info-ink"], colours[t]["info-bg"]]).toEqual(["#1F4E6B", "#E6F0F5"]);
    }
  });
});

describe("shape, type and target rules", () => {
  it("never exceeds radius 10", () => {
    expect(Math.max(...Object.values(radius))).toBeLessThanOrEqual(10);
    expect(radius.control).toBe(6);
    expect(radius.container).toBe(10);
  });

  it("uses the plan's type scales and body sizes", () => {
    expect(density.patient.scale).toEqual([15, 17, 20, 24, 30, 38]);
    expect(density.clinician.scale).toEqual([12, 13, 14, 16, 20, 24]);
    expect(density.patient.text.body).toEqual([17, 26]);
    expect(density.clinician.text.table).toEqual([13, 18]);
    expect(density.clinician.text.body).toEqual([14, 20]);
  });

  it("keeps every text role on its theme's scale", () => {
    for (const t of themes) {
      for (const [role, [size]] of Object.entries(density[t].text)) {
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

  it("uses serif headings for patients only", () => {
    expect(density.patient["font-heading"]).toContain("Source Serif 4");
    expect(density.clinician["font-heading"]).toContain("IBM Plex Sans");
  });
});

describe("palette restrictions", () => {
  function hue(hex: string): { h: number; s: number } {
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

  it("contains no purple or magenta", () => {
    for (const t of themes) {
      for (const [name, value] of Object.entries(colours[t])) {
        const { h, s } = hue(value);
        const purple = s > 0.15 && h >= 255 && h <= 335;
        expect(purple, `${t} ${name} ${value}`).toBe(false);
      }
    }
  });

  it("limits blue to focus and info", () => {
    for (const t of themes) {
      for (const [name, value] of Object.entries(colours[t])) {
        const { h, s } = hue(value);
        if (s > 0.3 && h >= 195 && h < 255) {
          expect(["focus", "info-ink", "info-bg"], `${t} ${name} ${value}`).toContain(name);
        }
      }
    }
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
