# CarePath design system

Source of truth: `packages/ui/src/tokens/tokens.ts`. The stylesheet `packages/ui/src/styles/tokens.css` is generated from it (`pnpm --filter @carepath/ui tokens:build`) and a test fails if the two drift. Gallery: `/design-system` in `apps/web`. Component reference: [components.md](components.md). Screenshots: [screenshots/](screenshots/).

Demonstration product. Synthetic data only. Not for clinical use.

## Themes

One token set, two themes selected by `data-theme` on the route-group layout (`ThemeScope` in `@carepath/ui`). The admin app uses the clinician theme.

| | `patient` | `clinician` (also admin) |
|---|---|---|
| Page background | `#F5F2EA` warm paper | `#F6F7F6` cool neutral |
| Body | 17/26 | 14/20, tables 13/18 |
| Type scale | 15, 17, 20, 24, 30, 38 | 12, 13, 14, 16, 20, 24 |
| Headings | Source Serif 4, 600 | IBM Plex Sans, 600 |
| Control height and minimum target | 48 px | 32 px (24 px floor, small controls) |
| Table row | n/a | 36 px |
| Line length | 60 characters | free |

Shared across themes: forest `#1E4D40` primary (primary action and selection only), control border `#76817C`, focus ring `#0B5FA5` (2 px plus 2 px offset, reserved with info for blue), status text on tint pairs from advisor plan section 4, 4 px spacing grid, radius 6 (controls) and 10 (containers), motion 120 ms and 200 ms ease-out.

## Rules enforced by tests (`pnpm --filter @carepath/ui test`)

- Every foreground/background pair in `contrastPairs` meets WCAG 2.x: 4.5:1 for text, 3:1 for control borders, focus ring, selected fills, AI rule and chart marks. Both themes.
- The plan's section 4 values are asserted literally.
- No purple or magenta hue; blue only in `focus` and the info status.
- Radius never above 10; no `rounded-lg` and up in components.
- No gradients, no raw hex colours outside the token source, no shadow utility except `shadow-overlay`.
- `prefers-reduced-motion` sets both durations to 0 ms; component CSS also disables animation and transitions.

Not covered by tests: the contrast of the disabled state is held to 3:1 as an informational floor only (WCAG exempts disabled controls). Hover, pressed and focus colours are tested as the pairs listed, not by rendering.

## Using it

- Import the stylesheet once: `@import "tailwindcss"; @import "@carepath/ui/styles.css"; @source "../../../packages/ui/src";` (see `apps/web/app/globals.css`). Import `@carepath/ui/fonts` once in the root layout. Fonts are self-hosted through Fontsource: IBM Plex Sans 400/500/600, IBM Plex Mono 400/500, Source Serif 4 600, Latin subset.
- The Tailwind preset (`styles/preset.css`, Tailwind 4 `@theme`) removes the default palette, radii, shadows and type sizes. Utilities are semantic: `bg-surface`, `text-ink-muted`, `border-border-control`, `text-body`, `text-h2`, `rounded-container`, `shadow-overlay`, `h-control`, `min-h-target`, `h-row`, `max-w-measure`.
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
