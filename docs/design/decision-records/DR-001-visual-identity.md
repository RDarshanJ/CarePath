# DR-001: Primary visual identity

Date: 2026-11-20. Decider: lead advisor. Status: decided.
Brief: `docs/DESIGN-BRIEF.md` sections 2, 3, 4, 10, 19; `docs/COMPONENT-BRIEF.md`.
Supersedes: the colour and type values in `docs/decisions/advisor-plan.md` section 4 (warm paper, forest primary, serif patient headings, "blue reserved for focus and info"). The rest of section 4 (4 px grid, radius 6 and 10, shadows on overlays only, motion, never colour alone, AI label wording, no sparkle) stands.
Outputs: `docs/design/design-tokens.md`, `docs/design/tokens-final.json`.

## 1. Decision

**CarePath uses direction A+G, refined: cobalt `#175CD3` primary, navy `#172B4D` ink, white surfaces on a cool-grey `#F5F7FA` canvas, teal `#0E7490` as a non-action accent, and neutral graphite for AI-generated content. One colour set for patient, clinician and admin. IBM Plex Sans throughout.**

Five token values are refined from the rendered A+G variant (section 5). Patient and clinician differ in density and type scale only.

## 2. Evidence used, and its limits

| Evidence | What it is | Label used below |
|---|---|---|
| `tools/contrast.mjs` on `tokens-candidates/{A,B,C}.json` and on the final set | Computed WCAG 2.x ratios; simulated colour-vision delta-E | [Measured] |
| `color-exploration.md` sections 1, 2, 6 | Fetched W3C, NHS, USWDS, CMS guidance; first-party brand text for six care products; hue-distance analysis | [Research] |
| `typography-exploration.md` | Font metrics read from the Fontsource files | [Measured] |
| `component-research/12`, `05`, `06`, `11` | Status vocabulary, clinical data, AI verification and accessibility decisions | [Research] |
| `design-alternatives/visual-identity/compare-*.png` (all eight sheets viewed) | Same product, same seed, four token sets | [Seen] |
| My reading of the above | Expert judgement, one reviewer, one pass | [Judgement] |

Limits. No user, patient or clinician saw any variant. No competitor product was observed at pixel level (site fetches and Mobbin searches for the six care brands returned nothing usable). Layouts were held identical, so the sheets show palette differences only; the baseline's layout problems (`audit.md` section 2) are visible in all four and are not evidence for or against any palette. Screen 6 is the gallery AI block, not a real review screen. The illustrations still carry baked `#F5F2EA` paper in every variant and were ignored. Tokens not yet wired (`accent`, `selected-*`, `critical-*`, `ink-subtle`, `chart-5..8`, `seq-*`, `div-*`) were judged from values, not pixels.

## 3. Comparison against the brief's criteria

Ratings: strong, adequate, weak. They are ordinal judgements, not scores; the evidence is in each cell.

