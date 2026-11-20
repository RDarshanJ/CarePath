# Visual identity explorations (CarePath)

Status: exploration only. No direction is chosen here; the advisor decides. Brief: `docs/DESIGN-BRIEF.md` section 3.

## What was rendered

Four variants of the same product, same seed (small profile, anchor 2026-11-19 16:00 UTC, API clock fixed), same demo accounts, same layouts and content. Only tokens differ.

| Variant | Palette (from `tokens-candidates/`) | AI-content colours |
|---|---|---|
| A | Cobalt primary `#175CD3`, teal accent, navy ink, cool grey canvas | teal (`ai-ink #0B5F75`, `ai-bg #EAF7FA`) |
| B | Teal primary `#087F8C`, green accent, deep-teal ink | graphite (`ai-ink #2F4A5C`, `ai-bg #EFF3F6`) |
| C | Royal blue `#1D4ED8`, sky secondary, slate ink | sky blue (`ai-ink #075985`, `ai-bg #EEF6FB`) |
| A+G | A's palette | B's graphite `ai-*` |

All variants use IBM Plex Sans for body and headings (Source Serif 4 removed) and the candidate density and type scale (identical in A, B and C).

Files: `<variant>/<screen>-<width>.png` (screens: `1-patient-today`, `2-guided-exercise`, `3-clinician-overview`, `4-patient-record`, `5-booking-times`, `5-clinician-schedule`, `6-ai-draft-gallery`) and `compare-<screen>-<width>.png` (A, B, C, A+G left to right, then top to bottom at 1440).

## How it was built (branch `wp/explore`, not for merge)

- `packages/ui/scripts/build-tokens.mjs` reads `CAREPATH_THEME=A|B|C|AG` and regenerates `tokens.css` from the candidate JSON. `AG` copies B's `ai-ink`, `ai-bg`, `ai-rule` onto A.
- `--color-ai-bg` and `--color-ai-ink` added to the Tailwind preset; `AIDraftBlock` background changed from `surface-sunken` to `ai-bg` so the AI tint can differ per direction. This is the only component change; it is what makes A, B, C and A+G differ in the AI block beyond the dashed rule.
- `scripts/explore-visual.sh` (under the web lock, gate env `explore`, API 4051, web 3051) builds, seeds, serves and captures each variant. `apps/web/scripts/explore-capture.mjs` does the Playwright capture with system Chrome. Servers killed, lease released, committed `tokens.css` restored.
- Tokens not yet wired to components (and so not visible): `accent`, `link`, `selected-*`, `secondary-*`, `critical-*`, `ink-subtle`, `chart-5..8`, `seq-*`, `div-*`. Primary is used for links and text, so B's primary as text on canvas is shown as specified (the colour research flags its contrast headroom; it was not adjusted).

## Caveats

- Illustrations are raster WebP with the warm paper background (`#F5F2EA`) baked in. No trivial non-destructive CSS fix exists, so they were left. They show as a beige tile on the cool canvases in screen 2 in every variant; they will be recoloured later.
- Screen 6: no AI-assisted clinical review screen exists yet. The capture is the `/design-system` gallery's "AI draft" section (patient and clinician theme specimens). Its explanatory text still says "Source Serif 4 headings" and shows the hard-coded intro copy; that is stale gallery copy, not a rendering fault.
- Screen 1 at 1440 shows "Session in progress / Continue session" while the 390 capture shows "Start today's session". The 390 captures run first and start the session in the same database, so the 1440 Today state is later in the scenario. This is the same in all four variants. The clinician record timeline likewise shows an in-progress session at Nov 19, 9:00 AM.
- Mid-session screen is exercise 1, set 2 of 2, after one set and the rest skipped.
- Single-pass visual observations only. No contrast was re-measured here (see `color-exploration.md` for computed ratios); no user testing.

## Observations per screen

### 1 Patient Today (390 and 1440)
- Layout is identical. The differences are the primary button and progress bar colour (A, A+G, C blue; B teal), the top rule on the lead card, the focus of the "plan changed" banner (info-bg tint: A and A+G pale blue-white, B pale blue-grey, C sky-white), the canvas tint (A and A+G `#F5F7FA` cool grey; B slightly green-grey; C the coolest blue-grey) and link colour.
- A and C are close to each other at a glance; C's primary is slightly more saturated and violet-leaning blue. B is the only one that reads as non-blue and it is the most distinct from the clinical blue norm.
- The unread-messages badge uses primary, so it follows the primary colour (blue or teal) and is the same colour as the main action in each variant.
- With IBM Plex Sans headings (no serif) the page reads plainer and more technical than the warm-paper original; the same in all variants.

### 2 Guided exercise (390)
- The full-width "Done with set 2, finish exercise" button is the dominant colour block: blue in A, A+G and C, teal in B. "Stop, this hurts" keeps its red outline in all four and stays clearly separate from the primary.
- The beige illustration tile is visible against the cool canvas in every variant; the clash is slightly stronger in B and C than in A (more saturated canvas tint), but all four show it.
- Session progress bar and current-exercise list are neutral in all variants; little else differs.

### 3 Clinician overview (1440)
- Dense layout identical. Differences: selected nav item (blue-tint with blue edge in A, A+G, C; teal-tint in B), link colour (underlined links dominate the page, so the page tone follows the primary), avatar chip colour.
- B's teal links and nav read softer next to status chips; the amber "Not yet reviewed", green "Reviewed" and info "In review" chips keep their own colours in all variants. In B the green "Reviewed" chip is the closest to the brand colour.
- C's links are the most saturated blue; A's slightly darker and calmer.

### 4 Patient record overview (1440)
- Tabs, intake table, timeline and status chips are identical in structure. "Open care plan builder" is the single filled button: blue (A, A+G, C) or teal (B).
- Timeline has many underlined links; the link colour determines the overall impression of the page (blue vs teal). Chips (Active, Completed, Reviewed, Not yet reviewed) stay distinguishable by text and icon, not colour alone, in all four.
- B's green "Reviewed" and teal links sit in the same hue neighbourhood; A and C keep brand blue and status green clearly apart.

### 5 Scheduling
- Booking times (390): selected radio, selected day/time-of-day chips and the active tab-bar item use primary. A, A+G, C show blue chips with pale-blue fill; B shows teal chips with pale-teal fill. Selected state is legible in all (border and fill, label unchanged), and the time buttons are neutral outlines in all variants.
- Clinician schedule (1440): sparse content (two visits), so the screen shows almost only the table header tint, link colour and the nav selection. Differences between variants are minimal here beyond blue vs teal.

### 6 AI draft block (gallery, 1440; not a real AI screen)
- A: teal-tinted block, teal dashed rule. The approved block has a blue (primary) solid rule on teal tint; the rejected block is teal tint with strikethrough. Teal sits next to the blue primary buttons, so the AI block and the primary action are distinct hues but of the same cool family.
- B: graphite blue-grey tint and dashed grey rule. The approved block gets a solid teal rule. The AI block is clearly neutral and separate from the teal primary and from info banners.
- C: sky-blue tint and blue dashed rule. The AI block, the info banner (screen 1) and the primary are all blue; the difference rests on the dashed rule, label and tint (consistent with the colour research note that C's AI, info and accent hues collapse).
- A+G: A's blue primary and Approve button with B's graphite AI tint and grey dashed rule. The AI block is separated from blue controls and from the info banner by being neutral. The approved state's solid blue rule on a grey tint reads as the only coloured cue.
- The dashed rule, the "Draft, generated, not reviewed" label and the provider name carry the AI meaning in every variant; the tint is supplementary.
