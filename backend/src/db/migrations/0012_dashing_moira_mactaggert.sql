CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."embedding_source_type" AS ENUM('content', 'announcement', 'ad');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query_text" text NOT NULL,
	"matched_source_type" "embedding_source_type",
	"matched_source_id" uuid,
	"similarity_score" numeric,
	"answer_text" text,
	"had_confident_match" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "embedding_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"source_text" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_embeddings_source" UNIQUE("source_type","source_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_search_queries" ADD CONSTRAINT "ai_search_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_search_queries_user_id_idx" ON "ai_search_queries" USING btree ("user_id");