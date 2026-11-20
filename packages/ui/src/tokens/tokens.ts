/**
 * CarePath design tokens: the single source of truth for code (DR-001, `docs/design/design-tokens.md`).
 * Values mirror `docs/design/tokens-final.json`; `contrast.test.ts` fails when the two drift.
 *
 * `styles/tokens.css` is generated from this file by `pnpm --filter @carepath/ui tokens:build`;
 * a test fails when the two drift. `contrast.test.ts` checks every foreground/background pair
 * below against WCAG 2.x contrast thresholds.
 *
 * This file must stay free of relative imports so Node can run the generator directly.
 */

export type ThemeName = "patient" | "clinician";

/** Semantic colour roles. Values are hex so contrast can be computed. Roles: `docs/design/design-tokens.md` section 1. */
export interface ColourTokens {
  /** Application canvas: page background in every shell and on `<body>`. */
  bg: string;
  /** Cards, tables, panels, inputs, headers. */
  surface: string;
  /** Table header rows, demo strip, filter trays, neutral chips. Not a row hover colour. */
  "surface-sunken": string;
  /** Dialogs, drawers, popovers, menus; always with `shadow-overlay`. */
  "surface-elevated": string;
  ink: string;
  "ink-muted": string;
  /** Captions, placeholders, timestamps. Never for anything a person must act on. */
  "ink-subtle": string;
  "ink-inverse": string;
  primary: string;
  "primary-hover": string;
  "primary-active": string;
  /** Hover fill for quiet and outline buttons and hoverable rows. */
  "primary-subtle": string;
  /** Text links and tertiary buttons. */
  link: string;
  /** Outline (secondary action) button border; its label uses `link`. */
  "secondary-border": string;
  "secondary-hover-bg": string;
  /** Selected nav item, row, tab, day or time chip: fill plus an edge bar or check, never fill alone. */
  "selected-bg": string;
  "selected-ink": string;
  "selected-edge": string;
  /** Hairline separators between surfaces. Decorative only; never the sole carrier of meaning. */
  border: string;
  /** Borders of interactive controls (inputs, checkboxes): at least 3:1. */
  "border-control": string;
  focus: string;
  /** Halo between the focus ring and the control. */
  "focus-inner": string;
  /** Brand accent: brand mark, illustrations, avatar chips. Never a control, link, status or AI content. */
  accent: string;
  "accent-ink": string;
  "accent-subtle": string;
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
  /** The few items that must be seen first. At most one solid critical element per view. */
  "critical-solid": string;
  "critical-on": string;
  "critical-subtle-bg": string;
  "critical-subtle-ink": string;
  "disabled-ink": string;
  "disabled-bg": string;
  /** AI-generated content: graphite tint, label text and the dashed left rule of drafts. */
  "ai-bg": string;
  "ai-ink": string;
  "ai-rule": string;
  /** Categorical series, used in order; 6 to 8 only with direct labels or marker shapes. */
  "chart-1": string;
  "chart-2": string;
  "chart-3": string;
  "chart-4": string;
  "chart-5": string;
  "chart-6": string;
  "chart-7": string;
  "chart-8": string;
  /** Sequential: 1 to 3 are cell fills that carry a printed value or outline; 4 to 7 may be marks. */
  "seq-1": string;
  "seq-2": string;
  "seq-3": string;
  "seq-4": string;
  "seq-5": string;
  "seq-6": string;
  "seq-7": string;
  /** Diverging, blue to orange through neutral. Never red to green. */
  "div-1": string;
  "div-2": string;
  "div-3": string;
  "div-4": string;
  "div-5": string;
}

/**
 * DR-001 (A+G refined): cobalt primary, navy ink, white and cool-grey surfaces, teal non-action accent,
 * graphite AI. One colour set for every role; the themes differ in density and type only.
 * Values mirror `docs/design/tokens-final.json`; a test fails when they drift.
 */
