import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

const sql = neon(env.databaseUrl);

export const db = drizzle(sql, { schema });
