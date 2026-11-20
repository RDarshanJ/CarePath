import { defineConfig } from "vitest/config";

// API tests use app.inject() against the real Postgres on port 54329 (scripts/db.sh).
// `pnpm test` applies migrations first. Each test file creates its own organizations, so
// files run in parallel against one database.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    env: { NODE_ENV: "test" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
