# CarePath design system

Source of truth: `packages/ui/src/tokens/tokens.ts`. The stylesheet `packages/ui/src/styles/tokens.css` is generated from it (`pnpm --filter @carepath/ui tokens:build`) and a test fails if the two drift. Gallery: `/design-system` in `apps/web`. Component reference: [components.md](components.md). Screenshots: [screenshots/](screenshots/).

Demonstration product. Synthetic data only. Not for clinical use.

## Themes

One token set, two themes selected by `data-theme` on the route-group layout (`ThemeScope` in `@carepath/ui`). The admin app uses the clinician theme. Since DR-001 (`docs/design/decision-records/DR-001-visual-identity.md`, values in `docs/design/design-tokens.md` and `docs/design/tokens-final.json`) the two themes share one colour map and differ in density and type size only.

| | `patient` | `clinician` (also admin) |
|---|---|---|
| Page background | `#F5F7FA` cool grey | `#F5F7FA` cool grey |
| Body | 17/26 | 14/20, tables 13/18 |
| Type scale | 15, 17, 20, 24, 32, 40 | 12, 13, 14, 15, 18, 24 |
| Headings | IBM Plex Sans, 600 | IBM Plex Sans, 600 |
| Control height and minimum target | 48 px | 32 px (24 px floor, small controls) |
| Table row | 56 px | 36 px |
| Line length | 60 characters | free |

Palette (both themes):

| Role | Tokens | Values |
|---|---|---|
| Canvas, surfaces | `bg`, `surface`, `surface-sunken`, `surface-elevated` | `#F5F7FA`, `#FFFFFF`, `#EBEFF5`, `#FFFFFF` with the overlay shadow |
| Text | `ink`, `ink-muted`, `ink-subtle`, `disabled-ink` | `#172B4D`, `#42526E`, `#566681`, `#6B7790` |
| Borders | `border`, `border-control` | `#DCE3EB` (decorative), `#697A93` (controls) |
| Primary action | `primary`, `-hover`, `-active`, `-subtle` | `#175CD3`, `#1849A9`, `#194185`, `#EFF4FF` |
| Links and secondary action | `link`, `secondary-border`, `secondary-hover-bg` | `#175CD3`, `#175CD3`, `#EFF4FF` |
| Selected | `selected-bg`, `selected-ink`, `selected-edge` | `#E0EAFF`, `#1849A9`, `#175CD3` |
| Focus | `focus`, `focus-inner` | `#172B4D` ring, `#FFFFFF` halo, 2 px plus 2 px offset |
| Status (ink on tint) | `info-*`, `success-*`, `warning-*`, `error-*`, `neutral-*` | `#065986`/`#F0F9FF`, `#05603A`/`#ECFDF3`, `#93370D`/`#FEF7C3`, `#B42318`/`#FEF3F2`, `#344054`/`#EBEFF5` |
| Critical attention | `critical-solid`, `critical-on`, `critical-subtle-bg`, `critical-subtle-ink` | `#912018`, `#FFFFFF`, `#FEE4E2`, `#7A271A` |
| AI-generated content | `ai-bg`, `ai-ink`, `ai-rule` | `#EFF3F6`, `#2F4A5C`, `#5B7384` (graphite) |
| Accent (never an action) | `accent`, `accent-ink`, `accent-subtle` | `#0E7490`, `#0B5F75`, `#E0F4F8` |
| Charts | `chart-1..8`, `seq-1..7`, `div-1..5` | See `docs/design/design-tokens.md` section 1 |
| Overlay | `scrim`, `shadow-overlay` | `rgb(23 43 77 / 0.5)`; shadow derived from `ink` |

Cobalt is for actions, links and selection. Status colours are never cobalt. No purple or magenta. No warm neutrals. Generated content is graphite, never a brand or status hue. Also: 4 px spacing grid, radius 6 (controls) and 10 (containers), motion 120 ms and 200 ms ease-out.

## Rules enforced by tests (`pnpm --filter @carepath/ui test`)

- Every foreground/background pair in `contrastPairs` meets WCAG 2.x: 4.5:1 for text, 3:1 for control borders, focus ring, selected fills, AI rule and chart marks. Both themes.
- The DR-001 values are asserted literally, the two themes' colour maps are equal, and `tokens.ts` equals `docs/design/tokens-final.json`.
- No purple or magenta hue. Status tokens (`success-*`, `warning-*`, `error-*`, `critical-*`) are not brand blue, and `info-ink` differs from `primary`. Every `ai-*` token has saturation 0.35 or less.
- No warm neutral: `bg`, `surface`, `surface-sunken`, `surface-elevated`, `border`, `neutral-bg`, `disabled-bg` and `ai-bg` have hue 190 to 240 or no saturation.
- Plex Sans headings in both themes; no token or generated CSS mentions a serif; `fonts.ts` loads only the five DR-001 faces.
- Radius never above 10; no `rounded-lg` and up in components.
- No gradients, no raw hex colours outside the token source, no shadow utility except `shadow-overlay`.
- `prefers-reduced-motion` sets both durations to 0 ms; component CSS also disables animation and transitions.

Not covered by tests: the contrast of the disabled state is held to 3:1 as an informational floor only (WCAG exempts disabled controls). Hover, pressed and focus colours are tested as the pairs listed, not by rendering.

## Using it

- Import the stylesheet once: `@import "tailwindcss"; @import "@carepath/ui/styles.css"; @source "../../../packages/ui/src";` (see `apps/web/app/globals.css`). Import `@carepath/ui/fonts` once in the root layout. Fonts are self-hosted through Fontsource: IBM Plex Sans 400, 400 italic, 500 and 600, and IBM Plex Mono 400, Latin subset.
- The Tailwind preset (`styles/preset.css`, Tailwind 4 `@theme`) removes the default palette, radii, shadows and type sizes. Utilities are semantic: `bg-surface`, `text-ink-muted`, `text-link`, `bg-selected-bg`, `bg-ai-bg`, `border-border-control`, `text-body`, `text-h2`, `text-data-value`, `text-notes`, `rounded-container`, `shadow-overlay`, `h-control`, `min-h-target`, `h-row`, `max-w-measure`.
- Overlays render in a portal outside the route group, so every overlay content element is wrapped in `ThemeWrap`, which re-applies `data-theme`. Wrap new Radix-based overlays the same way.
- Gallery-only: `data-demo="hover focus active"` on a control forces that visual state so it can be shown at rest. It is a styling hook, not a behaviour.

## Interaction principles reflected in the components

From `docs/research/mobbin-patterns.md` section 3. These come from sampled captures of other products and design judgement; none has been tested with CarePath users.

- One primary action: `Button` has a single primary variant; danger is separate.
- Ask in context and say why: `Field` has `why`, `hint`, and `requirement` (always words, never an asterisk alone).
- Never colour alone: `StatusChip` has icon plus text, `Tag` is outlined text, `Switch` says On or Off, selected tab and nav items have a bar, errors have an icon and the word "Error" for screen readers, `Progress` always prints its value.
- Pain logging: `PainScale` is a radio group with the chosen value spelled out in words.
- Errors state what happened, whether data is safe and one next step: `Banner` copy pattern, `Field` error text.
- Empty states say why and what fills them; skeletons mirror layout and do not animate: `EmptyState`, `Skeleton`.
- AI output is a labelled draft with provider name: `AIDraftBlock`, `EvidenceRef`.
