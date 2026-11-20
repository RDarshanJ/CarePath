# Colour exploration: three directions for CarePath

Status: research and token candidates for the advisor's rendered comparison. Provisional. This document does **not** pick the final direction.
Brief: `docs/DESIGN-BRIEF.md` sections 2, 3, 4 and 10. Access date for all web sources: 2026-11-20.
Reproduce every number here: `node docs/design/tools/contrast.mjs` (script in `docs/design/tools/contrast.mjs`, reads `docs/design/tokens-candidates/{A,B,C}.json`).

## 1. What the research says

### 1.1 Accessibility standards (fetched and read)

| Source | Finding that shapes the tokens |
|---|---|
| [W3C Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 4.5:1 for text, 3:1 for large text (about 24 px regular or 18.5 px bold). Ratios are not rounded: 4.499 fails. Disabled controls and logotypes are exempt. The script floors to two decimals for the same reason. |
| [W3C Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 3:1 for the parts of a control needed to identify it, for state indicators (the check in a checkbox, a selected marker), for focus indicators, and for chart marks needed to read the data. Colour-only state changes can also fail 1.4.1. Hover need not hit 3:1 but must not lose contrast. |
| [W3C Understanding 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) | Level **AAA** in WCAG 2.2, not AA: indicator at least the area of a 2 px perimeter, with 3:1 between focused and unfocused pixels. We adopt it anyway as a design target (2 px ring, 2 px offset). |
| [W3C Understanding 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Level **AA**: a focused component must not be entirely hidden by author content such as sticky headers, footers or cookie banners. Fix with scroll-padding. This is a layout rule for the sticky clinician header and the patient bottom nav, not a colour rule. Note the brief's shorthand "2.4.11/2.4.13": only 2.4.11 is AA. |
| [NHS design system, colour](https://service-manual.nhs.uk/design-system/styles/colour) | Text `#212B32`, secondary text `#4C6272`, link `#005EB8`, error `#D5281B`, success `#007F3B`, border `#D8DDE0`, input border `#4C6272`, page background `#F0F4F5`. Aims for WCAG 2.2 AA and AAA where possible, and says openly that not every palette pairing passes (its own border on its page background is low-contrast). Colour must never be the only carrier of meaning. |
| [NHS design system, focus state](https://service-manual.nhs.uk/design-system/styles/focus-state) | Yellow plus black: yellow background with a black underline on links, yellow outline plus thick black border on inputs, so the indicator meets 1.4.11 on any NHS background. Lesson: a **two-colour** focus indicator survives any adjacent fill. We use dark ring plus white halo for the same reason. |
| [USWDS color overview](https://designsystem.digital.gov/design-tokens/color/overview/) | Grades 0 to 100 by lightness; a grade difference of 50 predicts 4.5:1 and 40 predicts 3:1 (large text). Choose pairs by grade difference, start in black and white then add colour, and do not rely on colour alone (about 4.5% of people have a colour-vision difference, mostly red/green). Suggests avoiding pure black on white. |
| [CMS Design System, theme colors](https://design.cms.gov/v/9.0.0/foundation/theme-colors) | Role-named tokens (primary, focus, error, success, warn, base text, info) each with a 50 to 800 lightness ladder; focus is a light/dark **pair** (`--color-focus-light` white, `--color-focus-dark`). Page lists token names only, no hex, so no CMS hex values are quoted here. Same pair-based focus idea as NHS. |

Takeaways used in the token sets:

1. Every status is a role-named **ink on tint** pair plus an icon and a word. Tints carry no meaning alone.
2. Focus is a **two-part ring** (dark ring plus white halo) so it holds on canvas, surface, sunken, selected and any filled control.
3. A **ladder per role** (hover, pressed, subtle) is the CMS and USWDS pattern; we keep the ladder short (base, hover, pressed, subtle).
4. Hairline borders are decorative and may be under 3:1 (NHS does the same); anything that identifies a control uses the strong border at 3:1 or more.

### 1.2 Observed healthcare brands (what could be verified)

Direct site fetches from this environment were refused by the egress proxy (HTTP 403), and Mobbin searches for Hinge Health, Sword Health, One Medical, Abridge, Headway and Zocdoc returned **no screens from those products** (results were unrelated apps such as Ladder, WHOOP, Zillow and Vercel, which were not used). So no palette below is a computed-style observation of a live product. What the retrievable sources say:

| Product | What is citable | Source | Status |
|---|---|---|---|
| Hinge Health | Primary colour described as a bright "Evergreen", chosen to suggest growth and an active life. No hex, no typefaces stated. | [Hinge Health, "Meet the new Hinge Health brand"](https://www.hingehealth.com/resources/articles/meet-the-new-hinge-health-brand/) | [Observed in first-party text] |
| Sword Health | 2022 rebrand: colour palette "upgraded", new two-circle logomark (outlined for prevention, filled for treatment), apps given a "softer look and feel". No hex or fonts. | [Sword Health press release](https://rss.globenewswire.com/news-release/2022/06/30/2472119/0/en/SWORD-HEALTH-LAUNCHES-A-NEW-BRAND-THAT-EMBODIES-ITS-VISION-TO-FREE-THE-WORLD-FROM-PAIN.html) | [Observed in first-party text] |
| One Medical | Typefaces named: a custom serif cut of GT Super ("One GT Super") and Ginto (geometric-humanist sans). Palette exists only as an image on the brand page; no names or hex. | [One Medical brand guidelines](https://www.onemedical.com/brand-guidelines/) | [Observed, typefaces only] |
| Abridge | Identity by Pentagram built on a custom display typeface ("Abridge Display") with modular letterforms that split and recombine. No colour information on the page. | [Pentagram, Abridge](https://www.pentagram.com/work/abridge) | [Observed, type only] |
| Headway | A third-party "design spec" lists brand `#0B663D`, hover `#084F30`, bright `#13AA65`, canvas `#F2FDF9`, text `#212326`, borders `#DADCE0`, status success `#13AA65`, warning `#D99524`, danger `#C94646`, focus `#0B663D`; fonts Honey (display) and PostGrotesk (body). The page does not say the values were extracted from CSS. | [webdesignhot spec for headway.co](https://www.webdesignhot.com/api/design-md/headway.md) | [Third-party, unverified]. Treat as indicative only. |
| Zocdoc | Identity built on yellow; a Zocdoc executive says health branding is dominated by blues and greens and that blue is the most conservative choice. No hex or palette. | [Fast Company on the Zocdoc rebrand](https://www.fastcompany.com/3056755/zocdocs-new-identity-puts-a-friendly-face-on-health-care) | [Observed in press text] |

What recurs (labelled judgement from the above, not a measured trend): care brands use one confident brand hue (green at Hinge Health and, per the unverified spec, Headway), keep status colours separate from it, and reserve a distinct treatment for the product's signature feature (Abridge's type). Zocdoc's quote supports the risk that blue-led palettes (Directions A and C) read as conservative rather than distinctive.

Gap to close in the rendered comparison: none of these six could be seen at pixel level here. If the advisor wants pixel-level references, someone with browser access should capture them.

## 2. Principles applied to all three directions

- **Brand and status have different jobs.** Brand colour: primary action, selection, links. Status colours: information, success, warning, error, critical, only ever as ink on tint with icon and word.
- **Not red or green alone** (brief section 4). Measured evidence, using Machado 2009 simulation and CIE76 delta-E (script):

  | Direction | success-bg vs error-bg, deuteranopia | warning-ink vs error-ink, deuteranopia | success-ink vs error-ink, protanopia |
  |---|---|---|---|
  | A | 0.6 | 5.8 | 13.5 |
  | B | 1.3 | 3.5 | 8.3 |
  | C | 1.3 | 4.8 | 8.6 |

  Delta-E under about 10 is hard to tell apart. The success and error **tints** are effectively identical to a deuteranope (0.6 to 1.3), and warning and error **inks** are close (3.5 to 5.8). So the rule is structural, not stylistic: every status has (a) its own icon shape (check, triangle, octagon or cross, circle-i), (b) a word ("Stable", "Needs review", "Overdue"), (c) position or shape where it sits in a list (a left bar for critical rows). Charts: use direct labels, marker shapes and dash patterns in addition to colour; use blue/orange, not red/green, for diverging scales.
- **Critical attention is a heavier red than error.** `critical-solid` is a dark solid fill with white text, an icon and the word "Urgent", used sparingly. Error is a tint. The two are close in hue by design (delta-E 8 to 16 across vision types), so the difference is carried by weight (solid fill), icon and label.
- **AI-generated content is never purple** (brief section 2) and always has three non-colour cues: dashed rule, "AI draft" label with provider, and a review action. The AI colour differs per direction (A teal, B graphite neutral, C sky blue).
- **Focus** (all directions): 2 px ring in the direction's darkest ink, 2 px offset, white halo between ring and control. The ring against the white halo is 13.6:1 or better in every direction (A 14.1, B 13.6, C 17.9), and against canvas, surface, sunken and selected backgrounds it is far above 3:1. Against a primary fill directly it would fail (2.4 to 2.9:1), but the halo means they never touch; engineers must keep the offset (see 5.2).
- **Two themes, one brand.** The patient and clinician colour sets in the candidate JSONs are identical; they differ in density and type size only (see typography doc). The brief forbids per-app brands.
- **No cream, beige or tan anywhere.** Every neutral is cool (blue-grey, hue about 195 to 225).

## 3. The three directions as semantic token sets

Hex values are in `docs/design/tokens-candidates/{A,B,C}.json`. The brief's starting hexes are kept exactly (canvas, border, primary, secondary, text); everything else is derived and tuned to pass.

- **A, Modern clinical.** Cobalt `#175CD3` primary, teal `#0E7490` as accent and AI colour, navy `#172B4D` ink, canvas `#F5F7FA`.
- **B, Contemporary digital care.** Teal `#087F8C` primary, green `#0D9488` accent, deep navy `#123047` ink, canvas `#F4F7F8`. Because the brief hex `#087F8C` fails as text on canvas (4.40:1), B adds a `link` token `#066A75` for text use.
- **C, Enterprise clinical intelligence.** Royal blue `#1D4ED8` primary, sky `#0369A1` accent and AI colour, slate-navy `#0F172A` ink, canvas `#F6F8FC`.

Role mapping from brief section 4 to keys: canvas `bg`; primary surface `surface`; secondary surface `surface-sunken`; elevated surface `surface-elevated`; text `ink` / `ink-muted` / `ink-subtle` / `disabled-ink`; borders `border` / `border-control`; primary action `primary` / `primary-hover` / `primary-active`; secondary action `secondary-border` + `secondary-hover-bg` + `link`; selected `selected-*`; focus `focus` + `focus-inner`; status `*-ink` + `*-bg`; critical `critical-*`; AI `ai-*`; data viz `chart-*`, `seq-*`, `div-*`.

### 3.1 Token values side by side

| Group | Token | Role | A | B | C |
|---|---|---|---|---|---|
| Canvas and surfaces | `bg` | Application canvas | `#F5F7FA` | `#F4F7F8` | `#F6F8FC` |
|  | `surface` | Primary surface | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
|  | `surface-sunken` | Secondary surface | `#EBEFF5` | `#E9EFF1` | `#EDF1F8` |
|  | `surface-elevated` | Elevated surface (overlays, add shadow-overlay) | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| Text | `ink` | Primary text | `#172B4D` | `#123047` | `#0F172A` |
|  | `ink-muted` | Secondary text | `#42526E` | `#3F5A6B` | `#475569` |
|  | `ink-subtle` | Muted text (captions, placeholders) | `#566681` | `#53697A` | `#586579` |
|  | `disabled-ink` | Disabled text | `#6B7790` | `#6D8190` | `#7A8699` |
|  | `ink-inverse` | Text on filled colour | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| Borders | `border` | Default border (decorative hairline) | `#DCE3EB` | `#DCE6E9` | `#E2E8F0` |
|  | `border-control` | Strong border (controls, 3:1) | `#697A93` | `#667F8E` | `#66758B` |
| Actions and selection | `primary` | Primary action | `#175CD3` | `#087F8C` | `#1D4ED8` |
|  | `primary-hover` | Primary hover | `#1849A9` | `#066A75` | `#1E40AF` |
|  | `primary-active` | Primary pressed | `#194185` | `#05545D` | `#1E3A8A` |
|  | `primary-subtle` | Primary tint | `#EFF4FF` | `#E3F3F5` | `#EFF4FF` |
|  | `link` | Link / quiet-button text | `#175CD3` | `#066A75` | `#1D4ED8` |
|  | `secondary-border` | Secondary (outline) action border | `#175CD3` | `#087F8C` | `#1D4ED8` |
|  | `secondary-hover-bg` | Secondary action hover fill | `#EFF4FF` | `#E3F3F5` | `#EFF4FF` |
|  | `selected-bg` | Selected fill | `#EFF4FF` | `#E3F3F5` | `#EFF4FF` |
|  | `selected-ink` | Selected label | `#1849A9` | `#065A64` | `#1E40AF` |
|  | `selected-edge` | Selected indicator bar | `#175CD3` | `#087F8C` | `#1D4ED8` |
| Focus | `focus` | Focus ring (2 px) | `#172B4D` | `#123047` | `#0F172A` |
|  | `focus-inner` | Focus halo (2 px offset, white) | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| Status | `info-ink` | Information text/icon | `#065986` | `#1B5E8C` | `#0C4A6E` |
|  | `info-bg` | Information tint | `#F0F9FF` | `#EBF4FA` | `#F0F9FF` |
|  | `success-ink` | Success text/icon | `#05603A` | `#17652F` | `#166534` |
|  | `success-bg` | Success tint | `#ECFDF3` | `#EBF7ED` | `#F0FDF4` |
|  | `warning-ink` | Warning text/icon | `#93370D` | `#8A4B08` | `#92400E` |
|  | `warning-bg` | Warning tint | `#FFFAEB` | `#FFF7E0` | `#FFFBEB` |
|  | `error-ink` | Error text/icon, danger button fill | `#B42318` | `#B42318` | `#B91C1C` |
|  | `error-bg` | Error tint | `#FEF3F2` | `#FEF3F2` | `#FEF2F2` |
|  | `error-hover` | Danger hover | `#912018` | `#912018` | `#991B1B` |
|  | `neutral-ink` | Neutral text | `#344054` | `#2F4656` | `#334155` |
|  | `neutral-bg` | Neutral tint | `#EBEFF5` | `#E9EFF1` | `#EDF1F8` |
| Critical attention | `critical-solid` | Critical solid fill | `#912018` | `#912018` | `#991B1B` |
|  | `critical-on` | Text on critical fill | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
|  | `critical-subtle-bg` | Critical tint | `#FEE4E2` | `#FEE4E2` | `#FEE2E2` |
|  | `critical-subtle-ink` | Critical text on tint | `#7A271A` | `#7A271A` | `#7F1D1D` |
| AI-generated content | `ai-bg` | AI draft fill | `#EAF7FA` | `#EFF3F6` | `#EEF6FB` |
|  | `ai-ink` | AI label/text | `#0B5F75` | `#2F4A5C` | `#075985` |
|  | `ai-rule` | AI dashed rule | `#0E7490` | `#5B7384` | `#0369A1` |
| Brand accent (non-action) | `accent` | Accent mark | `#0E7490` | `#0D9488` | `#0369A1` |
|  | `accent-ink` | Accent text | `#0B5F75` | `#0A665E` | `#075985` |
|  | `accent-subtle` | Accent tint | `#E0F4F8` | `#E1F5F2` | `#E6F3FA` |

**Data visualisation** (categorical series 1 to 8 in order of use; sequential light to dark; diverging blue to orange)

| Token | A | B | C |
|---|---|---|---|
| `chart-1` | `#175CD3` | `#087F8C` | `#1D4ED8` |
| `chart-2` | `#D9531E` | `#D9531E` | `#D9531E` |
| `chart-3` | `#30A66F` | `#124AE2` | `#30A66F` |
| `chart-4` | `#424B57` | `#424B57` | `#424B57` |
| `chart-5` | `#1E6736` | `#1D99ED` | `#12683A` |
| `chart-6` | `#69788C` | `#0EAA42` | `#69788C` |
| `chart-7` | `#398EEF` | `#1E672C` | `#2683ED` |
| `chart-8` | `#4F962C` | `#1273E2` | `#4F962C` |
| `seq-1` | `#EFF4FF` | `#E6F4F6` | `#EFF4FF` |
| `seq-2` | `#C2D4F6` | `#B2D8DD` | `#C5D3F7` |
| `seq-3` | `#95B4ED` | `#7EBDC4` | `#9CB2F0` |
| `seq-4` | `#6693E3` | `#48A0AA` | `#7190E8` |
| `seq-5` | `#3F78DB` | `#28909B` | `#476FE0` |
| `seq-6` | `#175CD3` | `#087F8C` | `#1D4ED8` |
| `seq-7` | `#194185` | `#05545D` | `#1E3A8A` |
| `div-1` | `#194185` | `#05545D` | `#1E3A8A` |
| `div-2` | `#84ADFF` | `#7EC4CC` | `#8FAEF3` |
| `div-3` | `#EBEFF5` | `#E9EFF1` | `#EDF1F8` |
| `div-4` | `#F9B27C` | `#F9B27C` | `#F9B27C` |
| `div-5` | `#9A3412` | `#9A3412` | `#9A3412` |

## 4. Computed contrast (WCAG 2.x ratios, unrounded comparison, shown floored)

Rules: `text` 4.5:1; `ui` 3:1 (1.4.11); `info` = reported for context, exempt or decorative (hairlines, disabled controls, light sequential fills that always carry a label or outline). Large-text 3:1 is not relied on anywhere: all text pairs are held to 4.5:1. The tables are identical for the patient and clinician themes (the colour sets are identical). Re-run with `node docs/design/tools/contrast.mjs` (`--strict` exits non-zero on any failing non-info pair; `--json` for machine output).

| Use (fg on bg) | Rule | Need | A | B | C |
|---|---|---|---|---|---|
| primary text on canvas (`ink` / `bg`) | text | 4.5 | 13.13 | 12.67 | 16.79 |
| primary text on surface (`ink` / `surface`) | text | 4.5 | 14.10 | 13.64 | 17.85 |
| primary text on secondary (sunken) surface (`ink` / `surface-sunken`) | text | 4.5 | 12.22 | 11.74 | 15.75 |
| primary text on elevated surface (`ink` / `surface-elevated`) | text | 4.5 | 14.10 | 13.64 | 17.85 |
| secondary text on canvas (`ink-muted` / `bg`) | text | 4.5 | 7.34 | 6.75 | 7.12 |
| secondary text on surface (`ink-muted` / `surface`) | text | 4.5 | 7.88 | 7.27 | 7.57 |
| secondary text on sunken surface (`ink-muted` / `surface-sunken`) | text | 4.5 | 6.83 | 6.26 | 6.68 |
| muted text (captions, placeholders) on surface (`ink-subtle` / `surface`) | text | 4.5 | 5.81 | 5.72 | 5.91 |
| muted text on canvas (`ink-subtle` / `bg`) | text | 4.5 | 5.41 | 5.31 | 5.55 |
| muted text on sunken surface (`ink-subtle` / `surface-sunken`) | text | 4.5 | 5.03 | 4.92 | 5.21 |
| disabled label (exempt, 1.4.3 inactive component) (`disabled-ink` / `disabled-bg`) | info | - | 3.89 (info) | 3.48 (info) | 3.25 (info) |
| primary button label (`ink-inverse` / `primary`) | text | 4.5 | 5.98 | 4.74 | 6.70 |
| primary button label, hover (`ink-inverse` / `primary-hover`) | text | 4.5 | 8.18 | 6.31 | 8.72 |
| primary button label, pressed (`ink-inverse` / `primary-active`) | text | 4.5 | 9.83 | 8.63 | 10.35 |
| brand hex used directly as text on canvas (`primary` / `bg`) | text | 4.5 | 5.57 | **4.40 FAIL** | 6.30 |
| brand hex used directly as text on surface (`primary` / `surface`) | text | 4.5 | 5.98 | 4.74 | 6.70 |
| brand hex used directly as text on sunken surface (`primary` / `surface-sunken`) | text | 4.5 | 5.18 | **4.08 FAIL** | 5.91 |
| link / quiet button text on canvas (`link` / `bg`) | text | 4.5 | 5.57 | 5.86 | 6.30 |
| link / quiet button text on surface (`link` / `surface`) | text | 4.5 | 5.98 | 6.31 | 6.70 |
| link text on sunken surface (`link` / `surface-sunken`) | text | 4.5 | 5.18 | 5.43 | 5.91 |
| link text on primary tint (`link` / `primary-subtle`) | text | 4.5 | 5.43 | 5.53 | 6.08 |
| link hover on surface (`primary-hover` / `surface`) | text | 4.5 | 8.18 | 6.31 | 8.72 |
| checked checkbox / switch / radio fill vs surface (`primary` / `surface`) | ui | 3 | 5.98 | 4.74 | 6.70 |
| outline button border on surface (`secondary-border` / `surface`) | ui | 3 | 5.98 | 4.74 | 6.70 |
| outline button label on its hover fill (`link` / `secondary-hover-bg`) | text | 4.5 | 5.43 | 5.53 | 6.08 |
| selected row / nav item label (`selected-ink` / `selected-bg`) | text | 4.5 | 7.42 | 6.93 | 7.91 |
| body text in a selected row (`ink` / `selected-bg`) | text | 4.5 | 12.79 | 11.95 | 16.19 |
| selected indicator bar vs surface (SC 1.4.11) (`selected-edge` / `surface`) | ui | 3 | 5.98 | 4.74 | 6.70 |
| selected indicator bar vs its own tint (`selected-edge` / `selected-bg`) | ui | 3 | 5.43 | 4.15 | 6.08 |
| input / checkbox border on surface (`border-control` / `surface`) | ui | 3 | 4.36 | 4.20 | 4.68 |
| input / checkbox border on canvas (`border-control` / `bg`) | ui | 3 | 4.07 | 3.90 | 4.40 |
| input border on sunken surface (`border-control` / `surface-sunken`) | ui | 3 | 3.78 | 3.62 | 4.13 |
| hairline separator on surface (decorative) (`border` / `surface`) | info | - | 1.29 (info) | 1.26 (info) | 1.23 (info) |
| hairline separator on canvas (decorative) (`border` / `bg`) | info | - | 1.20 (info) | 1.17 (info) | 1.15 (info) |
| focus ring on canvas (`focus` / `bg`) | ui | 3 | 13.13 | 12.67 | 16.79 |
| focus ring on surface (`focus` / `surface`) | ui | 3 | 14.10 | 13.64 | 17.85 |
| focus ring on sunken surface (`focus` / `surface-sunken`) | ui | 3 | 12.22 | 11.74 | 15.75 |
| focus ring on selected row (`focus` / `selected-bg`) | ui | 3 | 12.79 | 11.95 | 16.19 |
| focus ring vs its inner halo (guarantees contrast on any fill) (`focus` / `focus-inner`) | ui | 3 | 14.10 | 13.64 | 17.85 |
| focus ring vs primary fill: never adjacent, the 2 px offset shows the white halo between them (`focus` / `primary`) | info | - | 2.35 (info) | 2.87 (info) | 2.66 (info) |
| success chip / banner (`success-ink` / `success-bg`) | text | 4.5 | 7.26 | 6.48 | 6.81 |
| warning chip / banner (`warning-ink` / `warning-bg`) | text | 4.5 | 7.20 | 6.35 | 6.83 |
| error chip / banner (`error-ink` / `error-bg`) | text | 4.5 | 6.04 | 6.04 | 5.91 |
| info chip / banner (`info-ink` / `info-bg`) | text | 4.5 | 7.08 | 6.22 | 8.87 |
| neutral chip (`neutral-ink` / `neutral-bg`) | text | 4.5 | 9.06 | 8.48 | 9.14 |
| success text on surface (`success-ink` / `surface`) | text | 4.5 | 7.66 | 7.14 | 7.13 |
| warning text on surface (`warning-ink` / `surface`) | text | 4.5 | 7.51 | 6.79 | 7.09 |
| error text on surface (`error-ink` / `surface`) | text | 4.5 | 6.57 | 6.57 | 6.47 |
| info text on surface (`info-ink` / `surface`) | text | 4.5 | 7.55 | 6.93 | 9.45 |
| field error text on canvas (`error-ink` / `bg`) | text | 4.5 | 6.12 | 6.10 | 6.08 |
| danger button label (`ink-inverse` / `error-ink`) | text | 4.5 | 6.57 | 6.57 | 6.47 |
| danger button label, hover (`ink-inverse` / `error-hover`) | text | 4.5 | 8.66 | 8.66 | 8.31 |
| critical banner label (solid fill) (`critical-on` / `critical-solid`) | text | 4.5 | 8.66 | 8.66 | 8.31 |
| critical row / chip text on tint (`critical-subtle-ink` / `critical-subtle-bg`) | text | 4.5 | 8.16 | 8.16 | 8.20 |
| critical icon / marker vs surface (`critical-solid` / `surface`) | ui | 3 | 8.66 | 8.66 | 8.31 |
| AI draft label / text on AI tint (`ai-ink` / `ai-bg`) | text | 4.5 | 6.59 | 8.34 | 6.91 |
| body text inside AI draft block (`ink` / `ai-bg`) | text | 4.5 | 12.88 | 12.22 | 16.33 |
| AI dashed rule vs surface (`ai-rule` / `surface`) | ui | 3 | 5.35 | 4.96 | 5.93 |
| AI dashed rule vs AI tint (`ai-rule` / `ai-bg`) | ui | 3 | 4.89 | 4.44 | 5.42 |
| AI dashed rule vs canvas (`ai-rule` / `bg`) | ui | 3 | 4.99 | 4.61 | 5.58 |
| accent icon / mark vs surface (`accent` / `surface`) | ui | 3 | 5.35 | 3.74 | 5.93 |
| accent tag text (`accent-ink` / `accent-subtle`) | text | 4.5 | 6.34 | 6.03 | 6.68 |
| categorical series 1 vs surface (`chart-1` / `surface`) | ui | 3 | 5.98 | 4.74 | 6.70 |
| categorical series 2 vs surface (`chart-2` / `surface`) | ui | 3 | 4.03 | 4.03 | 4.03 |
| categorical series 3 vs surface (`chart-3` / `surface`) | ui | 3 | 3.08 | 6.76 | 3.08 |
| categorical series 4 vs surface (`chart-4` / `surface`) | ui | 3 | 8.83 | 8.83 | 8.83 |
| categorical series 5 vs surface (`chart-5` / `surface`) | ui | 3 | 6.88 | 3.07 | 6.84 |
| categorical series 6 vs surface (`chart-6` / `surface`) | ui | 3 | 4.50 | 3.06 | 4.50 |
| categorical series 7 vs surface (`chart-7` / `surface`) | ui | 3 | 3.33 | 6.92 | 3.78 |
| categorical series 8 vs surface (`chart-8` / `surface`) | ui | 3 | 3.66 | 4.58 | 3.66 |
| sequential step 4 (marks) vs surface (`seq-4` / `surface`) | ui | 3 | 3.06 | 3.05 | 3.06 |
| sequential step 5 (marks) vs surface (`seq-5` / `surface`) | ui | 3 | 4.26 | 3.78 | 4.54 |
| sequential step 6 (marks) vs surface (`seq-6` / `surface`) | ui | 3 | 5.98 | 4.74 | 6.70 |
| sequential step 7 (marks) vs surface (`seq-7` / `surface`) | ui | 3 | 9.83 | 8.63 | 10.35 |
| sequential step 1 (light fills; needs label or outline) (`seq-1` / `surface`) | info | - | 1.10 (info) | 1.12 (info) | 1.10 (info) |
| sequential step 2 (light fills; needs label or outline) (`seq-2` / `surface`) | info | - | 1.49 (info) | 1.52 (info) | 1.49 (info) |
| sequential step 3 (light fills; needs label or outline) (`seq-3` / `surface`) | info | - | 2.09 (info) | 2.10 (info) | 2.09 (info) |
| diverging end 1 vs surface (`div-1` / `surface`) | ui | 3 | 9.83 | 8.63 | 10.35 |
| diverging end 5 vs surface (`div-5` / `surface`) | ui | 3 | 7.30 | 7.30 | 7.30 |
| text on lightest sequential cell (`ink` / `seq-1`) | text | 4.5 | 12.79 | 12.10 | 16.19 |
| text on seq-2 cell (`ink` / `seq-2`) | text | 4.5 | 9.42 | 8.93 | 11.93 |
| text on seq-3 cell (`ink` / `seq-3`) | text | 4.5 | 6.73 | 6.47 | 8.53 |
| white text on seq-6 cell (`ink-inverse` / `seq-6`) | text | 4.5 | 5.98 | 4.74 | 6.70 |
| white text on darkest cell (`ink-inverse` / `seq-7`) | text | 4.5 | 9.83 | 8.63 | 10.35 |

## 5. Results

### 5.1 Pairs that fail AA

| Direction | Failing pair | Ratio | Needs | What it means | Mitigation (already in the token set) |
|---|---|---|---|---|---|
| **A** | none | | | All 77 required pairs pass. Tightest margins: `chart-3` on surface 3.08, `seq-4` on surface 3.07 (both 3:1 marks). | none needed |
| **B** | `primary` `#087F8C` as **text** on canvas `#F4F7F8` | 4.40 | 4.5 | The brief's primary hex is not safe as link or quiet-button text on the page background. | `link` `#066A75` for all text use (passes everywhere). `primary` stays a fill only. |
| **B** | `primary` `#087F8C` as **text** on sunken surface `#E9EFF1` | 4.08 | 4.5 | Same, on secondary surfaces (table headers, sidebars). | Same `link` token. |
| **C** | none | | | All 77 required pairs pass. Tightest: `chart-3` 3.08, `seq-4` 3.06. | none needed |

Additional B margin note: white label on `#087F8C` is 4.75:1 and the fill on a white card is 4.75:1. Both pass but with only 0.25 of headroom, the thinnest of the three (A 5.99, C 6.70). B's `primary-hover` and `primary-active` give more headroom.

"Pass" here means the pairs in the script. It does not cover: text over photos, text on `seq-*` data cells other than the five listed, or any colour the engineer adds. Hover and pressed text colours are covered through `primary-hover` and `primary-active` pairs; no automated check replaces a rendered review.

### 5.2 Implementation constraints that come with these tokens

- `focus` against `primary` is 2.4 to 2.9:1 on purpose. It never touches the fill because of the 2 px offset and white `focus-inner` halo; the ring-to-halo pair is the one that must pass (it does, 13.6:1 or more). If anyone sets `outline-offset: 0` on a filled control, 1.4.11 is at risk. Pair this with 2.4.11 (no sticky element may cover the focused control): use `scroll-padding` equal to sticky header and footer height.
- The repo's tests today assert "blue only in focus and info" and "no purple or magenta hue" (docs/design-system/README.md). Directions A and C make blue the brand, so the blue rule must change to "blue is brand and info only, not status success/warning/error". The no-purple rule can stay for UI tokens; data-viz tokens here contain no purple or magenta either.
- Candidate JSON keys beyond the current `ColourTokens` interface are additive (`meta.extraKeys` lists them). The current interface's required keys are all present with the same names, so a direction can be dropped in for rendering without touching existing components; the new keys (`link`, `critical-*`, `ai-bg`, `ai-ink`, `selected-*`, ...) matter only to components that choose to use them.
- `border` (hairline) is intentionally 1.2 to 1.3:1 against canvas and surface, like NHS's border. Never use it as the only boundary of an input, button, card that is clickable, or table that is interactive; `border-control` (3.6 to 4.7:1 on canvas, surface and sunken) is for those.

### 5.3 Colour-vision evidence for the chart palette (series 1 to 8)

Smallest CIE76 delta-E between any two series, after simulating each vision type. About 10 is the floor for "distinguishable at a glance"; these are all above it.

| Direction | Set | Normal | Protan | Deutan | Tritan |
|---|---|---|---|---|---|
| A | first 5 | 25.2 | 21.3 | 22.1 | 20.8 |
| A | all 8 | 18.9 | 14.8 | 14.9 | 14.8 |
| B | first 5 | 29.6 | 19.4 | 18.1 | 16.9 |
| B | all 8 | 25.0 | 15.5 | 17.1 | 12.7 |
| C | first 5 | 24.3 | 23.1 | 21.9 | 22.7 |
| C | all 8 | 18.9 | 14.8 | 14.9 | 14.8 |

Every categorical colour is 3.05:1 or more on white (1.4.11). Use the first five in dashboards; series 6 to 8 only with direct labels or marker shapes, because several of the extra colours differ mainly in lightness. Sequential ramps are single-hue from the brand colour; steps 1 to 3 are fills for heat-map cells and must carry a printed value or an outline (they are 1.1 to 2.1:1 on white). Diverging scales are blue to orange, never red to green.

How the sets were found: a search over a colour pool (contrast 3.05 to 7 on white, no purple or magenta hues) maximising the worst-case delta-E over normal, protan, deutan and tritan vision, with series 1 fixed to the brand colour and series 2 fixed to orange `#D9531E`. A and C share the same orange and a green; B swaps in blues and a darker green to stay away from its teal brand. Series 1 is always the brand colour, so a single-series chart reads as "CarePath".

## 6. Evidence-based ranking

Criteria in the brief that can be **measured without rendering** are scored here. The criteria that need eyes (clinical credibility, patient approachability, visual distinction, brand character) are marked "needs render" and are deliberately left to the advisor's side-by-side screens. The ranking is therefore provisional.

| Measured criterion | A | B | C |
|---|---|---|---|
| Required pairs failing AA | 0 | 2 (brief hex as text; fixed by `link`) | 0 |
| White label on primary | 5.99 | 4.75 (thinnest) | 6.70 |
| Ink on canvas | 13.1 | 12.7 | 16.8 |
| Brand vs status separation (hue distance) | primary 218 deg; success 155, warning 19, error 4: clear. Info 201 deg is 17 deg from primary | primary 186; success 138 (48 deg away), info 204: clear, but accent 175 sits 11 deg from primary by design | primary 224; success 143: clear. Info 202 deg is 22 deg from primary |
| Do accent, AI and info stay distinct? | Partly: accent 193, AI 192, info 201 are one hue family. AI relies on dashed rule + label | Yes for AI (graphite neutral). Accent and primary are near-identical hue by design | **No**: accent 201, AI 201, info 202 are the same hue; differences are only dashed rule, label and icon |
| Chart robustness (min delta-E, all vision types, first 5) | 20.8 | 16.9 | 21.9 |
| Heaviest dependency on a hand-added fix | none | `link` token | none |
| Clinical credibility, approachability, distinction, density feel | needs render | needs render | needs render |

**Ranking from evidence (1 = most defensible without seeing it rendered):**

1. **A, Modern clinical.** No AA failures, healthy margins, a separate teal for accent/AI so "AI-generated" is not the same colour as "information" or "primary". Cost: a blue brand is the most conventional healthcare choice (Zocdoc's own executive calls blue the most conservative), so distinction depends on type, layout and how the teal accent is used. Info and primary are 17 degrees apart, so info must stay non-interactive with an "i" icon.
2. **C, Enterprise clinical intelligence.** Strongest raw contrast (6.70 on the primary label, 16.8 ink) and the most robust charts, and the best fit for dense enterprise tables. Weakness is semantic: info, AI and accent collapse into one blue (201 to 202 degrees), which cuts against the brief's "distinguishable purposes". It would need a deliberately neutral AI treatment (like B's graphite) to rank above A.
3. **B, Contemporary digital care.** Most distinctive of the three against the field and closest to the green-led care brands (Hinge Health's evergreen, and Headway per the unverified spec), but it is the only one where the brief's own primary fails as text, the label contrast has the least headroom (4.75), and its teal/green brand sits closest to the success-green status family, so a "green means good" reading leaks into brand surfaces. Its graphite AI treatment is the cleanest of the three. If the render shows B is clearly the most recognisable, the cost is manageable (use `link`, darken `primary` one step to about `#07727E`: 5.65:1 with a white label, 5.25:1 as text on canvas, 4.86:1 on the sunken surface, which also removes the need for `link`).

Cheap hybrid the advisor may want to render: A's blue primary and ink with B's graphite AI treatment (neutral `ai-*`), which would give A the AI separation that C lacks.

