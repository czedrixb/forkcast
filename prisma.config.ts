import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Migrate needs a direct (non-pooled) connection — PgBouncer transaction
    // mode doesn't support the advisory locks / DDL sessions Migrate uses.
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
