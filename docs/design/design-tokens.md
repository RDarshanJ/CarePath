# CarePath design tokens (final)

Status: final. Decided in `decision-records/DR-001-visual-identity.md` on 2026-11-20. Machine-readable source: `tokens-final.json` (same shape as `tokens-candidates/*.json`). This file supersedes the colour and type values in `docs/decisions/advisor-plan.md` section 4 and `docs/design-system/README.md`. Brief: `docs/DESIGN-BRIEF.md` sections 4 and 10.

Direction: A+G refined. Cobalt primary, navy ink, white and cool-grey surfaces, teal as a non-action accent, neutral graphite for AI-generated content. One colour set for both themes; the themes differ in density and type only (section 5).

Nothing here has been tested with users or assistive technology. "Pass" means the computed WCAG 2.x ratio for the listed pair, nothing more.

## 1. Colour tokens by role (DESIGN-BRIEF section 4)

| Brief role | Token | Value | Use, and what it must not be used for |
|---|---|---|---|
| Application canvas | `bg` | `#F5F7FA` | Page background in every shell and on `<body>`. |
| Primary surface | `surface` | `#FFFFFF` | Cards, tables, panels, inputs, headers, the patient tab bar. |
| Secondary surface | `surface-sunken` | `#EBEFF5` | Table header rows, the demo strip, filter trays, illustration tiles, neutral chips, hover fill of neutral utility buttons. Not a row hover colour. |
| Elevated surface | `surface-elevated` | `#FFFFFF` + `shadow-overlay` | Dialogs, drawers, popovers, menus only. The shadow is the only shadow in the product. |
| Primary text | `ink` | `#172B4D` | Body, headings, data values. |
| Secondary text | `ink-muted` | `#42526E` | Supporting text, help, table metadata. |
| Muted text | `ink-subtle` | `#566681` | Captions, placeholders, timestamps. Never for anything a person must act on. |
| Disabled text | `disabled-ink` on `disabled-bg` | `#6B7790` on `#EBEFF5` | Inactive controls only (exempt from 1.4.3; 3.89:1 kept for legibility). |
| Text on filled colour | `ink-inverse` | `#FFFFFF` | Labels on primary, danger and critical fills. |
| Default border | `border` | `#DCE3EB` | Decorative hairlines between surfaces (1.2 to 1.3:1). Never the only boundary of a control. |
| Strong border | `border-control` | `#697A93` | Inputs, checkboxes, radios, neutral outline buttons, interactive chips (3.78:1 or more on canvas, surface, sunken). |
| Primary action | `primary` | `#175CD3` | Filled primary button, checked control fill, progress fill. One filled primary per view. |
| Primary action hover | `primary-hover` | `#1849A9` | Hover fill; link hover text. |
| Primary action pressed | `primary-active` | `#194185` | Pressed fill. |
| Primary tint | `primary-subtle` | `#EFF4FF` | Hover fill for quiet and outline buttons and hoverable rows. |
| Link and quiet-button text | `link` | `#175CD3` | Text links (underlined in running text and tables) and tertiary buttons. |
| Secondary action | `secondary-border` + `link` label, hover `secondary-hover-bg` | `#175CD3`, `#EFF4FF` | Outline button that carries the secondary action of a view. Neutral utility buttons (Edit, Pause, Refresh) use `border-control` + `ink` instead. |
| Selected state | `selected-bg`, `selected-ink`, `selected-edge` | `#E0EAFF`, `#1849A9`, `#175CD3` | Selected nav item, row, tab, day or time chip. Always fill plus a 2 to 3 px edge bar or a check mark, never fill alone. |
| Focus indicator | `focus` + `focus-inner` | `#172B4D` ring, `#FFFFFF` halo | 2 px ring, 2 px offset, white halo between ring and control. Identical on every component. |
| Information | `info-ink` on `info-bg` | `#065986` on `#F0F9FF` | Non-urgent notices ("Your plan changed"). Always the circle-i icon. Never interactive, never a link colour. |
| Success | `success-ink` on `success-bg` | `#05603A` on `#ECFDF3` | Completed or confirmed states, with check icon and a word. Not for "clinically improving". |
| Warning | `warning-ink` on `warning-bg` | `#93370D` on `#FEF7C3` | Needs attention soon, with triangle icon and a word. Tint is for chips and banners only, never a page or section background. |
| Error | `error-ink` on `error-bg`, hover `error-hover` | `#B42318` on `#FEF3F2`, `#912018` | Validation and failure messages, danger buttons, "Stop, this hurts" outline. Cross or octagon icon and a word. |
| Critical attention | `critical-solid` + `critical-on`; `critical-subtle-bg` + `critical-subtle-ink` | `#912018` + `#FFFFFF`; `#FEE4E2` + `#7A271A` | The few items that must be seen first (a session stopped for discomfort, a failed clinical save). Solid fill or a left bar, icon and the word. At most one solid critical element per view. An administrative review priority is not a medical risk rating and does not use this token by default. |
| Neutral status | `neutral-ink` on `neutral-bg` | `#344054` on `#EBEFF5` | Expected states that still need a tag ("Completed", "Open"). |
| AI-generated content | `ai-bg`, `ai-ink`, `ai-rule` | `#EFF3F6`, `#2F4A5C`, `#5B7384` | Unreviewed generated text: graphite tint, dashed left rule, the label "Draft, generated, not reviewed" and the provider name. Approved: solid `primary` rule and the reviewer's name. Rejected: dashed rule, struck text. No purple, no sparkle, no gradient. |
| Brand accent (non-action) | `accent`, `accent-ink`, `accent-subtle` | `#0E7490`, `#0B5F75`, `#E0F4F8` | Brand mark, illustration garment colour, avatar chips, marketing surfaces. Never on a control, a link, a status or AI content. |
| Overlay | `scrim`, `shadow-overlay` | `rgb(23 43 77 / 0.5)`; `0 8px 24px rgb(23 43 77 / 0.16), 0 1px 3px rgb(23 43 77 / 0.12)` | Derived from `ink`. In `tokens-final.json` under `overlay`. |

