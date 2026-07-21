import { relations, sql } from "drizzle-orm";
import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./org.js";

export const workSessions = pgTable(
  "work_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }).defaultNow().notNull(),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("work_sessions_user_id_idx").on(table.userId)],
);

export const workBreaks = pgTable(
  "work_breaks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workSessionId: uuid("work_session_id")
      .notNull()
      .references(() => workSessions.id, { onDelete: "cascade" }),
    breakStartAt: timestamp("break_start_at", { withTimezone: true }).defaultNow().notNull(),
    breakEndAt: timestamp("break_end_at", { withTimezone: true }),
  },
  (table) => [index("work_breaks_session_id_idx").on(table.workSessionId)],
);

export const workSessionsRelations = relations(workSessions, ({ many, one }) => ({
  breaks: many(workBreaks),
  user: one(users, { fields: [workSessions.userId], references: [users.id] }),
}));

export const workBreaksRelations = relations(workBreaks, ({ one }) => ({
  session: one(workSessions, { fields: [workBreaks.workSessionId], references: [workSessions.id] }),
}));
