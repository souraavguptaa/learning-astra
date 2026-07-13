import { relations, sql } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./org.js";

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved"]);
export const kbSubmissionStatusEnum = pgEnum("kb_submission_status", [
  "pending",
  "approved",
  "edited_approved",
  "rejected",
]);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: ticketStatusEnum("status").default("open").notNull(),
    assignedTrainerId: uuid("assigned_trainer_id").references(() => users.id, { onDelete: "set null" }),
    attachments: jsonb("attachments").$type<{ fileKey: string; fileName: string }[]>().default([]),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("support_tickets_user_id_idx").on(table.userId)],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    attachments: jsonb("attachments").$type<{ fileKey: string; fileName: string }[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("ticket_messages_ticket_id_idx").on(table.ticketId)],
);

export const kbSubmissions = pgTable("kb_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => supportTickets.id, { onDelete: "cascade" }),
  trainerId: uuid("trainer_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  proposedContent: jsonb("proposed_content")
    .$type<{ title: string; description: string; topic: string; language: string }>()
    .notNull(),
  status: kbSubmissionStatusEnum("status").default("pending").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supportTicketsRelations = relations(supportTickets, ({ many }) => ({
  messages: many(ticketMessages),
  kbSubmissions: many(kbSubmissions),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [ticketMessages.ticketId], references: [supportTickets.id] }),
}));

export const kbSubmissionsRelations = relations(kbSubmissions, ({ one }) => ({
  ticket: one(supportTickets, { fields: [kbSubmissions.ticketId], references: [supportTickets.id] }),
}));