### Data visualisation

| Set | Tokens | Values | Rules |
|---|---|---|---|
| Categorical | `chart-1` to `chart-8` | `#175CD3`, `#D9531E`, `#2A9D66`, `#424B57`, `#1E6736`, `#69788C`, `#398EEF`, `#4F962C` | Use in order. First five in any chart; six to eight only with direct labels or marker shapes. A single-series chart uses `chart-1`. Series colour never encodes good or bad; no colour-by-value on pain. |
| Sequential | `seq-1` to `seq-7` | `#EFF4FF`, `#C2D4F6`, `#95B4ED`, `#5F8EE1`, `#3F78DB`, `#175CD3`, `#194185` | Steps 1 to 3 are cell fills and must carry a printed value or an outline; steps 4 to 7 may be marks. `ink` text on 1 to 3, `ink-inverse` on 6 and 7. |
| Diverging | `div-1` to `div-5` | `#194185`, `#84ADFF`, `#EBEFF5`, `#F9B27C`, `#9A3412` | Blue to orange through neutral. Never red to green. |

Chart marks also need a second channel (direct label, marker shape or dash pattern) and a table alternative; see `data-visualization-guidelines.md`.

## 2. Purpose separation (brand versus status)

Hue angles (HSL) of the inks: primary 218, accent 193, info 201, success 155, warning 19, error 4, AI 204 at 0.32 saturation (reads as grey).

- Blue (218) means "you can act on this" or "this is selected". Nothing else is cobalt.
- Info (201) is 17 degrees from primary. It is kept apart by form, not hue: always a tinted block with the circle-i icon, never underlined, never a button.
- Success and error tints are nearly identical to a deuteranope (delta-E 0.6, `color-exploration.md` section 2). Every status therefore has its own icon shape and a word. This is a structural rule, not a style choice.
- AI content has no brand or status hue at all, so "generated" cannot be read as "information", "selected" or "success".

## 3. Interactive states (all components)

