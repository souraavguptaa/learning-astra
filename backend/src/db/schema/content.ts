import { relations, sql } from "drizzle-orm";
import { numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./org.js";

export const contentTypeEnum = pgEnum("content_type", ["video", "pdf", "ppt", "word", "excel"]);
export const contentStatusEnum = pgEnum("content_status", ["processing", "ready", "failed"]);

export const masterTopics = pgTable("master_topics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  masterTopicId: uuid("master_topic_id").references((): any => masterTopics.id, { onDelete: "set null" }),
  type: contentTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  topic: text("topic").notNull(),
  language: text("language").notNull(),
  targetRoles: text("target_roles").array().notNull().default(sql`'{}'::text[]`),
  fileKey: text("file_key").notNull(),
  convertedPdfKey: text("converted_pdf_key"),
  mimeType: text("mime_type").notNull(),
  durationSeconds: numeric("duration_seconds"),
  status: contentStatusEnum("status").default("processing").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const masterTopicsRelations = relations(masterTopics, ({ many }) => ({
  contentItems: many(contentItems),
}));

export const contentItemsRelations = relations(contentItems, ({ one }) => ({
  masterTopic: one(masterTopics, { fields: [contentItems.masterTopicId], references: [masterTopics.id] }),
  uploader: one(users, { fields: [contentItems.uploadedBy], references: [users.id] }),
}));