const palette: ColourTokens = {
  bg: "#F5F7FA",
  surface: "#FFFFFF",
  "surface-sunken": "#EBEFF5",
  "surface-elevated": "#FFFFFF",
  ink: "#172B4D",
  "ink-muted": "#42526E",
  "ink-subtle": "#566681",
  "ink-inverse": "#FFFFFF",
  primary: "#175CD3",
  "primary-hover": "#1849A9",
  "primary-active": "#194185",
  "primary-subtle": "#EFF4FF",
  link: "#175CD3",
  "secondary-border": "#175CD3",
  "secondary-hover-bg": "#EFF4FF",
  "selected-bg": "#E0EAFF",
  "selected-ink": "#1849A9",
  "selected-edge": "#175CD3",
  border: "#DCE3EB",
  "border-control": "#697A93",
  focus: "#172B4D",
  "focus-inner": "#FFFFFF",
  accent: "#0E7490",
  "accent-ink": "#0B5F75",
  "accent-subtle": "#E0F4F8",
  "success-ink": "#05603A",
  "success-bg": "#ECFDF3",
  "warning-ink": "#93370D",
  "warning-bg": "#FEF7C3",
  "error-ink": "#B42318",
  "error-bg": "#FEF3F2",
  "error-hover": "#912018",
  "info-ink": "#065986",
  "info-bg": "#F0F9FF",
  "neutral-ink": "#344054",
  "neutral-bg": "#EBEFF5",
  "critical-solid": "#912018",
  "critical-on": "#FFFFFF",
  "critical-subtle-bg": "#FEE4E2",
  "critical-subtle-ink": "#7A271A",
  "disabled-ink": "#6B7790",
  "disabled-bg": "#EBEFF5",
  "ai-bg": "#EFF3F6",
  "ai-ink": "#2F4A5C",
  "ai-rule": "#5B7384",
  "chart-1": "#175CD3",
  "chart-2": "#D9531E",
  "chart-3": "#2A9D66",
  "chart-4": "#424B57",
  "chart-5": "#1E6736",
  "chart-6": "#69788C",
  "chart-7": "#398EEF",
  "chart-8": "#4F962C",
  "seq-1": "#EFF4FF",
  "seq-2": "#C2D4F6",
  "seq-3": "#95B4ED",
  "seq-4": "#5F8EE1",
  "seq-5": "#3F78DB",
  "seq-6": "#175CD3",
  "seq-7": "#194185",
  "div-1": "#194185",
  "div-2": "#84ADFF",
  "div-3": "#EBEFF5",
  "div-4": "#F9B27C",
  "div-5": "#9A3412",
};

export const colours: Record<ThemeName, ColourTokens> = {
  patient: { ...palette },
  clinician: { ...palette },
};

/** Density and typography: the part of the token set that differs by audience (`design-tokens.md` section 5). */
export type TextRole = "caption" | "small" | "body" | "table" | "label" | "h4" | "h3" | "h2" | "h1";
/** Named roles beyond the base ramp: data values, clinical notes and the page/section/component titles. */
export type TextExtraRole =
  | "data-value-lg"
  | "data-value"
  | "notes"
  | "page-title"
  | "section-heading"
  | "component-title"
  | "overline";

