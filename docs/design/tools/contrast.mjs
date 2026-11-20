#!/usr/bin/env node
/**
 * CarePath colour-direction contrast checker (design exploration tool, not product code).
 *
 *   node docs/design/tools/contrast.mjs                 # all of docs/design/tokens-candidates/*.json, markdown
 *   node docs/design/tools/contrast.mjs A B             # only A.json and B.json
 *   node docs/design/tools/contrast.mjs --strict        # exit 1 if any required pair fails
 *   node docs/design/tools/contrast.mjs --json          # machine-readable
 *
 * WCAG 2.x relative luminance and contrast ratio, compared WITHOUT rounding
 * (WCAG: 4.499:1 fails 4.5:1). Rules: text 4.5, large 3.0 (>=24px or >=18.5px bold),
 * ui 3.0 (SC 1.4.11: borders of controls, focus ring, icons, chart marks, selected indicators),
 * info = reported, never fails (decorative / exempt, e.g. hairlines, disabled controls).
 *
 * Also simulates colour-vision deficiency (Machado 2009, severity 1.0) and reports the smallest
 * CIE76 delta-E between any two categorical chart colours, so "not colour alone" decisions are evidence-based.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "tokens-candidates");

const hex2rgb = (h) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
export const lum = (h) => {
  const [r, g, b] = hex2rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const THRESH = { text: 4.5, large: 3, ui: 3, info: 0 };

/** [fg, bg, rule, why]. Token names are keys of colours.<theme>. */
const PAIRS = [
  // Text hierarchy
  ["ink", "bg", "text", "primary text on canvas"],
  ["ink", "surface", "text", "primary text on surface"],
  ["ink", "surface-sunken", "text", "primary text on secondary (sunken) surface"],
  ["ink", "surface-elevated", "text", "primary text on elevated surface"],
  ["ink-muted", "bg", "text", "secondary text on canvas"],
  ["ink-muted", "surface", "text", "secondary text on surface"],
  ["ink-muted", "surface-sunken", "text", "secondary text on sunken surface"],
  ["ink-subtle", "surface", "text", "muted text (captions, placeholders) on surface"],
  ["ink-subtle", "bg", "text", "muted text on canvas"],
  ["ink-subtle", "surface-sunken", "text", "muted text on sunken surface"],
  ["disabled-ink", "disabled-bg", "info", "disabled label (exempt, 1.4.3 inactive component)"],
  // Primary action
  ["ink-inverse", "primary", "text", "primary button label"],
  ["ink-inverse", "primary-hover", "text", "primary button label, hover"],
  ["ink-inverse", "primary-active", "text", "primary button label, pressed"],
  ["primary", "bg", "text", "brand hex used directly as text on canvas"],
  ["primary", "surface", "text", "brand hex used directly as text on surface"],
  ["primary", "surface-sunken", "text", "brand hex used directly as text on sunken surface"],
  ["link", "bg", "text", "link / quiet button text on canvas"],
  ["link", "surface", "text", "link / quiet button text on surface"],
  ["link", "surface-sunken", "text", "link text on sunken surface"],
  ["link", "primary-subtle", "text", "link text on primary tint"],
  ["primary-hover", "surface", "text", "link hover on surface"],
  ["primary", "surface", "ui", "checked checkbox / switch / radio fill vs surface"],
  // Secondary action (outline)
  ["secondary-border", "surface", "ui", "outline button border on surface"],
  ["link", "secondary-hover-bg", "text", "outline button label on its hover fill"],
  // Selection
  ["selected-ink", "selected-bg", "text", "selected row / nav item label"],
  ["ink", "selected-bg", "text", "body text in a selected row"],
  ["selected-edge", "surface", "ui", "selected indicator bar vs surface (SC 1.4.11)"],
  ["selected-edge", "selected-bg", "ui", "selected indicator bar vs its own tint"],
  // Controls and focus
  ["border-control", "surface", "ui", "input / checkbox border on surface"],
  ["border-control", "bg", "ui", "input / checkbox border on canvas"],
  ["border-control", "surface-sunken", "ui", "input border on sunken surface"],
  ["border", "surface", "info", "hairline separator on surface (decorative)"],
  ["border", "bg", "info", "hairline separator on canvas (decorative)"],
  ["focus", "bg", "ui", "focus ring on canvas"],
  ["focus", "surface", "ui", "focus ring on surface"],
  ["focus", "surface-sunken", "ui", "focus ring on sunken surface"],
  ["focus", "selected-bg", "ui", "focus ring on selected row"],
  ["focus", "focus-inner", "ui", "focus ring vs its inner halo (guarantees contrast on any fill)"],
  ["focus", "primary", "info", "focus ring vs primary fill: never adjacent, the 2 px offset shows the white halo between them"],
  // Status: text on tint (chips, banners) and on surface (outlined tags)
  ["success-ink", "success-bg", "text", "success chip / banner"],
  ["warning-ink", "warning-bg", "text", "warning chip / banner"],
  ["error-ink", "error-bg", "text", "error chip / banner"],
  ["info-ink", "info-bg", "text", "info chip / banner"],
  ["neutral-ink", "neutral-bg", "text", "neutral chip"],
  ["success-ink", "surface", "text", "success text on surface"],
  ["warning-ink", "surface", "text", "warning text on surface"],
  ["error-ink", "surface", "text", "error text on surface"],
  ["info-ink", "surface", "text", "info text on surface"],
  ["error-ink", "bg", "text", "field error text on canvas"],
  ["ink-inverse", "error-ink", "text", "danger button label"],
  ["ink-inverse", "error-hover", "text", "danger button label, hover"],
  // Critical attention
  ["critical-on", "critical-solid", "text", "critical banner label (solid fill)"],
  ["critical-subtle-ink", "critical-subtle-bg", "text", "critical row / chip text on tint"],
  ["critical-solid", "surface", "ui", "critical icon / marker vs surface"],
  // AI-generated content
  ["ai-ink", "ai-bg", "text", "AI draft label / text on AI tint"],
  ["ink", "ai-bg", "text", "body text inside AI draft block"],
  ["ai-rule", "surface", "ui", "AI dashed rule vs surface"],
  ["ai-rule", "ai-bg", "ui", "AI dashed rule vs AI tint"],
  ["ai-rule", "bg", "ui", "AI dashed rule vs canvas"],
  // Brand accent (non-action)
  ["accent", "surface", "ui", "accent icon / mark vs surface"],
  ["accent-ink", "accent-subtle", "text", "accent tag text"],
];
// Charts: every categorical colour and the line/bar sequence anchors on surface (1.4.11)
for (let i = 1; i <= 8; i++) PAIRS.push([`chart-${i}`, "surface", "ui", `categorical series ${i} vs surface`]);
for (let i = 4; i <= 7; i++) PAIRS.push([`seq-${i}`, "surface", "ui", `sequential step ${i} (marks) vs surface`]);
for (let i = 1; i <= 3; i++) PAIRS.push([`seq-${i}`, "surface", "info", `sequential step ${i} (light fills; needs label or outline)`]);
for (const i of [1, 5]) PAIRS.push([`div-${i}`, "surface", "ui", `diverging end ${i} vs surface`]);
PAIRS.push(["ink", "seq-1", "text", "text on lightest sequential cell"], ["ink", "seq-2", "text", "text on seq-2 cell"], ["ink", "seq-3", "text", "text on seq-3 cell"], ["ink-inverse", "seq-6", "text", "white text on seq-6 cell"], ["ink-inverse", "seq-7", "text", "white text on darkest cell"]);

