# Typography exploration: family comparison and recommended scale

Status: research for the advisor. Provisional until the rendered comparison. Brief: `docs/DESIGN-BRIEF.md` section 10. Measurements below were taken on 2026-11-20 from the actual `@fontsource` packages (npm), not from memory.

## 1. Candidate comparison

Method: downloaded each family's `@fontsource/<name>` package, read the Latin 400 `woff2` with fontTools (metrics, OpenType feature tags, digit advance widths), and rendered a specimen (I l 1 | O 0, `BP 128/84`, `1,111.08`, `mg/dL`) at 15 and 34 px to look at disambiguation. Versions and licences from `npm view`.

| | Inter | Geist | IBM Plex Sans | Public Sans | Source Sans 3 |
|---|---|---|---|---|---|
| Fontsource package (version) | `@fontsource/inter` 5.3.0; variable `@fontsource-variable/inter` 5.3.0 | `@fontsource/geist-sans` 5.3.0; variable `@fontsource-variable/geist` 5.3.0 | `@fontsource/ibm-plex-sans` 5.3.0; variable `@fontsource-variable/ibm-plex-sans` 5.3.0 | `@fontsource/public-sans` 5.3.0; variable `@fontsource-variable/public-sans` 5.3.0 | `@fontsource/source-sans-3` 5.3.1; variable `@fontsource-variable/source-sans-3` 5.3.1 |
| Licence | OFL-1.1 | OFL-1.1 | OFL-1.1 | OFL-1.1 | OFL-1.1 |
| Static weights in package | 100 to 900 | 100 to 900 | 100 to 700 | 100 to 900 | 200 to 900 |
| Latin italic file | yes | **no** (oblique would be synthesised) | yes | yes | yes |
| x-height / em | **0.546** | 0.530 | 0.516 | 0.517 | 0.486 |
| Cap height / em | 0.728 | 0.710 | 0.698 | 0.723 | 0.660 |
| Mean lowercase advance / em (lower = more compact) | 0.536 | 0.539 | **0.505** | 0.529 | **0.475** |
| Numerals by default | proportional | proportional | **tabular (all ten digits equal width)** | proportional | **tabular** |
| `tnum` feature in the Latin subset | yes | yes | not needed (digits already tabular; no `tnum` tag) | yes | not needed (already tabular) |
| I / l / 1 disambiguation | I and l look alike | I and l look alike | **slab-serifed capital I and tailed l** | I and l look alike | tailed l, plain I |
| Latin 400 `woff2` size | 23.7 kB | 33.4 kB | 22.6 kB | **14.6 kB** | 15.7 kB |
| Already in the repo | no | no | **yes** (400/500/600 + Mono) | no | no |

Notes on the measurements:

- Inter's stylistic alternates (for example the open `I`, slashed zero) are **not** in the Fontsource Latin subset I inspected (no `cv*` or `ss*` GSUB tags), so Inter's own fix for I/l ambiguity is unavailable without self-subsetting the font. Geist has `ss01` only.
- x-height and width are measured, not opinion. For dense 13 px tables a larger x-height reads bigger but costs width; Plex and Source Sans pack roughly 6 to 11% more characters per line than Inter at the same size.
- Tabular numerals matter for CarePath's data columns (range of motion, pain scores, dosages, times). With Plex and Source Sans no CSS is required; with Inter, Geist and Public Sans set `font-variant-numeric: tabular-nums` on every numeric cell or numbers will not align. Plex's tabular default has a cost: digits in running prose (for example "1,111") look slightly gapped, visible in the specimen.
- Not measured, so not claimed: hinting quality on Windows at 13 px, and any user testing of readability. The specimen was rendered with a basic rasteriser, which is enough to judge letter shapes but not to rank fine rendering.

### 1.1 Qualitative fit against the brief