export interface DensityTokens {
  "font-heading": string;
  "heading-weight": string;
  /** Type scale in px, smallest first. */
  scale: readonly number[];
  /** role -> [size px, line-height px] */
  text: Record<TextRole, readonly [number, number]>;
  textExtra: Record<TextExtraRole, readonly [number, number]>;
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

const plexSans = `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif`;

export const density: Record<ThemeName, DensityTokens> = {
  patient: {
    "font-heading": plexSans,
    "heading-weight": "600",
    scale: [15, 17, 20, 24, 32, 40],
    text: {
      caption: [15, 22],
      small: [15, 22],
      body: [17, 26],
      table: [17, 26],
      label: [17, 24],
      h4: [20, 28],
      h3: [20, 28],
      h2: [24, 32],
      h1: [32, 40],
    },
    textExtra: {
      "data-value-lg": [40, 44],
      "data-value": [20, 28],
      notes: [17, 28],
      "page-title": [32, 40],
      "section-heading": [24, 32],
      "component-title": [20, 28],
      overline: [15, 22],
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
    "font-heading": plexSans,
    "heading-weight": "600",
    scale: [12, 13, 14, 15, 18, 24],
    text: {
      caption: [12, 16],
      small: [13, 18],
      body: [14, 20],
      table: [13, 18],
      label: [13, 18],
      h4: [14, 20],
      h3: [15, 20],
      h2: [18, 24],
      h1: [24, 32],
    },
    textExtra: {
      "data-value-lg": [24, 28],
      "data-value": [14, 20],
      notes: [14, 22],
      "page-title": [24, 32],
      "section-heading": [18, 24],
      "component-title": [15, 20],
      overline: [12, 16],
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
  overlay: "0 8px 24px rgb(23 43 77 / 0.16), 0 1px 3px rgb(23 43 77 / 0.12)",
} as const;

/** Overlay scrim, derived from `ink` #172B4D. */
export const scrim = "rgb(23 43 77 / 0.5)";

export const fonts = {
  sans: `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif`,
  mono: `"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace`,
  /** Kept so existing `font-serif` references resolve; DR-001 removed the serif, so it is the sans stack. */
  serif: `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif`,
} as const;

export type ContrastRule = "text" | "ui";
export interface ContrastPair {
  fg: keyof ColourTokens;
  bg: keyof ColourTokens;
  /** text: 4.5:1 (normal text). ui: 3:1 (borders, focus rings, icons, chart marks). */
  rule: ContrastRule;
  why: string;
}

/** Every foreground/background combination the components use (`design-tokens.md` section 6). The contrast test checks all of them. */
export const contrastPairs: readonly ContrastPair[] = [
  // Body text
  { fg: "ink", bg: "bg", rule: "text", why: "primary text on canvas" },
  { fg: "ink", bg: "surface", rule: "text", why: "primary text on surface" },
  { fg: "ink", bg: "surface-sunken", rule: "text", why: "primary text on sunken surface" },
  { fg: "ink", bg: "surface-elevated", rule: "text", why: "primary text on elevated surface" },
  { fg: "ink-muted", bg: "bg", rule: "text", why: "secondary text on canvas" },
  { fg: "ink-muted", bg: "surface", rule: "text", why: "secondary text on surface" },
  { fg: "ink-muted", bg: "surface-sunken", rule: "text", why: "secondary text on sunken surface" },
  {
    fg: "ink-subtle",
    bg: "surface",
    rule: "text",
    why: "muted text (captions, placeholders) on surface",
  },
  { fg: "ink-subtle", bg: "bg", rule: "text", why: "muted text on canvas" },
  { fg: "ink-subtle", bg: "surface-sunken", rule: "text", why: "muted text on sunken surface" },
  // Primary action and links
  { fg: "ink-inverse", bg: "primary", rule: "text", why: "primary button label" },
  { fg: "ink-inverse", bg: "primary-hover", rule: "text", why: "primary button label, hover" },
  { fg: "ink-inverse", bg: "primary-active", rule: "text", why: "primary button label, pressed" },
  { fg: "link", bg: "bg", rule: "text", why: "link and quiet button text on canvas" },
  { fg: "link", bg: "surface", rule: "text", why: "link and quiet button text on surface" },
  { fg: "link", bg: "surface-sunken", rule: "text", why: "link text on sunken surface" },
  { fg: "link", bg: "primary-subtle", rule: "text", why: "link text on primary tint (hover)" },
  { fg: "primary-hover", bg: "surface", rule: "text", why: "link hover on surface" },
  {
    fg: "primary",
    bg: "surface",
    rule: "ui",
    why: "checked checkbox, switch and radio fill; progress fill",
  },
  { fg: "secondary-border", bg: "surface", rule: "ui", why: "outline button border on surface" },
  {
    fg: "link",
    bg: "secondary-hover-bg",
    rule: "text",
    why: "outline button label on its hover fill",
  },
  // Selected
  { fg: "selected-ink", bg: "selected-bg", rule: "text", why: "selected row and nav item label" },
  { fg: "ink", bg: "selected-bg", rule: "text", why: "body text in a selected row" },
  { fg: "ink-muted", bg: "selected-bg", rule: "text", why: "secondary text in a selected row" },
  { fg: "ink-subtle", bg: "selected-bg", rule: "text", why: "muted text in a selected row" },
  { fg: "link", bg: "selected-bg", rule: "text", why: "link in a selected row" },
  {
    fg: "selected-edge",
    bg: "surface",
    rule: "ui",
    why: "selected indicator bar on surface (SC 1.4.11)",
  },
  {
    fg: "selected-edge",
    bg: "selected-bg",
    rule: "ui",
    why: "selected indicator bar on its own tint",
  },
  // Controls and focus
  { fg: "border-control", bg: "surface", rule: "ui", why: "input and checkbox border on surface" },
  { fg: "border-control", bg: "bg", rule: "ui", why: "input and checkbox border on canvas" },
  { fg: "border-control", bg: "surface-sunken", rule: "ui", why: "input border on sunken surface" },
  { fg: "focus", bg: "bg", rule: "ui", why: "focus ring on canvas" },
  { fg: "focus", bg: "surface", rule: "ui", why: "focus ring on surface" },
  { fg: "focus", bg: "surface-sunken", rule: "ui", why: "focus ring on sunken surface" },
  { fg: "focus", bg: "selected-bg", rule: "ui", why: "focus ring on a selected row" },
  {
    fg: "focus",
    bg: "focus-inner",
    rule: "ui",
    why: "focus ring against its halo (holds on any fill)",
  },
  // Status: text on tint (chips, banners) and on surface and canvas
  { fg: "success-ink", bg: "success-bg", rule: "text", why: "success chip and banner" },
  { fg: "warning-ink", bg: "warning-bg", rule: "text", why: "warning chip and banner" },
  { fg: "error-ink", bg: "error-bg", rule: "text", why: "error chip and banner" },
  { fg: "info-ink", bg: "info-bg", rule: "text", why: "info chip and banner" },
  { fg: "neutral-ink", bg: "neutral-bg", rule: "text", why: "neutral chip" },
  { fg: "success-ink", bg: "surface", rule: "text", why: "success text on surface" },
  { fg: "warning-ink", bg: "surface", rule: "text", why: "warning text on surface" },
  { fg: "error-ink", bg: "surface", rule: "text", why: "error text on surface" },
  { fg: "info-ink", bg: "surface", rule: "text", why: "info text on surface" },
  { fg: "neutral-ink", bg: "surface", rule: "text", why: "neutral tag on surface" },
  { fg: "error-ink", bg: "bg", rule: "text", why: "field error text on canvas" },
  { fg: "info-ink", bg: "bg", rule: "text", why: "info text on canvas" },
  { fg: "success-ink", bg: "bg", rule: "text", why: "success text on canvas" },
  { fg: "warning-ink", bg: "bg", rule: "text", why: "warning text on canvas" },
  { fg: "warning-ink", bg: "surface-sunken", rule: "text", why: "warning text on sunken surface" },
  { fg: "ink", bg: "warning-bg", rule: "text", why: "body text in a warning banner" },
  { fg: "ink", bg: "error-bg", rule: "text", why: "body text in an error banner" },
  { fg: "ink", bg: "success-bg", rule: "text", why: "body text in a success banner" },
  { fg: "ink-muted", bg: "info-bg", rule: "text", why: "secondary text in an info banner" },
  { fg: "link", bg: "info-bg", rule: "text", why: "link in an info banner" },
  {
    fg: "error-ink",
    bg: "surface",
    rule: "ui",
    why: "danger outline border; invalid field border",
  },
  { fg: "ink-inverse", bg: "error-ink", rule: "text", why: "danger button label" },
  { fg: "ink-inverse", bg: "error-hover", rule: "text", why: "danger button label, hover" },
  // Critical attention
  {
    fg: "critical-on",
    bg: "critical-solid",
    rule: "text",
    why: "critical banner label on solid fill",
  },
  {
    fg: "critical-subtle-ink",
    bg: "critical-subtle-bg",
    rule: "text",
    why: "critical row and chip text on tint",
  },
  { fg: "ink", bg: "critical-subtle-bg", rule: "text", why: "body text in a critical row" },
  { fg: "critical-solid", bg: "surface", rule: "ui", why: "critical icon and marker on surface" },
  // AI-generated content
  { fg: "ai-ink", bg: "ai-bg", rule: "text", why: "AI draft label and text on AI tint" },
  { fg: "ink", bg: "ai-bg", rule: "text", why: "body text inside an AI draft block" },
  { fg: "ink-muted", bg: "ai-bg", rule: "text", why: "secondary text inside an AI draft block" },
  { fg: "link", bg: "ai-bg", rule: "text", why: "source link inside an AI draft block" },
  { fg: "ai-ink", bg: "surface", rule: "text", why: "AI label on surface" },
  { fg: "ai-rule", bg: "surface", rule: "ui", why: "AI dashed rule on surface" },
  { fg: "ai-rule", bg: "ai-bg", rule: "ui", why: "AI dashed rule on AI tint" },
  { fg: "ai-rule", bg: "bg", rule: "ui", why: "AI dashed rule on canvas" },
  { fg: "ai-rule", bg: "surface-sunken", rule: "ui", why: "AI dashed rule on sunken surface" },
  // Accent (non-action)
  { fg: "accent", bg: "surface", rule: "ui", why: "accent icon and mark on surface" },
  { fg: "accent", bg: "bg", rule: "ui", why: "accent mark on canvas" },
  { fg: "accent-ink", bg: "accent-subtle", rule: "text", why: "accent tag text" },
  { fg: "accent-ink", bg: "surface", rule: "text", why: "accent text on surface" },
  { fg: "ink-inverse", bg: "accent", rule: "text", why: "white on accent fill (brand mark)" },
  // Disabled: exempt from WCAG (inactive components); held to 3:1 so labels stay legible
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
  // Data visualisation: every mark distinguishable from the card
  { fg: "chart-1", bg: "surface", rule: "ui", why: "categorical series 1" },
  { fg: "chart-2", bg: "surface", rule: "ui", why: "categorical series 2" },
  { fg: "chart-3", bg: "surface", rule: "ui", why: "categorical series 3" },
  { fg: "chart-4", bg: "surface", rule: "ui", why: "categorical series 4" },
  { fg: "chart-5", bg: "surface", rule: "ui", why: "categorical series 5" },
  { fg: "chart-6", bg: "surface", rule: "ui", why: "categorical series 6" },
  { fg: "chart-7", bg: "surface", rule: "ui", why: "categorical series 7" },
  { fg: "chart-8", bg: "surface", rule: "ui", why: "categorical series 8" },
  { fg: "seq-4", bg: "surface", rule: "ui", why: "sequential step 4 (marks)" },
  { fg: "seq-5", bg: "surface", rule: "ui", why: "sequential step 5 (marks)" },
  { fg: "seq-6", bg: "surface", rule: "ui", why: "sequential step 6 (marks)" },
  { fg: "seq-7", bg: "surface", rule: "ui", why: "sequential step 7 (marks)" },
  { fg: "div-1", bg: "surface", rule: "ui", why: "diverging end 1" },
  { fg: "div-5", bg: "surface", rule: "ui", why: "diverging end 5" },
  { fg: "ink", bg: "seq-1", rule: "text", why: "text on sequential cell 1" },
  { fg: "ink", bg: "seq-2", rule: "text", why: "text on sequential cell 2" },
  { fg: "ink", bg: "seq-3", rule: "text", why: "text on sequential cell 3" },
  { fg: "ink-inverse", bg: "seq-6", rule: "text", why: "white text on sequential cell 6" },
  { fg: "ink-inverse", bg: "seq-7", rule: "text", why: "white text on sequential cell 7" },
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
  out.push(`  --cp-scrim: ${scrim};`);
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
    for (const [role, [size, lh]] of Object.entries(d.textExtra)) {
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
