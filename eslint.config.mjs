import base from "@carepath/config/eslint";

/**
 * apps/web styling guard (advisor plan risk 8, checkpoint C1 section 1, WP 2.5 defect, assigned to WP 3.2a).
 * Colour comes only from tokens (`bg-surface`, `text-ink`) and sizes from the scale, so a screen cannot
 * drift from the design system. The rule inspects every string and template fragment in apps/web:
 *   1. raw colour values: hex (#fff, #1e4d40), rgb(), hsl(), oklch() and similar functions;
 *   2. Tailwind arbitrary values and variants: `w-[13px]`, `bg-[var(--x)]`, `[mask-type:alpha]`,
 *      `data-[state=open]:flex`, `min-[1100px]:grid`.
 * The design-system gallery (`app/(public)/design-system`) predates the rule and is exempt; it is
 * a specimen page that deliberately shows tokens and uses a few one-off layout values.
 */
const rawColour =
  "#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{1}|[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?(?![0-9a-zA-Z_-])|\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\(";
const arbitraryTailwind =
  "(?:^|[\\s\"'`:!])-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\\[[^\\]]+\\]|(?:^|[\\s\"'`:!])\\[[a-zA-Z-]+:[^\\]]+\\]";

export const webStyleRules = [
  {
    selector: `Literal[value=/${rawColour}/]`,
    message:
      "Raw colour values are banned in apps/web. Use a token utility (bg-surface, text-ink, border-border) from @carepath/ui.",
  },
  {
    selector: `TemplateElement[value.raw=/${rawColour}/]`,
    message:
      "Raw colour values are banned in apps/web. Use a token utility (bg-surface, text-ink, border-border) from @carepath/ui.",
  },
  {
    selector: `Literal[value=/${arbitraryTailwind}/]`,
    message:
      "Arbitrary Tailwind values and variants are banned in apps/web. Use a token or scale utility (see docs/design-system/README.md), or request a primitive in packages/ui.",
  },
  {
    selector: `TemplateElement[value.raw=/${arbitraryTailwind}/]`,
    message:
      "Arbitrary Tailwind values and variants are banned in apps/web. Use a token or scale utility (see docs/design-system/README.md), or request a primitive in packages/ui.",
  },
];

export default [
  ...base,
  {
    files: ["apps/web/**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: ["apps/web/app/(public)/design-system/**", "apps/web/test/**"],
    rules: { "no-restricted-syntax": ["error", ...webStyleRules] },
  },
];