| Criterion | A | B | C | A+G |
|---|---|---|---|---|
| Clinical credibility | Strong. [Seen] Record and overview read as clinical software: navy ink, calm underlined links. [Research] Blue is the conventional care colour (Zocdoc executive, Fast Company). | Adequate. [Seen] Teal links and nav read softer; with the green "Reviewed" chips the record page drifts toward one green-teal family. [Judgement] Closer to "wellness", which brief section 2 warns against. | Strong. [Seen] Most enterprise-looking; darkest ink (16.79:1 [Measured]). | Strong. Same as A outside the AI block. [Seen] |
| Patient approachability | Adequate. [Seen] Today and the session player are calm; cobalt button is clear but not warm. | Strong. [Seen] Teal is the friendliest of the four on Today and the player. [Research] Matches the green-led care brands (Hinge Health "Evergreen"). | Weak to adequate. [Seen] The more saturated, violet-leaning blue and near-black ink feel like a business tool on the 390 screens. [Judgement] | Adequate. Same as A. |
| Visual distinction | Weak to adequate. [Research] Blue-led is the least distinctive choice. [Seen] A and C are hard to tell apart at a glance. | Strong. [Seen] The only variant that does not read as "healthcare blue". | Weak. [Seen] Indistinguishable from a default Tailwind blue/slate product; brief section 2 forbids generic dashboard looks. [Judgement] | Adequate. [Seen] The graphite AI block next to cobalt controls gives the product one treatment that is its own. Distinction otherwise has to come from type, layout and the teal accent. [Judgement] |
| Readability | Strong. [Measured] Ink 13.13 on canvas, muted 7.34, subtle 5.41, link 5.57 on canvas. | Adequate. [Measured] Ink 12.67; the brief's primary fails as text on canvas (4.40) and sunken (4.08), needing a separate `link` token. | Strong. [Measured] Ink 16.79, link 6.30. | Strong. As A. |
| Information hierarchy | Adequate. [Seen] One filled blue action per screen stands out; many blue links on the record compete with it. Info banner (201 degrees) sits near primary (218). | Weak to adequate. [Seen] Primary teal, accent green and the success chips sit in one hue neighbourhood, so "action", "brand" and "done" are harder to rank. [Research] Accent is 11 degrees from primary. | Weak. [Research] Info, AI and accent are the same hue (201 to 202). [Seen] On screen 6 the AI block, Approve button and info tint are all blue. | Strong for the AI case. [Seen] Screen 6: neutral draft block, cobalt Approve, solid cobalt rule only once approved, so colour tracks the human decision. Same link-density caveat as A. |
| Accessibility | Strong. [Measured] 0 failing pairs; white on primary 5.98. | Adequate. [Measured] 2 failing text pairs before the `link` fix; white on primary 4.74, the thinnest headroom. | Strong. [Measured] 0 failing; white on primary 6.70. | Strong. [Measured] 0 failing; AI label 8.34 on its tint (A's teal: 6.59). |
| Dense enterprise workflows | Strong. [Seen] Overview and record at 1440: status chips (amber, green, info) stay clearly apart from blue links. | Adequate. [Seen] Green "Reviewed" chip is the closest status to the brand colour; in a 20-row timeline that weakens scanning. | Strong. [Seen] Highest ink contrast helps 13 px tables; saturated links are a little loud in long lists. | Strong. As A. |
| Component scalability | Adequate. [Research] Accent, AI and info are one hue family (193, 192, 201); new components would blur them. | Adequate. Needs the `link` exception everywhere text uses brand colour; chart palette had to route around the teal brand (tritan min delta-E 12.7 [Measured]). | Weak. Three roles on one hue leaves no room to add a fourth meaning without redefining blue. | Strong. [Judgement] Each role has its own lane: cobalt acts, teal decorates, graphite marks generated text, status hues stay status. [Research] `06-ai-verification.md` already specifies the draft as `ai-rule` on a neutral sunken surface, which is this treatment. |
| Brand consistency | Strong. One blue, one ink across all three apps. [Seen] | Strong within itself. [Seen] | Strong within itself. [Seen] | Strong. [Seen] Identical to A across patient, clinician and schedule; only the AI block differs. |

Mandatory gates (brief section 8): accessibility is met by A, C and A+G as specified and by B only with its `link` fix. No variant fails the no-cream requirement in its tokens.

## 4. Why A+G, and why not the others

- **Not C.** It is A with a louder blue and blacker ink, and it collapses info, accent and AI into one hue. It wins only on raw contrast, which A already passes with margin.
- **Not B.** It is the most distinctive and the most approachable, and I weighed that seriously. It loses on three points that matter more in a clinical product: the brand hue sits next to success green on the densest screens [Seen], its primary has the least contrast headroom and fails as text without a workaround [Measured], and a teal-green identity is the nearest of the four to the "generic wellness branding" the brief rules out [Judgement]. B's best idea, the graphite AI treatment, is taken.
- **Not plain A.** Teal AI blocks beside blue controls and blue-tinted info banners are three cool tints for three meanings. Graphite removes one of them at no cost.
- **A+G.** No failing pairs, the clearest separation between brand, status and generated content, and the only variant where the AI block's colour changes when a clinician approves it. Its known weakness is distinction: a blue healthcare product is ordinary. That is accepted, and it is to be addressed through layout, type and the feature work, not by adding colour.

Untested assumptions: that patients find cobalt on white approachable enough; that clinicians read the graphite block as "not yet mine" rather than "disabled"; that Plex Sans is not too technical for patients.

## 5. Refinements to the rendered A+G set

All computed with `tools/contrast.mjs` (full output in `design-tokens.md` section 6).

| Token | Rendered | Final | Reason | Computed |
|---|---|---|---|---|
| `selected-bg` | `#EFF4FF` | `#E0EAFF` | In A, selected, hover and primary tint were one value, so a hovered row and a selected row looked the same. | `selected-ink` 6.77, `ink` 11.67, `selected-edge` 4.95, `link` 4.95, `ink-subtle` 4.81 on the new fill |
| `warning-bg` | `#FFFAEB` | `#FEF7C3` | Hue 45 at that lightness reads as cream; the audit flagged the old `#FBF0D9` for the same reason. Hue 53 reads as yellow. | `warning-ink` 6.91, `ink` 12.96 |
| `chart-3` | `#30A66F` | `#2A9D66` | 3.08:1 on white left no headroom for a 3:1 chart mark. | 3.43; first-five min delta-E 18.9 or more in all vision types (was 20.8) |
| `seq-4` | `#6693E3` | `#5F8EE1` | 3.06:1, same reason. | 3.25 |
| Patient `label`, `table` | 16 / 24 | 17 / 24, 17 / 26 | 16 is not on the patient scale; the token test requires every role on its scale. | n/a |

Kept as rendered: primary and its ladder, all inks, canvas and surfaces, borders, focus, info, success, error, critical, the graphite `ai-*` values from B, the rest of the chart set.

Considered and not done: darkening or shifting `info` away from primary (form already separates it, and blue is the expected information colour); a white patient canvas (one canvas keeps one brand; the patient layout work will reduce cards instead); replacing `warning-ink` `#93370D` (every 4.5:1 amber is brownish; it appears only as chip text beside an icon).

## 6. Typeface

**IBM Plex Sans 400, 500, 600 and 400 italic for all text and headings in both themes. IBM Plex Mono 400 for identifiers only. Source Serif 4 is removed.**

- [Measured] The only candidate with tabular digits by default and distinct I, l and 1 in the Fontsource Latin subset; 6 to 11 percent more characters per line than Inter at the same size; already shipped at 400/500/600.
- [Seen] With Plex headings the patient screens read plainer and more technical than the serif baseline. That is acceptable against a brief asking for "precise" and "clinically credible", and the serif belonged to the warm-paper look.
- Runner-up Inter: larger x-height, but I/l ambiguity and no alternates in the subset. Geist rejected (no real italic). Public Sans and Source Sans 3 offer nothing Plex lacks here.
- Open check before use for IDs: confirm 0 and O are distinct in Plex Mono in a render.
- Scale and density per theme: `design-tokens.md` section 5.

## 7. Final semantic tokens

Full table, uses and states: `design-tokens.md`. Summary:

| Role | Token | Value |
|---|---|---|
| Canvas | `bg` | `#F5F7FA` |
| Primary / secondary / elevated surface | `surface` / `surface-sunken` / `surface-elevated` | `#FFFFFF` / `#EBEFF5` / `#FFFFFF` + overlay shadow |
| Primary / secondary / muted / disabled text | `ink` / `ink-muted` / `ink-subtle` / `disabled-ink` | `#172B4D` / `#42526E` / `#566681` / `#6B7790` |
| Default / strong border | `border` / `border-control` | `#DCE3EB` / `#697A93` |
| Primary action, hover, pressed | `primary` / `-hover` / `-active` | `#175CD3` / `#1849A9` / `#194185` |
| Secondary action | `secondary-border` + `link`, hover `secondary-hover-bg` | `#175CD3`, `#EFF4FF` |
| Selected | `selected-bg` / `-ink` / `-edge` | `#E0EAFF` / `#1849A9` / `#175CD3` |
| Focus | `focus` + `focus-inner` | `#172B4D` ring, `#FFFFFF` halo, 2 px + 2 px offset |
| Information | `info-ink` on `info-bg` | `#065986` on `#F0F9FF` |
| Success | `success-ink` on `success-bg` | `#05603A` on `#ECFDF3` |
| Warning | `warning-ink` on `warning-bg` | `#93370D` on `#FEF7C3` |
| Error | `error-ink` on `error-bg`, `error-hover` | `#B42318` on `#FEF3F2`, `#912018` |
| Critical attention | `critical-solid` + `critical-on`; `critical-subtle-ink` on `-bg` | `#912018` + `#FFFFFF`; `#7A271A` on `#FEE4E2` |
| AI-generated content | `ai-ink` on `ai-bg`, `ai-rule` | `#2F4A5C` on `#EFF3F6`, `#5B7384` dashed |
| Accent (non-action) | `accent` / `accent-ink` / `accent-subtle` | `#0E7490` / `#0B5F75` / `#E0F4F8` |
| Data viz categorical | `chart-1..8` | `#175CD3 #D9531E #2A9D66 #424B57 #1E6736 #69788C #398EEF #4F962C` |
| Data viz sequential | `seq-1..7` | `#EFF4FF #C2D4F6 #95B4ED #5F8EE1 #3F78DB #175CD3 #194185` |
| Data viz diverging | `div-1..5` | `#194185 #84ADFF #EBEFF5 #F9B27C #9A3412` |

Result of `contrast.mjs --strict` on the final set: 84 pairs per theme, 0 below threshold, exit 0.

Patient versus clinician: same colours. Patient scale 15, 17, 20, 24, 32, 40 with 17/26 body, 48 px controls and targets, 56 px rows, 60ch measure. Clinician and admin scale 12, 13, 14, 15, 18, 24 with 14/20 body, 13/18 tables, 32 px controls (24 floor), 36 px rows.

## 8. Existing rules and tests that must change

In `packages/ui/src/tokens/contrast.test.ts`:

| Test | Change |
|---|---|
| "matches the advisor plan section 4 values" | Rewrite to assert the DR-001 values: both themes `bg #F5F7FA`, `ink #172B4D`, `ink-muted #42526E`, `primary #175CD3`, `border-control #697A93`, `focus #172B4D`, and the four status pairs from section 7. Add: the two themes' colour maps are equal. |
| "limits blue to focus and info" | Delete. Replace with "status tokens are not brand blue": no `success-*`, `warning-*`, `error-*` or `critical-*` token has hue 195 to 255 with saturation above 0.3; `info-ink` differs from `primary`; and every `ai-*` token has saturation of 0.35 or less (final values: 0.32, 0.28, 0.18), so generated content stays neutral. |
| "contains no purple or magenta" | Keep. Extend to the new keys (it iterates all keys already). The final set passes: highest brand hue is 221. |
| New: "contains no warm neutral" | `bg`, `surface`, `surface-sunken`, `surface-elevated`, `border`, `neutral-bg`, `disabled-bg`, `ai-bg` must have hue 190 to 240 or zero saturation. This is the acceptance test for brief section 19. |
| "uses the plan's type scales and body sizes" | Scales become `[15,17,20,24,32,40]` and `[12,13,14,15,18,24]`; body and clinician table assertions unchanged. |
| "uses serif headings for patients only" | Replace with: both themes' `font-heading` contain "IBM Plex Sans" and no token contains "Serif". |
| `contrastPairs` in `tokens.ts` | Replace `primary` as text with `link`; replace `primary` on `primary-subtle` with `selected-ink` on `selected-bg`; add the pairs in `tools/contrast.mjs` and `design-tokens.md` section 6.2 for `ink-subtle`, `selected-*`, `critical-*`, `ai-ink`/`ai-bg`, `focus`/`focus-inner`, `accent-*`, `chart-5..8`, `seq-4..7`. `ai-rule` on `surface-sunken` stays (4.30). |
| `ColourTokens` interface | Add the keys in `tokens-final.json` `meta.extraKeys`. |

Elsewhere:

- `docs/design-system/README.md`: replace the palette table and the lines "forest primary", "focus ring `#0B5FA5` (reserved with info for blue)", "blue only in `focus` and the info status" and the Source Serif font list. New wording: "Cobalt is for actions, links and selection. Status colours are never cobalt. No purple or magenta. No warm neutrals."
- `CLAUDE.md` design principles line cites "advisor plan section 4"; it should cite this record and `design-tokens.md` for colour and type. That edit is the orchestrator's.
- `packages/ui/src/fonts.ts`: drop the Source Serif 4 import, drop Plex Mono 500, add Plex Sans 400 italic.
- `elevation.overlay` and the scrim: rebase from `rgb(23 32 29)` to `rgb(23 43 77)`.
- `AIDraftBlock`: background from `surface-sunken` to `ai-bg` (as on the exploration branch); approved state keeps the solid `primary` rule.
- `apps/web/components/illustration.tsx`: container from `bg-bg` with border to `surface-sunken` without border (section 9).
- Gallery copy in `/design-system` that says "Source Serif 4 headings".
- Any e2e or screenshot test that pins a computed colour from the old set (not searched exhaustively; `apps/web/scripts/design-system-screenshots.mjs` and the design-system page reference old values).

## 9. Illustration recolour rule

- **Make them transparent.** True alpha, no baked paper, no matte, no shadow. A recoloured opaque paper would break again on the next surface change; the audit shows the current opaque tiles already clash on white cards.
- **Target background token: `surface-sunken` (`#EBEFF5`)**, as a radius-10 tile without border. The art must also hold on `surface` and `bg`.
- Lines `ink`; clothing from `accent`, `accent-subtle`, `seq-2` and white with an `ink` outline; floor and mat lines `border-control`; natural, varied skin tones; no forest green, tan or cream.
- Acceptance and pixel check: `design-tokens.md` section 7. The "Illustration only" caption and the not-clinically-reviewed wording stay.

## 10. Consequences and follow-ups

- The accent teal has no wired use yet. It is reserved for the brand mark, illustrations and avatar chips; if no real use appears by the end of the patient slice, remove it instead of finding one.
- Link density on the clinician record is a layout problem that this palette makes visible. Row-level links should be reduced to the first cell (matches `11-accessibility-critical.md` on row targets).
- A real AI review screen must be re-captured with the final tokens before the AI treatment is called done; screen 6 was a gallery specimen.
- Forced-colours mode and a rendered pass at 13 px on Windows were not checked.
