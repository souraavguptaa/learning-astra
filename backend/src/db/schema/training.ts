import { relations, sql } from "drizzle-orm";
import { boolean, check, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { assessments } from "./assessment.js";
import { contentItems } from "./content.js";
import { franchises, userRoleEnum, users } from "./org.js";

export const trainingStatusEnum = pgEnum("training_status", ["draft", "published"]);
export const trainingItemTypeEnum = pgEnum("training_item_type", ["content", "assessment"]);
export const assigneeTypeEnum = pgEnum("assignee_type", ["user", "role", "franchise"]);
export const versionChangeTypeEnum = pgEnum("version_change_type", ["minor", "major"]);

export const trainings = pgTable("trainings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: trainingStatusEnum("status").default("draft").notNull(),
  isMandatory: boolean("is_mandatory").default(false).notNull(),
  versionMajor: integer("version_major").default(1).notNull(),
  versionMinor: integer("version_minor").default(0).notNull(),
  npsEnabled: boolean("nps_enabled").default(false).notNull(),
  trainerId: uuid("trainer_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trainingItems = pgTable(
  "training_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    trainingId: uuid("training_id")
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    itemOrder: integer("item_order").notNull(),
    itemType: trainingItemTypeEnum("item_type").notNull(),
    contentId: uuid("content_id").references(() => contentItems.id, { onDelete: "cascade" }),
    assessmentId: uuid("assessment_id").references((): any => assessments.id, { onDelete: "cascade" }),
  },
  (table) => [
    check(
      "training_items_exactly_one_ref",
      sql`(
        (${table.itemType} = 'content' AND ${table.contentId} IS NOT NULL AND ${table.assessmentId} IS NULL)
        OR
        (${table.itemType} = 'assessment' AND ${table.assessmentId} IS NOT NULL AND ${table.contentId} IS NULL)
      )`,
    ),
  ],
);

export const trainingAssignments = pgTable("training_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  trainingId: uuid("training_id")
    .notNull()
    .references(() => trainings.id, { onDelete: "cascade" }),
  assigneeType: assigneeTypeEnum("assignee_type").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: userRoleEnum("role"),
  franchiseId: uuid("franchise_id").references(() => franchises.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trainingVersions = pgTable("training_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  trainingId: uuid("training_id")
    .notNull()
    .references(() => trainings.id, { onDelete: "cascade" }),
  versionMajor: integer("version_major").notNull(),
  versionMinor: integer("version_minor").notNull(),
  changeType: versionChangeTypeEnum("change_type").notNull(),
  changedBy: uuid("changed_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trainingsRelations = relations(trainings, ({ many }) => ({
  items: many(trainingItems),
  assignments: many(trainingAssignments),
  versions: many(trainingVersions),
}));

export const trainingItemsRelations = relations(trainingItems, ({ one }) => ({
  training: one(trainings, { fields: [trainingItems.trainingId], references: [trainings.id] }),
  content: one(contentItems, { fields: [trainingItems.contentId], references: [contentItems.id] }),
}));