| Criterion | Inter | Geist | IBM Plex Sans | Public Sans | Source Sans 3 |
|---|---|---|---|---|---|
| Readability at small size | Strongest (largest x-height) | Strong | Good | Good | Weakest (smallest x-height) |
| Numeric clarity in clinical data | Good with `tnum`; I/l ambiguity | Good with `tnum`; I/l ambiguity | **Best**: tabular by default and unambiguous I/l/1 | Good with `tnum`; I/l ambiguity | Good; compact |
| Density (clinician) | Roomy | Roomy | **Compact** | Roomy | Most compact |
| Comfort (patient) | Very good | Good | Good; a little technical in tone | Very good, friendly civic tone (the USWDS typeface) | Good |
| Brand character (judgement) | Ubiquitous, neutral, forgettable | Contemporary, product-company feel; very new | Engineered, credible, slightly enterprise | Civic, trustworthy, plain | Editorial, a little dated |
| Operational risk | Low | Medium: no italic, younger family | **Lowest**: already shipped and tested in the repo | Low | Low |

## 2. Recommendation

**Use IBM Plex Sans for both themes, weights 400, 500 and 600, plus Plex Mono 400 for identifiers only (MRN, record IDs, audit hashes). Drop Source Serif 4.**

Why, from the evidence above:

1. It is the only candidate that removes two clinical-safety ambiguities by design: tabular digits with no CSS, and distinct I, l and 1. For a product that shows doses, scores and times, that matters more than the 6% x-height gap to Inter.
2. It packs more characters per line than Inter, Geist or Public Sans, which helps the dense clinician tables and does not hurt the patient layout (patient text is set one size larger).
3. It is already installed and tested at 400/500/600 in `packages/ui`; the lowest change risk.
4. One superfamily satisfies "avoid mixing many typefaces". The current patient theme uses Source Serif 4 for headings; that serif was part of the warm-paper look the brief now rejects, and a second family adds a download and a second set of metrics. Plex Sans 600 headings keep the patient app calm and precise.

**Runner-up: Inter.** Pick it instead if the rendered comparison shows Plex looks too technical for patients; accept the I/l ambiguity and require `tabular-nums` on numeric cells. **Third: Public Sans** (lightest download, friendliest). Geist is not recommended: no Latin italic in Fontsource (clinical notes need real italics for emphasis and quoted patient words), and it is the newest of the five.

Fallback stack stays `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif`. Font packages needed: `@fontsource/ibm-plex-sans` 400, 500, 600 (plus italic 400 for notes) and `@fontsource/ibm-plex-mono` 400. Plex Mono is already imported at 400 and 500 in `packages/ui/src/fonts.ts`; keep only what identifiers need. I did not inspect Plex Mono's zero glyph, so check that 0 and O are distinct in the render before committing to it for IDs. Italic 400 is not imported in `fonts.ts` today (it imports Plex Sans latin 400, 500, 600, Plex Mono 400, 500 and Source Serif 4 600); add `@fontsource/ibm-plex-sans/latin-400-italic.css` if clinical notes use italics.

## 3. Scale

Sizes in px at 100% (implement in rem so browser text-size changes and 200% zoom work; containers must not fix their height, because text resize and user spacing overrides, WCAG 1.4.4 and 1.4.12, must not clip text; I did not re-fetch those two criteria). Line-height is shown in px, as in `tokens.ts`.

### 3.1 Patient app (comfortable): 15, 17, 20, 24, 32, 40

| Role | Token (tokens.ts key) | Size / line | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Page title | `h1` | 32 / 40 | 600 | -0.01em | One per screen; wraps to two lines on 320 px |
| Section heading | `h2` | 24 / 32 | 600 | -0.005em | Gap above is at least 1.5 times the gap below |
| Component title (card, dialog) | `h3` | 20 / 28 | 600 | 0 | |
| Subheading / group label | `h4` | 20 / 28 | 500 | 0 | Rare; use sparingly |
| Body | `body` | 17 / 26 | 400 | 0 | Maximum 60 characters per line |
| Label (form, button, nav) | `label` | 16 / 24 | 500 | 0 | Never below 16 for tap targets of 48 px |
| Supporting text, help, timestamps | `small` | 15 / 22 | 400 | 0 | Must still hit 4.5:1 (`ink-muted` or darker) |
| Caption | `caption` | 15 / 22 | 400 | 0 | The smallest size in the app is 15 |
| Table or list row text | `table` | 16 / 24 | 400 | 0 | Patients see lists, not dense grids; row height 56 |
| Data value, large (hero metric, pain score) | `data-value-lg` | 40 / 44 | 500 | -0.01em | `tabular-nums`; always followed by its unit and a word ("3 of 10, mild") |
| Data value, inline | `data-value` | 20 / 28 | 600 | 0 | `tabular-nums`; unit in `small` beside it |
| Clinical note / message from the care team | `notes` | 17 / 28 | 400 | 0 | Taller leading for long reading; 60ch; real italic for quotes |
| Overline (rare) | `overline` | 15 / 22 | 500, uppercase | 0.04em | Avoid; use a heading instead |

