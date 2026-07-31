ALTER TABLE "assessments" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "content_items" ALTER COLUMN "uploaded_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ads" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_videos" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "kb_submissions" ALTER COLUMN "trainer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "training_versions" ALTER COLUMN "changed_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "trainings" ALTER COLUMN "trainer_id" DROP NOT NULL;