// Prisma CLI config (Prisma 7). Used by `prisma generate`. Migrations run through
// scripts/schema-engine.ts (see the comment there for why).
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://carepath:carepath@127.0.0.1:54329/carepath",
  },
});
