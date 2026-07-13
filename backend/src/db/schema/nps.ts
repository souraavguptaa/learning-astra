import { sql } from "drizzle-orm";
import { integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./org.js";
import { trainings } from "./training.js";

export const npsResponses = pgTable(
  "nps_responses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("nps_responses_user_training").on(table.userId, table.trainingId)],
);