// ---- colour-vision-deficiency simulation (Machado et al. 2009, severity 1.0) ----
const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const toLinear = (h) => hex2rgb(h).map(lin);
const sim = (h, kind) => {
  const v = toLinear(h);
  return M[kind].map((row) => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
};
const labOf = (rgbLin) => {
  const [r, g, b] = rgbLin;
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function minPairDeltaE(colours) {
  const out = {};
  for (const kind of ["normal", "protan", "deutan", "tritan"]) {
    const labs = colours.map((c) => labOf(kind === "normal" ? toLinear(c) : sim(c, kind)));
    let min = Infinity, at = "";
    for (let i = 0; i < labs.length; i++)
      for (let j = i + 1; j < labs.length; j++) {
        const d = dE(labs[i], labs[j]);
        if (d < min) { min = d; at = `${i + 1}/${j + 1}`; }
      }
    out[kind] = { min: +min.toFixed(1), at };
  }
  return out;
}

export function evaluate(tokens) {
  const results = {};
  for (const theme of Object.keys(tokens.colours)) {
    const c = tokens.colours[theme];
    results[theme] = PAIRS.map(([fg, bg, rule, why]) => {
      if (!c[fg] || !c[bg]) return { fg, bg, rule, why, missing: true };
      const r = ratio(c[fg], c[bg]);
      return { fg, bg, fgHex: c[fg], bgHex: c[bg], rule, why, ratio: r, need: THRESH[rule], pass: r >= THRESH[rule] };
    });
    const cats = Array.from({ length: 8 }, (_, i) => c[`chart-${i + 1}`]);
    results[theme].cvd = minPairDeltaE(cats);
    results[theme].cvd5 = minPairDeltaE(cats.slice(0, 5));
  }
  return results;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const names = args.filter((a) => !a.startsWith("--"));
  const files = (names.length ? names.map((n) => `${n}.json`) : readdirSync(dir).filter((f) => f.endsWith(".json"))).sort();
  let anyFail = false;
  const all = {};
  for (const f of files) {
    const tokens = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const res = evaluate(tokens);
    all[f] = res;
    // Colours are identical across themes in these candidates; report the first theme and note any difference.
    const themes = Object.keys(res);
    if (flags.has("--json")) continue;
    console.log(`\n## Direction ${f.replace(".json", "")}: ${tokens.meta?.name ?? ""}\n`);
    for (const theme of themes) {
      const rows = res[theme];
      const fails = rows.filter((r) => !r.missing && !r.pass);
      if (fails.some((r) => r.rule !== "info")) anyFail = true;
      console.log(`### theme: ${theme}  (${rows.filter((r) => !r.missing).length} pairs, ${fails.length} below threshold, ${rows.filter((r) => r.missing).length} missing)\n`);
      console.log("| fg | bg | rule | ratio | need | result | use |\n|---|---|---|---|---|---|---|");
      for (const r of rows) {
        if (r.missing) { console.log(`| ${r.fg} | ${r.bg} | ${r.rule} | - | - | MISSING | ${r.why} |`); continue; }
        const res2 = r.rule === "info" ? "info" : r.pass ? "pass" : "**FAIL**";
        console.log(`| ${r.fg} ${r.fgHex} | ${r.bg} ${r.bgHex} | ${r.rule} | ${(Math.floor(r.ratio * 100) / 100).toFixed(2)} | ${r.need || "-"} | ${res2} | ${r.why} |`);
      }
      console.log(`\nCategorical chart colours, smallest delta-E between any two (CIE76; below ~10 is hard to tell apart):`);
      console.log("all 8: " + Object.entries(rows.cvd).map(([k, v]) => `${k} ${v.min} (series ${v.at})`).join(" | "));
      console.log("first 5: " + Object.entries(rows.cvd5).map(([k, v]) => `${k} ${v.min} (series ${v.at})`).join(" | "));
    }
  }
  if (flags.has("--json")) console.log(JSON.stringify(all, null, 2));
  if (flags.has("--strict") && anyFail) process.exit(1);
}
