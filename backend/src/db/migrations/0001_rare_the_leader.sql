CREATE TYPE "public"."content_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('video', 'pdf', 'ppt', 'word', 'excel');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"master_topic_id" uuid,
	"type" "content_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"topic" text NOT NULL,
	"language" text NOT NULL,
	"target_roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"file_key" text NOT NULL,
	"converted_pdf_key" text,
	"mime_type" text NOT NULL,
	"duration_seconds" numeric,
	"status" "content_status" DEFAULT 'processing' NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "master_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_items" ADD CONSTRAINT "content_items_master_topic_id_master_topics_id_fk" FOREIGN KEY ("master_topic_id") REFERENCES "public"."master_topics"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_items" ADD CONSTRAINT "content_items_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