| State | Filled primary | Outline (secondary) | Neutral utility | Row / nav item / chip |
|---|---|---|---|---|
| Default | `primary` + `ink-inverse` | `surface` + `secondary-border` + `link` | `surface` + `border-control` + `ink` | `surface` + `ink` |
| Hover | `primary-hover` | `secondary-hover-bg` | `surface-sunken` | `primary-subtle` |
| Pressed | `primary-active` | `primary-subtle` + `primary-active` text | `selected-bg` | `selected-bg` |
| Selected | n/a | n/a | n/a | `selected-bg` + `selected-ink` + `selected-edge` bar or check |
| Focus | ring `focus` 2 px, offset 2 px, halo `focus-inner` | same | same | same, inset where the row is clipped |
| Disabled | `disabled-bg` + `disabled-ink`, no border colour change by hue | same | same | same |
| Loading | label swaps to words ("Sending"); spinner is supplementary | same | same | n/a |
| Error (fields) | n/a | n/a | border `error-ink`, message in `error-ink` with icon | n/a |

Hover and selected are deliberately different fills (`#EFF4FF` and `#E0EAFF`); in candidate A they were the same value.

## 4. Type

Family: IBM Plex Sans 400, 500, 600 and 400 italic for all text and headings in both themes. IBM Plex Mono 400 for identifiers only (MRN, record IDs, audit hashes). Source Serif 4 is removed. Self-hosted through Fontsource. `font-variant-numeric: tabular-nums` on every numeric column, vital strip and chart axis (Plex digits are already tabular; keep the declaration).

The `fonts.serif` key stays in the JSON, pointing at the sans stack, so existing references resolve until they are deleted.

## 5. Patient versus clinician: density and type scale

Colours are identical. These differ:

| | Patient (`data-theme="patient"`) | Clinician and admin (`data-theme="clinician"`) |
|---|---|---|
| Scale (px) | 15, 17, 20, 24, 32, 40 | 12, 13, 14, 15, 18, 24 |
| Page title `h1` | 32 / 40, 600 | 24 / 32, 600 |
| Section heading `h2` | 24 / 32, 600 | 18 / 24, 600 |
| Component title `h3` | 20 / 28, 600 | 15 / 20, 600 |
| `h4` | 20 / 28, 500 | 14 / 20, 600 |
| Body | 17 / 26 | 14 / 20 |
| Label (form, button, nav) | 17 / 24, 500 | 13 / 18, 500 |
| Supporting `small` | 15 / 22 | 13 / 18 |
| Caption | 15 / 22 | 12 / 16 |
| Table or list row text | 17 / 26 | 13 / 18 |
| Data value, large | 40 / 44, 500 | 24 / 28, 600 |
| Data value, inline | 20 / 28, 600 | 14 / 20, 500 |
| Clinical notes / care-team message | 17 / 28 | 14 / 22 |
| Smallest text allowed | 15 | 12 |
| Control height | 48 | 32 (24 small) |
| Minimum target / floor | 48 / 48 | 32 / 24 (24 only with the spacing exception, never destructive) |
| Row height | 56 | 36 |
| Control horizontal padding | 16 | 10 |
| Line length | 60ch | none for tables; 72ch for prose |
| Page gutter | 20 | 24 |
| Structure | Whitespace and headings first; few bordered containers; one filled primary action per screen | Hairline-separated panels and tables; sunken header rows; links carry row actions |

Change from the candidate JSONs: patient `label` and `table` are 17 px, not 16, because 16 is not on the patient scale and the token test requires every role to sit on its theme's scale.

Unchanged from today: 4 px spacing grid, radius 6 (controls) and 10 (containers), motion 120 and 200 ms removed under reduced motion.

## 6. Contrast

### 6.1 Script output

Command (the script reads `tokens-candidates/`, so the final file was copied in under a temporary name and removed afterwards):

```
cp docs/design/tokens-final.json docs/design/tokens-candidates/FINAL.json
node docs/design/tools/contrast.mjs FINAL --strict   # exit 0
rm docs/design/tokens-candidates/FINAL.json
```

Output for the patient theme, unedited. The clinician theme's output is byte-identical (checked with `diff`), so it is not repeated. 84 pairs, 0 below threshold, 0 missing.