### 3.2 Clinician and admin workspace (dense): 12, 13, 14, 15, 18, 24

| Role | Token | Size / line | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Page title | `h1` | 24 / 32 | 600 | -0.005em | Patient name, queue title |
| Section heading | `h2` | 18 / 24 | 600 | 0 | Record sections, panel titles |
| Component title (card, panel, drawer) | `h3` | 15 / 20 | 600 | 0 | |
| Subheading / table group | `h4` | 14 / 20 | 600 | 0 | |
| Body | `body` | 14 / 20 | 400 | 0 | Free measure, but cap long prose at 72ch |
| Label (form, button, tab) | `label` | 13 / 18 | 500 | 0 | Buttons 32 px high (24 px floor for small) |
| Supporting text | `small` | 13 / 18 | 400 | 0 | 4.5:1 minimum |
| Caption / metadata | `caption` | 12 / 16 | 400 | 0.01em | The smallest size; do not use for anything a clinician must act on |
| Table content | `table` | 13 / 18 | 400 | 0 | Row height 36; cells have 10 px horizontal padding |
| Table header | `label` | 13 / 18 | 600 | 0 | Sentence case, no uppercase |
| Data value, large (KPI) | `data-value-lg` | 24 / 28 | 600 | -0.005em | `tabular-nums` |
| Data value, inline (vitals, scores, doses in a row) | `data-value` | 14 / 20 | 500 | 0 | `tabular-nums`; right-align numeric columns; units in `caption` |
| Clinical notes (SOAP, AI draft body) | `notes` | 14 / 22 | 400 | 0 | Taller leading than body; cap 72ch; the AI draft uses the same type as human notes, distinguished by the dashed rule and label, not by a different font |
| Identifiers (MRN, record ID) | mono | 13 / 18 | 400 Plex Mono | 0 | The only use of the mono family |

### 3.3 Cross-cutting rules

- Never go below 12 px (clinician) or 15 px (patient) for any text a person must read.
- Two weights carry hierarchy in running UI: 400 and 600. 500 is for labels and data values only. No bold above 600.
- Do not use all-caps for clinical or status words (it harms word-shape recognition); status words are sentence case inside chips.
- Numerals: `font-variant-numeric: tabular-nums` on every numeric column, vital-sign strip and chart axis. With Plex this is the default shape; keep the declaration anyway so a later family swap does not break alignment.
- Line length: patient 60ch; clinician prose 72ch; tables unconstrained.
- Contrast: all type colours are checked in `color-exploration.md` against the surfaces they sit on (`ink` 12.7 to 16.8:1, `ink-muted` and `ink-subtle` above 4.5:1 on canvas, surface and sunken).
- The scale arrays in the candidate JSONs are `[15,17,20,24,32,40]` (patient) and `[12,13,14,15,18,24]` (clinician). Roles not in the current `DensityTokens` interface (`data-value-lg`, `data-value`, `notes`, `page-title`, `section-heading`, `component-title`, `overline`) are provided under `textExtra` in each JSON as `[size, line-height]`.

### 3.4 What changed from the current tokens (for the engineer)

| | Current (`tokens.ts`) | Proposed |
|---|---|---|
| Patient heading family | Source Serif 4, 600 | IBM Plex Sans, 600 |
| Patient scale | 15, 17, 20, 24, 30, 38 | 15, 17, 20, 24, 32, 40 |
| Patient table text | 17 / 26 | 16 / 24 |
| Clinician scale | 12, 13, 14, 16, 20, 24 | 12, 13, 14, 15, 18, 24 |
| Clinician h3 / h2 | 16 / 24, 20 / 28 | 15 / 20, 18 / 24 |
| New roles | none | data values (two sizes), clinical notes, overline |
| Body and control metrics (14/20, 17/26, 32 and 48 px controls, row heights) | unchanged | unchanged |
