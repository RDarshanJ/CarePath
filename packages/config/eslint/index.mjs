import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Shared flat config. Keep rules few and meaningful; add more in later work packages. */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.data/**",
      "**/next-env.d.ts",
      "docs/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // ADR-8: the Prisma client may only be imported from repository files.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              message: "Import the Prisma client only from repo.ts files (ADR-8).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/repo.ts", "packages/db/**"],
    rules: { "no-restricted-imports": "off" },
  },
  prettier,
);
