/**
 * CarePath design tokens: the single source of truth (advisor plan section 4).
 *
 * `styles/tokens.css` is generated from this file by `pnpm --filter @carepath/ui tokens:build`;
 * a test fails when the two drift. `contrast.test.ts` checks every foreground/background pair
 * below against WCAG 2.x contrast thresholds.
 *
 * This file must stay free of relative imports so Node can run the generator directly.
 */

export type ThemeName = "patient" | "clinician";

/** Semantic colour roles. Values are hex so contrast can be computed. */
export interface ColourTokens {
  bg: string;
  surface: string;
  "surface-sunken": string;
  ink: string;
  "ink-muted": string;
  "ink-inverse": string;
  primary: string;
  "primary-hover": string;
  "primary-active": string;
  "primary-subtle": string;
  /** Hairline separators between surfaces. Decorative only; never the sole carrier of meaning. */
  border: string;
  /** Borders of interactive controls (inputs, checkboxes): at least 3:1. */
  "border-control": string;
  focus: string;
  "success-ink": string;
  "success-bg": string;
  "warning-ink": string;
  "warning-bg": string;
  "error-ink": string;
  "error-bg": string;
  "error-hover": string;
  "info-ink": string;
  "info-bg": string;
  "neutral-ink": string;
  "neutral-bg": string;
  "disabled-ink": string;
  "disabled-bg": string;
  /** Dashed left rule of AI-generated drafts. */
  "ai-rule": string;
  "chart-1": string;
  "chart-2": string;
  "chart-3": string;
  "chart-4": string;
}

const shared = {
  "ink-inverse": "#FFFFFF",
  primary: "#1E4D40",
  "primary-hover": "#173D33",
  "primary-active": "#0F2A22",
  "primary-subtle": "#E3EEE9",
  "border-control": "#76817C",
  focus: "#0B5FA5",
  "success-ink": "#1E5A3A",
  "success-bg": "#E5F1E8",
  "warning-ink": "#7A4A00",
  "warning-bg": "#FBF0D9",
  "error-ink": "#8E2A1E",
  "error-bg": "#FBE9E5",
  "error-hover": "#6E2016",
  "info-ink": "#1F4E6B",
  "info-bg": "#E6F0F5",
  "neutral-ink": "#3F4A45",
  "ai-rule": "#76817C",
  "chart-1": "#1E4D40",
  "chart-2": "#55615C",
  "chart-3": "#8A938E",
  "chart-4": "#1B2622",
} as const;

export const colours: Record<ThemeName, ColourTokens> = {
  patient: {
    ...shared,
    bg: "#F5F2EA",
    surface: "#FFFFFF",
    "surface-sunken": "#ECE8DC",
    ink: "#1B2622",
    "ink-muted": "#55615C",
    border: "#D8D3C4",
    "neutral-bg": "#ECE8DC",
    "disabled-ink": "#5F6A65",
    "disabled-bg": "#ECE8DC",
  },
  clinician: {
    ...shared,
    bg: "#F6F7F6",
    surface: "#FFFFFF",
    "surface-sunken": "#ECEFED",
    ink: "#17201D",
    "ink-muted": "#56625E",
    border: "#DADFDD",
    "neutral-bg": "#ECEFED",
    "disabled-ink": "#5F6A65",
    "disabled-bg": "#ECEFED",
  },
};

/** Density and typography: the part of the token set that differs by audience. */
export interface DensityTokens {
  "font-heading": string;
  "heading-weight": string;
  /** Type scale in px, smallest first. */
  scale: readonly number[];
  /** role -> [size px, line-height px] */
  text: Record<
    "caption" | "small" | "body" | "table" | "label" | "h4" | "h3" | "h2" | "h1",
    readonly [number, number]
  >;
  "control-h": number;
  "control-h-sm": number;
  "target-min": number;
  "target-floor": number;
  "row-h": number;
  "control-px": number;
  /** Maximum line length for running text. */
  measure: string;
  "page-gutter": number;
}

export const density: Record<ThemeName, DensityTokens> = {
  patient: {
    "font-heading": `"Source Serif 4", "Source Serif Pro", Georgia, serif`,
    "heading-weight": "600",
    scale: [15, 17, 20, 24, 30, 38],
    text: {
      caption: [15, 22],
      small: [15, 22],
      body: [17, 26],
      table: [17, 26],
      label: [17, 24],
      h4: [20, 28],
      h3: [24, 32],
      h2: [30, 38],
      h1: [38, 46],
    },
    "control-h": 48,
    "control-h-sm": 48,
    "target-min": 48,
    "target-floor": 48,
    "row-h": 56,
    "control-px": 16,
    measure: "60ch",
    "page-gutter": 20,
  },
  clinician: {
    "font-heading": `"IBM Plex Sans", system-ui, sans-serif`,
    "heading-weight": "600",
    scale: [12, 13, 14, 16, 20, 24],
    text: {
      caption: [12, 16],
      small: [13, 18],
      body: [14, 20],
      table: [13, 18],
      label: [13, 18],
      h4: [14, 20],
      h3: [16, 24],
      h2: [20, 28],
      h1: [24, 32],
    },
    "control-h": 32,
    "control-h-sm": 24,
    "target-min": 32,
    "target-floor": 24,
    "row-h": 36,
    "control-px": 10,
    measure: "none",
    "page-gutter": 24,
  },
};

