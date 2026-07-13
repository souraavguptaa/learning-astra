import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { assertDatabaseConfigured, env } from "../config/env.js";

async function main() {
  assertDatabaseConfigured();
  const sql = neon(env.databaseUrl);
  const db = drizzle(sql);
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
