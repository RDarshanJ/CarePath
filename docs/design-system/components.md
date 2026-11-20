# Component reference

All components are exported from `@carepath/ui`, live in `packages/ui/src/components/`, and appear in every state in `/design-system` in both themes. Radix primitives supply focus management, keyboard behaviour and ARIA; all styling is CarePath's own. Sizes below come from tokens, so they differ by theme.

## Button, IconButton

- Anatomy: optional left icon, label, optional right icon. Loading replaces content with a spinner and the loading label and keeps the width.
- Variants: `primary` (cobalt fill), `secondary` (surface with control border), `quiet` (text only, subtle fill on hover), `danger` (solid error colour; use for the confirming action of a destructive dialog). Sizes `md` (theme control height) and `sm` (24 px clinician, 48 px patient).
- States: default, hover, focus-visible (2 px ring, 2 px offset), pressed, disabled, loading (`aria-busy`, presses ignored).
- A11y: native `button`, default `type="button"`. `IconButton` requires `label`, which becomes `aria-label`. Targets are at least the theme minimum.
- Usage: one primary per screen. Prefer a word over an icon. Do not use danger for navigation.

## Field, TextInput, Textarea, Select, FieldGroup

- Anatomy: label, requirement in words ("required" or "optional"), optional why-we-ask line, optional hint, control, optional error with icon.
- States: default, hover, focus, filled, read-only (sunken fill), disabled, invalid (2 px error border plus message).
- A11y: `Field` wires `id`, `aria-describedby`, `aria-invalid`, `aria-required`. Error text has a visually hidden "Error:" prefix. `FieldGroup` is a `fieldset` with `legend`; its error is `role="alert"`. `Select` is Radix Select (keyboard type-ahead, arrow keys, portalled list with `ThemeWrap`).
- Usage: say why a clinical field is collected and who sees it. Errors say what is wrong and what to do.

## Checkbox, Radio, RadioGroup, Switch

- Anatomy: 24 px box or circle, label, optional hint. The whole row is the hit area and at least the theme target height. Switch adds On or Off text beside the track.
- States: unchecked, checked, indeterminate (checkbox), disabled, disabled checked, focus, invalid (checkbox).
- A11y: Radix roles `checkbox`, `radio`, `switch`; labels are real `label` elements.
- Usage: optional sharing defaults to off. Use Switch for settings that apply immediately, Checkbox for form choices.

## PainScale

- Anatomy: question, 0 to 10 buttons (two rows of 6 and 5 on narrow containers, one row of 11 from 576 px container width), end labels "0 No pain" and "10 Worst pain", a live line stating the choice in words.
- States: unanswered, answered, disabled.
- A11y: Radix radio group, so arrow keys move and select; each radio is named "N of 10"; the live line is `aria-live="polite"`.
- Usage: self-report only. Titles of related charts read "Patient-reported pain". Words (mild, moderate, severe) describe the scale position and are not a diagnosis.

## Tabs

- Anatomy: tab list with a bottom rule, triggers, panels. Selected: 2 px primary bar, semibold, ink text.
- States: default, hover, selected, focus, disabled. A11y: Radix Tabs (roving tabindex, arrow keys, `aria-selected`).

## BottomTabBar, SideNav, CountBadge

- BottomTabBar (patient): `nav` with four text-labelled destinations, 64 px tall. SideNav (clinician and admin): vertical list with optional counts and a footer slot.
- Current page: `aria-current="page"`, bar, and weight. `linkAs` accepts `next/link`.
- CountBadge: tabular number; pass `unit` so the accessible name reads "12 to review".

## StatusChip, Tag, Banner

- StatusChip: clinical status. Filled tint, icon, words. Tones success, warning, error, info, neutral.
- Tag: administrative status. Outlined, text only, no fill, no icon. The two forms are deliberately different shapes so they are not confused.
- Banner: inline message with icon, bold title, plain sentence and optional actions. Error banners use `role="alert"`, others `role="status"`.
- Usage: never use a chip for an administrative state or a tag for a clinical one. Error banners say what happened, whether data is safe, and offer one next step.

## Table (Table, THead, TBody, Tr, Th, Td)

- Anatomy: scroll region with required caption (visually hidden), sunken header row, 36 px rows in the clinician theme, tabular numerals, no wrapping in cells.
- Variants: `Th numeric`, `Td numeric`, `Td mono` (IDs and timestamps), `Tr selected` (tint plus 2 px bar and `aria-selected`).
- A11y: `th scope="col"`, sortable headers are buttons and set `aria-sort`; the scroll region is focusable and named.
- Usage: every chart has a table alternative built from this.

## Panel, EmptyState, Skeleton, Avatar, Progress, Link, DemoNotice

- Panel: border, radius 10, no shadow.
- EmptyState: icon, heading, explanation of why it is empty and what fills it, one action. Dashed border.
- Skeleton and SkeletonGroup: static blocks that mirror the final layout; the group is `role="status"` with `aria-busy` and a visually hidden label.
- Avatar: square-cornered initials, `aria-hidden`; always beside a text name and role.
- Progress: Radix Progress with label and value text always shown ("3 of 6 exercises").
- DemoNotice: the line every app shell must show. It is rendered in the root layout.

## AIDraftBlock, EvidenceRef

- Anatomy: left rule, label, provider name in mono, content, actions. Draft: `ai-bg` graphite tint, dashed 3 px `ai-rule`, "Draft, generated, not reviewed". Approved: solid primary rule, "Generated, reviewed and approved by {reviewer}", provider kept. Rejected: "Draft rejected, not used", struck-through content.
- A11y: a `section` labelled with the state. EvidenceRef is a 24 px button named "Open evidence N"; the panel it opens is a `DrawerContent`.
- Usage: provider text is the stored provider name, for example "Demo provider, rule-based". No sparkle or glow. A rule-based provider is never described as a live model.

## Dialog, DrawerContent, Popover, Tooltip, DropdownMenu, Toast

- The only elements with a shadow. All render through a portal wrapped in `ThemeWrap`, scrim `rgb(23 43 77 / 0.5)`. Motion is 120 to 200 ms and removed under reduced motion.
- Dialog: title, optional description, body, right-aligned footer with the primary action last. Radix Dialog traps focus, restores it on close, and closes on Escape.
- Drawer: `side="right"` for the clinician evidence panel and filters, `side="bottom"` for patient sheets such as "Stop this session?".
- Popover: short optional explanation ("Why we ask"). Tooltip: supplementary only, never the sole carrier of information, and must not be the only label of an icon button (use `IconButton label`). DropdownMenu: items at the theme target height, checkbox items, danger item, disabled item with a reason in its label.
- Toast: `ToastProvider` plus `useToast()`; Radix Toast announces politely, 7 s duration, dismiss button. Errors state whether input was kept.
