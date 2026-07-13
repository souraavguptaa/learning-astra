import { relations, sql } from "drizzle-orm";
import { boolean, integer, numeric, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { contentItems } from "./content.js";
import { users } from "./org.js";
import { trainings } from "./training.js";

export const contentProgress = pgTable(
  "content_progress",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    highestPointSeconds: numeric("highest_point_seconds").default("0").notNull(),
    validWatchedSeconds: numeric("valid_watched_seconds").default("0").notNull(),
    lastPositionSeconds: numeric("last_position_seconds").default("0").notNull(),
    lastPingServerAt: timestamp("last_ping_server_at", { withTimezone: true }),
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("content_progress_user_content").on(table.userId, table.contentId)],
);

export const trainingProgress = pgTable(
  "training_progress",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    currentItemOrder: integer("current_item_order").default(0).notNull(),
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    versionMajorCompleted: integer("version_major_completed"),
    versionMinorCompleted: integer("version_minor_completed"),
    requiresRecompletion: boolean("requires_recompletion").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("training_progress_user_training").on(table.userId, table.trainingId)],
);

export const contentProgressRelations = relations(contentProgress, ({ one }) => ({
  user: one(users, { fields: [contentProgress.userId], references: [users.id] }),
  content: one(contentItems, { fields: [contentProgress.contentId], references: [contentItems.id] }),
}));

export const trainingProgressRelations = relations(trainingProgress, ({ one }) => ({
  user: one(users, { fields: [trainingProgress.userId], references: [users.id] }),
  training: one(trainings, { fields: [trainingProgress.trainingId], references: [trainings.id] }),
}));
