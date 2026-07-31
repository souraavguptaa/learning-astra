import { relations, sql } from "drizzle-orm";
import { boolean, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { contentItems } from "./content.js";
import { users } from "./org.js";
import { trainings } from "./training.js";

export const assessmentQuestionTypeEnum = pgEnum("assessment_question_type", ["mcq", "true_false"]);

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  trainingId: uuid("training_id")
    .notNull()
    .references(() => trainings.id, { onDelete: "cascade" }),
  linkedContentId: uuid("linked_content_id").references(() => contentItems.id, { onDelete: "set null" }),
  passPercentage: integer("pass_percentage").default(70).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assessmentQuestions = pgTable("assessment_questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  type: assessmentQuestionTypeEnum("type").notNull(),
  questionOrder: integer("question_order").notNull(),
  imageFileKey: text("image_file_key"),
});

export const assessmentOptions = pgTable("assessment_options", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: uuid("question_id")
    .notNull()
    .references(() => assessmentQuestions.id, { onDelete: "cascade" }),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").default(false).notNull(),
  optionOrder: integer("option_order").notNull(),
});

export const assessmentResults = pgTable(
  "assessment_results",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    attemptsUsed: integer("attempts_used").default(0).notNull(),
    bestScorePercentage: numeric("best_score_percentage"),
    passed: boolean("passed").default(false).notNull(),
    lastAnswers: jsonb("last_answers"),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    passedAt: timestamp("passed_at", { withTimezone: true }),
  },
  (table) => [unique("assessment_results_user_assessment").on(table.userId, table.assessmentId)],
);

export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  certificateNumber: text("certificate_number").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trainingId: uuid("training_id")
    .notNull()
    .references(() => trainings.id, { onDelete: "cascade" }),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessments.id, { onDelete: "cascade" }),
  scorePercentage: numeric("score_percentage").notNull(),
  pdfFileKey: text("pdf_file_key").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assessmentsRelations = relations(assessments, ({ many }) => ({
  questions: many(assessmentQuestions),
}));

export const assessmentQuestionsRelations = relations(assessmentQuestions, ({ one, many }) => ({
  assessment: one(assessments, { fields: [assessmentQuestions.assessmentId], references: [assessments.id] }),
  options: many(assessmentOptions),
}));

export const assessmentOptionsRelations = relations(assessmentOptions, ({ one }) => ({
  question: one(assessmentQuestions, { fields: [assessmentOptions.questionId], references: [assessmentQuestions.id] }),
}));