| fg | bg | rule | ratio | need | result | use |
|---|---|---|---|---|---|---|
| ink #172B4D | bg #F5F7FA | text | 13.13 | 4.5 | pass | primary text on canvas |
| ink #172B4D | surface #FFFFFF | text | 14.10 | 4.5 | pass | primary text on surface |
| ink #172B4D | surface-sunken #EBEFF5 | text | 12.22 | 4.5 | pass | primary text on secondary (sunken) surface |
| ink #172B4D | surface-elevated #FFFFFF | text | 14.10 | 4.5 | pass | primary text on elevated surface |
| ink-muted #42526E | bg #F5F7FA | text | 7.34 | 4.5 | pass | secondary text on canvas |
| ink-muted #42526E | surface #FFFFFF | text | 7.88 | 4.5 | pass | secondary text on surface |
| ink-muted #42526E | surface-sunken #EBEFF5 | text | 6.83 | 4.5 | pass | secondary text on sunken surface |
| ink-subtle #566681 | surface #FFFFFF | text | 5.81 | 4.5 | pass | muted text (captions, placeholders) on surface |
| ink-subtle #566681 | bg #F5F7FA | text | 5.41 | 4.5 | pass | muted text on canvas |
| ink-subtle #566681 | surface-sunken #EBEFF5 | text | 5.03 | 4.5 | pass | muted text on sunken surface |
| disabled-ink #6B7790 | disabled-bg #EBEFF5 | info | 3.89 | - | info | disabled label (exempt, 1.4.3 inactive component) |
| ink-inverse #FFFFFF | primary #175CD3 | text | 5.98 | 4.5 | pass | primary button label |
| ink-inverse #FFFFFF | primary-hover #1849A9 | text | 8.18 | 4.5 | pass | primary button label, hover |
| ink-inverse #FFFFFF | primary-active #194185 | text | 9.83 | 4.5 | pass | primary button label, pressed |
| primary #175CD3 | bg #F5F7FA | text | 5.57 | 4.5 | pass | brand hex used directly as text on canvas |
| primary #175CD3 | surface #FFFFFF | text | 5.98 | 4.5 | pass | brand hex used directly as text on surface |
| primary #175CD3 | surface-sunken #EBEFF5 | text | 5.18 | 4.5 | pass | brand hex used directly as text on sunken surface |
| link #175CD3 | bg #F5F7FA | text | 5.57 | 4.5 | pass | link / quiet button text on canvas |
| link #175CD3 | surface #FFFFFF | text | 5.98 | 4.5 | pass | link / quiet button text on surface |
| link #175CD3 | surface-sunken #EBEFF5 | text | 5.18 | 4.5 | pass | link text on sunken surface |
| link #175CD3 | primary-subtle #EFF4FF | text | 5.43 | 4.5 | pass | link text on primary tint |
| primary-hover #1849A9 | surface #FFFFFF | text | 8.18 | 4.5 | pass | link hover on surface |
| primary #175CD3 | surface #FFFFFF | ui | 5.98 | 3 | pass | checked checkbox / switch / radio fill vs surface |
| secondary-border #175CD3 | surface #FFFFFF | ui | 5.98 | 3 | pass | outline button border on surface |
| link #175CD3 | secondary-hover-bg #EFF4FF | text | 5.43 | 4.5 | pass | outline button label on its hover fill |
| selected-ink #1849A9 | selected-bg #E0EAFF | text | 6.77 | 4.5 | pass | selected row / nav item label |
| ink #172B4D | selected-bg #E0EAFF | text | 11.67 | 4.5 | pass | body text in a selected row |
| selected-edge #175CD3 | surface #FFFFFF | ui | 5.98 | 3 | pass | selected indicator bar vs surface (SC 1.4.11) |
| selected-edge #175CD3 | selected-bg #E0EAFF | ui | 4.95 | 3 | pass | selected indicator bar vs its own tint |
| border-control #697A93 | surface #FFFFFF | ui | 4.36 | 3 | pass | input / checkbox border on surface |
| border-control #697A93 | bg #F5F7FA | ui | 4.07 | 3 | pass | input / checkbox border on canvas |
| border-control #697A93 | surface-sunken #EBEFF5 | ui | 3.78 | 3 | pass | input border on sunken surface |
| border #DCE3EB | surface #FFFFFF | info | 1.29 | - | info | hairline separator on surface (decorative) |
| border #DCE3EB | bg #F5F7FA | info | 1.20 | - | info | hairline separator on canvas (decorative) |
| focus #172B4D | bg #F5F7FA | ui | 13.13 | 3 | pass | focus ring on canvas |
| focus #172B4D | surface #FFFFFF | ui | 14.10 | 3 | pass | focus ring on surface |
| focus #172B4D | surface-sunken #EBEFF5 | ui | 12.22 | 3 | pass | focus ring on sunken surface |
| focus #172B4D | selected-bg #E0EAFF | ui | 11.67 | 3 | pass | focus ring on selected row |
| focus #172B4D | focus-inner #FFFFFF | ui | 14.10 | 3 | pass | focus ring vs its inner halo (guarantees contrast on any fill) |
| focus #172B4D | primary #175CD3 | info | 2.35 | - | info | focus ring vs primary fill: never adjacent, the 2 px offset shows the white halo between them |
| success-ink #05603A | success-bg #ECFDF3 | text | 7.26 | 4.5 | pass | success chip / banner |
| warning-ink #93370D | warning-bg #FEF7C3 | text | 6.91 | 4.5 | pass | warning chip / banner |
| error-ink #B42318 | error-bg #FEF3F2 | text | 6.04 | 4.5 | pass | error chip / banner |
| info-ink #065986 | info-bg #F0F9FF | text | 7.08 | 4.5 | pass | info chip / banner |
| neutral-ink #344054 | neutral-bg #EBEFF5 | text | 9.06 | 4.5 | pass | neutral chip |
| success-ink #05603A | surface #FFFFFF | text | 7.66 | 4.5 | pass | success text on surface |
| warning-ink #93370D | surface #FFFFFF | text | 7.51 | 4.5 | pass | warning text on surface |
| error-ink #B42318 | surface #FFFFFF | text | 6.57 | 4.5 | pass | error text on surface |
| info-ink #065986 | surface #FFFFFF | text | 7.55 | 4.5 | pass | info text on surface |
| error-ink #B42318 | bg #F5F7FA | text | 6.12 | 4.5 | pass | field error text on canvas |
| ink-inverse #FFFFFF | error-ink #B42318 | text | 6.57 | 4.5 | pass | danger button label |
| ink-inverse #FFFFFF | error-hover #912018 | text | 8.66 | 4.5 | pass | danger button label, hover |
| critical-on #FFFFFF | critical-solid #912018 | text | 8.66 | 4.5 | pass | critical banner label (solid fill) |
| critical-subtle-ink #7A271A | critical-subtle-bg #FEE4E2 | text | 8.16 | 4.5 | pass | critical row / chip text on tint |
| critical-solid #912018 | surface #FFFFFF | ui | 8.66 | 3 | pass | critical icon / marker vs surface |
| ai-ink #2F4A5C | ai-bg #EFF3F6 | text | 8.34 | 4.5 | pass | AI draft label / text on AI tint |
| ink #172B4D | ai-bg #EFF3F6 | text | 12.63 | 4.5 | pass | body text inside AI draft block |
| ai-rule #5B7384 | surface #FFFFFF | ui | 4.96 | 3 | pass | AI dashed rule vs surface |
| ai-rule #5B7384 | ai-bg #EFF3F6 | ui | 4.44 | 3 | pass | AI dashed rule vs AI tint |
| ai-rule #5B7384 | bg #F5F7FA | ui | 4.62 | 3 | pass | AI dashed rule vs canvas |
| accent #0E7490 | surface #FFFFFF | ui | 5.35 | 3 | pass | accent icon / mark vs surface |
| accent-ink #0B5F75 | accent-subtle #E0F4F8 | text | 6.34 | 4.5 | pass | accent tag text |
| chart-1 #175CD3 | surface #FFFFFF | ui | 5.98 | 3 | pass | categorical series 1 vs surface |
| chart-2 #D9531E | surface #FFFFFF | ui | 4.03 | 3 | pass | categorical series 2 vs surface |
| chart-3 #2A9D66 | surface #FFFFFF | ui | 3.43 | 3 | pass | categorical series 3 vs surface |
| chart-4 #424B57 | surface #FFFFFF | ui | 8.83 | 3 | pass | categorical series 4 vs surface |
| chart-5 #1E6736 | surface #FFFFFF | ui | 6.88 | 3 | pass | categorical series 5 vs surface |
| chart-6 #69788C | surface #FFFFFF | ui | 4.50 | 3 | pass | categorical series 6 vs surface |
| chart-7 #398EEF | surface #FFFFFF | ui | 3.33 | 3 | pass | categorical series 7 vs surface |
| chart-8 #4F962C | surface #FFFFFF | ui | 3.66 | 3 | pass | categorical series 8 vs surface |
| seq-4 #5F8EE1 | surface #FFFFFF | ui | 3.25 | 3 | pass | sequential step 4 (marks) vs surface |
| seq-5 #3F78DB | surface #FFFFFF | ui | 4.26 | 3 | pass | sequential step 5 (marks) vs surface |
| seq-6 #175CD3 | surface #FFFFFF | ui | 5.98 | 3 | pass | sequential step 6 (marks) vs surface |
| seq-7 #194185 | surface #FFFFFF | ui | 9.83 | 3 | pass | sequential step 7 (marks) vs surface |
| seq-1 #EFF4FF | surface #FFFFFF | info | 1.10 | - | info | sequential step 1 (light fills; needs label or outline) |
| seq-2 #C2D4F6 | surface #FFFFFF | info | 1.49 | - | info | sequential step 2 (light fills; needs label or outline) |
| seq-3 #95B4ED | surface #FFFFFF | info | 2.09 | - | info | sequential step 3 (light fills; needs label or outline) |
| div-1 #194185 | surface #FFFFFF | ui | 9.83 | 3 | pass | diverging end 1 vs surface |
| div-5 #9A3412 | surface #FFFFFF | ui | 7.30 | 3 | pass | diverging end 5 vs surface |
| ink #172B4D | seq-1 #EFF4FF | text | 12.79 | 4.5 | pass | text on lightest sequential cell |
| ink #172B4D | seq-2 #C2D4F6 | text | 9.42 | 4.5 | pass | text on seq-2 cell |
| ink #172B4D | seq-3 #95B4ED | text | 6.73 | 4.5 | pass | text on seq-3 cell |
| ink-inverse #FFFFFF | seq-6 #175CD3 | text | 5.98 | 4.5 | pass | white text on seq-6 cell |
| ink-inverse #FFFFFF | seq-7 #194185 | text | 9.83 | 4.5 | pass | white text on darkest cell |

