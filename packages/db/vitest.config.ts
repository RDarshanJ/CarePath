import { defineConfig } from "vitest/config";

// DB-level tests. `pnpm test` applies migrations first; each test creates its own
// organizations, so files can run in parallel against one database.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
