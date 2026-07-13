import { sql } from "drizzle-orm";
import { boolean, index, numeric, pgEnum, pgTable, text, timestamp, unique, uuid, vector } from "drizzle-orm/pg-core";
import { users } from "./org.js";

export const embeddingSourceTypeEnum = pgEnum("embedding_source_type", [
  "content",
  "announcement",
  "ad",
  "training",
  "assessment",
]);

export const contentEmbeddings = pgTable(
  "content_embeddings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sourceType: embeddingSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    sourceText: text("source_text").notNull(),
    embedding: vector("embedding", { dimensions: 3072 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("content_embeddings_source").on(table.sourceType, table.sourceId)],
);

export const aiSearchQueries = pgTable(
  "ai_search_queries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    queryText: text("query_text").notNull(),
    matchedSourceType: embeddingSourceTypeEnum("matched_source_type"),
    matchedSourceId: uuid("matched_source_id"),
    similarityScore: numeric("similarity_score"),
    answerText: text("answer_text"),
    hadConfidentMatch: boolean("had_confident_match").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("ai_search_queries_user_id_idx").on(table.userId)],
);