/** 4 px grid. Keys are multipliers of 4 px. */
export const spacing = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;

export const radius = { control: 6, container: 10 } as const;

export const motion = {
  fast: 120,
  base: 200,
  ease: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

/** Shadows exist only for overlays: dialogs, drawers, popovers. */
export const elevation = {
  overlay: "0 8px 24px rgb(23 32 29 / 0.16), 0 1px 3px rgb(23 32 29 / 0.12)",
} as const;

export const fonts = {
  sans: `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif`,
  mono: `"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace`,
  serif: `"Source Serif 4", "Source Serif Pro", Georgia, serif`,
} as const;

export type ContrastRule = "text" | "ui";
export interface ContrastPair {
  fg: keyof ColourTokens;
  bg: keyof ColourTokens;
  /** text: 4.5:1 (normal text). ui: 3:1 (borders, focus rings, icons, chart marks). */
  rule: ContrastRule;
  why: string;
}

/** Every foreground/background combination the components use. The contrast test checks all of them. */
export const contrastPairs: readonly ContrastPair[] = [
  // Body text
  { fg: "ink", bg: "bg", rule: "text", why: "body on page" },
  { fg: "ink", bg: "surface", rule: "text", why: "body on card" },
  { fg: "ink", bg: "surface-sunken", rule: "text", why: "body on sunken area" },
  { fg: "ink-muted", bg: "bg", rule: "text", why: "secondary text on page" },
  { fg: "ink-muted", bg: "surface", rule: "text", why: "secondary text on card" },
  { fg: "ink-muted", bg: "surface-sunken", rule: "text", why: "secondary text on sunken area" },
  // Primary
  { fg: "ink-inverse", bg: "primary", rule: "text", why: "primary button label" },
  { fg: "ink-inverse", bg: "primary-hover", rule: "text", why: "primary button label, hover" },
  { fg: "ink-inverse", bg: "primary-active", rule: "text", why: "primary button label, pressed" },
  { fg: "primary", bg: "bg", rule: "text", why: "link and quiet button on page" },
  { fg: "primary", bg: "surface", rule: "text", why: "link and quiet button on card" },
  { fg: "primary", bg: "primary-subtle", rule: "text", why: "selected item label" },
  { fg: "ink", bg: "primary-subtle", rule: "text", why: "selected row text" },
  // Controls and focus
  { fg: "border-control", bg: "surface", rule: "ui", why: "input and checkbox border on card" },
  { fg: "border-control", bg: "bg", rule: "ui", why: "input and checkbox border on page" },
  { fg: "focus", bg: "bg", rule: "ui", why: "focus ring on page" },
  { fg: "focus", bg: "surface", rule: "ui", why: "focus ring on card" },
  { fg: "focus", bg: "surface-sunken", rule: "ui", why: "focus ring on sunken area" },
  // The 2 px offset keeps the ring on the page, card or sunken background, never directly on the primary fill.
  {
    fg: "primary",
    bg: "surface",
    rule: "ui",
    why: "checked checkbox, switch and selected radio fill",
  },
  // Status: text on tint (clinical chips, banners) and on surface (outlined admin tags)
  { fg: "success-ink", bg: "success-bg", rule: "text", why: "success chip and banner" },
  { fg: "warning-ink", bg: "warning-bg", rule: "text", why: "warning chip and banner" },
  { fg: "error-ink", bg: "error-bg", rule: "text", why: "error chip and banner" },
  { fg: "info-ink", bg: "info-bg", rule: "text", why: "info chip and banner" },
  { fg: "neutral-ink", bg: "neutral-bg", rule: "text", why: "neutral chip" },
  { fg: "success-ink", bg: "surface", rule: "text", why: "success tag outline and text on card" },
  { fg: "warning-ink", bg: "surface", rule: "text", why: "warning tag outline and text on card" },
  { fg: "error-ink", bg: "surface", rule: "text", why: "error text and tag on card" },
  { fg: "info-ink", bg: "surface", rule: "text", why: "info tag on card" },
  { fg: "neutral-ink", bg: "surface", rule: "text", why: "neutral tag on card" },
  { fg: "error-ink", bg: "bg", rule: "text", why: "field error text on page" },
  { fg: "ink-inverse", bg: "error-ink", rule: "text", why: "danger button label" },
  { fg: "ink-inverse", bg: "error-hover", rule: "text", why: "danger button label, hover" },
  // AI draft
  { fg: "ai-rule", bg: "surface", rule: "ui", why: "dashed rule on card" },
  { fg: "ai-rule", bg: "surface-sunken", rule: "ui", why: "dashed rule on sunken area" },
  { fg: "ai-rule", bg: "bg", rule: "ui", why: "dashed rule on page" },
  // Disabled: not required by WCAG, held to 3:1 so labels stay legible
  {
    fg: "disabled-ink",
    bg: "disabled-bg",
    rule: "ui",
    why: "disabled control label (informational floor)",
  },
  {
    fg: "ink-inverse",
    bg: "disabled-ink",
    rule: "ui",
    why: "checkmark on a disabled, checked box",
  },
  // Charts: forest plus neutrals, each mark distinguishable from the card
  { fg: "chart-1", bg: "surface", rule: "ui", why: "chart series 1" },
  { fg: "chart-2", bg: "surface", rule: "ui", why: "chart series 2" },
  { fg: "chart-3", bg: "surface", rule: "ui", why: "chart series 3" },
  { fg: "chart-4", bg: "surface", rule: "ui", why: "chart series 4" },
];

const px = (n: number) => `${n}px`;

/** Render the generated stylesheet. Deterministic so the sync test can compare bytes. */
export function renderTokensCss(): string {
  const out: string[] = [];
  out.push(
    "/* Generated by `pnpm --filter @carepath/ui tokens:build` from src/tokens/tokens.ts. Do not edit. */",
    "",
  );

  out.push(":root {");
  out.push(`  --cp-font-sans: ${fonts.sans};`);
  out.push(`  --cp-font-mono: ${fonts.mono};`);
  out.push(`  --cp-font-serif: ${fonts.serif};`);
  spacing.forEach((n) => out.push(`  --cp-space-${n}: ${px(n * 4)};`));
  out.push(`  --cp-radius-control: ${px(radius.control)};`);
  out.push(`  --cp-radius-container: ${px(radius.container)};`);
  out.push(`  --cp-shadow-overlay: ${elevation.overlay};`);
  out.push(`  --cp-duration-fast: ${motion.fast}ms;`);
  out.push(`  --cp-duration-base: ${motion.base}ms;`);
  out.push(`  --cp-ease: ${motion.ease};`);
  out.push(`  --cp-scrim: rgb(23 32 29 / 0.5);`);
  out.push(`  --cp-focus-width: 2px;`);
  out.push(`  --cp-focus-offset: 2px;`);
  out.push("}", "");

  const themes: ThemeName[] = ["patient", "clinician"];
  for (const theme of themes) {
    const selector =
      theme === "patient" ? `:root,\n[data-theme="patient"]` : `[data-theme="clinician"]`;
    out.push(`${selector} {`);
    const c = colours[theme];
    for (const [k, v] of Object.entries(c)) out.push(`  --cp-${k}: ${v};`);
    const d = density[theme];
    out.push(`  --cp-font-heading: ${d["font-heading"]};`);
    out.push(`  --cp-heading-weight: ${d["heading-weight"]};`);
    d.scale.forEach((n, i) => out.push(`  --cp-scale-${i + 1}: ${px(n)};`));
    for (const [role, [size, lh]] of Object.entries(d.text)) {
      out.push(`  --cp-text-${role}: ${px(size)};`);
      out.push(`  --cp-text-${role}-lh: ${px(lh)};`);
    }
    out.push(`  --cp-control-h: ${px(d["control-h"])};`);
    out.push(`  --cp-control-h-sm: ${px(d["control-h-sm"])};`);
    out.push(`  --cp-target-min: ${px(d["target-min"])};`);
    out.push(`  --cp-target-floor: ${px(d["target-floor"])};`);
    out.push(`  --cp-row-h: ${px(d["row-h"])};`);
    out.push(`  --cp-control-px: ${px(d["control-px"])};`);
    out.push(`  --cp-measure: ${d.measure};`);
    out.push(`  --cp-page-gutter: ${px(d["page-gutter"])};`);
    out.push("}", "");
  }

  out.push(
    "@media (prefers-reduced-motion: reduce) {",
    "  :root,",
    "  [data-theme] {",
    "    --cp-duration-fast: 0ms;",
    "    --cp-duration-base: 0ms;",
    "  }",
    "}",
    "",
  );
  return out.join("\n");
}
