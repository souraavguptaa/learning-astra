import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Excludes index.ts (a pure re-export barrel) — domain files are matched directly.
  // `npm run db:generate` runs drizzle-kit via tsx's loader so ".js"-extension
  // cross-imports between these files (required for our NodeNext ESM setup) resolve correctly.
  schema: "./src/db/schema/!(index).ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