Categorical chart colours, smallest delta-E between any two (CIE76; below ~10 is hard to tell apart):
all 8: normal 18.9 (series 4/6) | protan 14.8 (series 2/8) | deutan 14.9 (series 2/8) | tritan 12.4 (series 3/8)
first 5: normal 22 (series 3/5) | protan 20.1 (series 3/5) | deutan 18.9 (series 3/5) | tritan 20.8 (series 1/5)

### 6.2 Pairs the script does not cover

Computed with the script's exported `ratio()` on `tokens-final.json` (floored to two decimals, same thresholds).

| fg | bg | rule | ratio | need | result | use |
|---|---|---|---|---|---|---|
| ink-muted #42526E | ai-bg #EFF3F6 | text | 7.06 | 4.5 | pass | secondary text inside AI block |
| link #175CD3 | ai-bg #EFF3F6 | text | 5.36 | 4.5 | pass | source link inside AI block |
| ai-ink #2F4A5C | surface #FFFFFF | text | 9.31 | 4.5 | pass | AI label on surface |
| ai-rule #5B7384 | surface-sunken #EBEFF5 | ui | 4.30 | 3 | pass | AI dashed rule on sunken surface |
| ink-muted #42526E | selected-bg #E0EAFF | text | 6.52 | 4.5 | pass | secondary text in a selected row |
| ink-subtle #566681 | selected-bg #E0EAFF | text | 4.81 | 4.5 | pass | muted text in a selected row |
| link #175CD3 | selected-bg #E0EAFF | text | 4.95 | 4.5 | pass | link in a selected row |
| ink-muted #42526E | info-bg #F0F9FF | text | 7.39 | 4.5 | pass | secondary text in an info banner |
| link #175CD3 | info-bg #F0F9FF | text | 5.61 | 4.5 | pass | link in an info banner |
| ink #172B4D | warning-bg #FEF7C3 | text | 12.96 | 4.5 | pass | body text in a warning banner |
| ink #172B4D | error-bg #FEF3F2 | text | 12.97 | 4.5 | pass | body text in an error banner |
| ink #172B4D | success-bg #ECFDF3 | text | 13.37 | 4.5 | pass | body text in a success banner |
| ink #172B4D | critical-subtle-bg #FEE4E2 | text | 11.69 | 4.5 | pass | body text in a critical row |
| error-ink #B42318 | surface #FFFFFF | ui | 6.57 | 3 | pass | danger outline button border; invalid field border |
| info-ink #065986 | bg #F5F7FA | text | 7.03 | 4.5 | pass | info text on canvas |
| success-ink #05603A | bg #F5F7FA | text | 7.13 | 4.5 | pass | success text on canvas |
| warning-ink #93370D | bg #F5F7FA | text | 7.00 | 4.5 | pass | warning text on canvas |
| warning-ink #93370D | surface-sunken #EBEFF5 | text | 6.51 | 4.5 | pass | warning text on sunken surface |
| neutral-ink #344054 | surface #FFFFFF | text | 10.46 | 4.5 | pass | neutral tag on surface |
| accent-ink #0B5F75 | surface #FFFFFF | text | 7.22 | 4.5 | pass | accent text on surface |
| accent #0E7490 | bg #F5F7FA | ui | 4.99 | 3 | pass | accent mark on canvas |
| ink-inverse #FFFFFF | accent #0E7490 | text | 5.35 | 4.5 | pass | white on accent fill (brand mark) |
| selected-bg #E0EAFF | secondary-hover-bg #EFF4FF | info | 1.09 | - | info | selected fill vs hover fill (state difference, not a WCAG pair) |
| selected-bg #E0EAFF | surface #FFFFFF | info | 1.20 | - | info | selected fill vs surface (edge bar carries the state) |
| ai-bg #EFF3F6 | surface #FFFFFF | info | 1.11 | - | info | AI tint vs surface (rule and label carry the meaning) |
| bg #F5F7FA | surface #FFFFFF | info | 1.07 | - | info | canvas vs surface (hairline separates) |

