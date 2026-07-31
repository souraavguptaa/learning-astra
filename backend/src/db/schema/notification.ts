import { relations, sql } from "drizzle-orm";
import { boolean, index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { franchises, userRoleEnum, users } from "./org.js";

export const announcementTargetTypeEnum = pgEnum("announcement_target_type", ["all", "role", "franchise"]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    deepLink: text("deep_link"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("notifications_user_id_idx").on(table.userId)],
);

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  body: text("body").notNull(),
  attachmentFileKey: text("attachment_file_key"),
  trainingLinkId: uuid("training_link_id"),
  targetType: announcementTargetTypeEnum("target_type").notNull(),
  targetRole: userRoleEnum("target_role"),
  targetFranchiseId: uuid("target_franchise_id").references(() => franchises.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const announcementReads = pgTable(
  "announcement_reads",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("announcement_reads_announcement_user").on(table.announcementId, table.userId),
    index("announcement_reads_user_id_idx").on(table.userId),
  ],
);

export const announcementsRelations = relations(announcements, ({ many }) => ({
  reads: many(announcementReads),
}));

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  announcement: one(announcements, { fields: [announcementReads.announcementId], references: [announcements.id] }),
}));
