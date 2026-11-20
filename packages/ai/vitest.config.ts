import { defineConfig } from "vitest/config";

// Unit tests only: no database, no network. External provider tests use an injected fetch.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
