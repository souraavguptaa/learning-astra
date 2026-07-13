ALTER TABLE "training_assignments" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD COLUMN "is_mandatory" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trainings" ADD COLUMN "is_standalone_assessment" boolean DEFAULT false NOT NULL;