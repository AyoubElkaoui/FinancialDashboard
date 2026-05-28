import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local (Next.js convention) then fall back to .env
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct (unpooled) connection for migrations — pgBouncer doesn't support DDL
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