### 6.3 Reading the results

- No required pair fails. Tightest required margins: `seq-4` on surface 3.25, `chart-7` 3.33, `chart-3` 3.43, `chart-8` 3.66, `border-control` on sunken 3.78.
- `focus` against `primary` is 2.35:1 and is reported as info on purpose: the 2 px offset shows the white halo between them, and ring against halo is 14.10:1. Setting `outline-offset: 0` on a filled control breaks this.
- `border` is 1.20 to 1.29:1. It is decorative. A control whose only boundary is `border` fails 1.4.11.
- Selected versus hover fill is 1.09:1 and selected versus surface 1.20:1. Fill alone is never the selected indicator; the edge bar or check mark (5.98:1 on surface, 4.95:1 on the selected fill) carries it.
- AI tint versus surface is 1.11:1. The dashed rule (4.30 to 4.96:1) and the label carry the meaning.
- Chart colour-vision check (smallest CIE76 delta-E between any two series): first five 18.9 or more in every simulated vision type; all eight 12.4 or more. Darkening `chart-3` cost some separation against candidate A (first five 20.8, all eight 14.8) in exchange for 3.43:1 against white instead of 3.08:1.
- Not covered by any number here: text over photographs, colours added outside this file, rendering on real displays, forced-colours mode, and anything about how people perceive the palette.

## 7. Illustration rule

- Regenerate or re-export every raster illustration with a true alpha channel. No baked paper, no matte colour, no drop shadow.
- Default container: a `surface-sunken` (`#EBEFF5`) tile, radius 10, no border. The art must also read on `surface` and `bg`, so any white or near-white area inside the figure needs an `ink` outline.
- Line colour `ink` `#172B4D`. Clothing fills from `accent` `#0E7490`, `accent-subtle` `#E0F4F8`, `seq-2` `#C2D4F6` and white. Mat and floor lines `border-control` `#697A93`. Skin tones stay natural and varied. No forest green, tan or cream fills.
- Acceptance check: composite each file on `#FFFFFF`, `#F5F7FA` and `#EBEFF5`; no fringe; no opaque pixel in the corner regions; no fill with hue 25 to 65 degrees and saturation above 0.10 outside skin.

## 8. What the implementation must keep true

- All values come from `tokens.ts` generated from `tokens-final.json`; no raw hex in components or apps.
- `<body>` and every shell root use `bg`; no element may fall back to the old patient cream.
- The token test asserts the values in this file (see DR-001 section 8 for the test changes).
