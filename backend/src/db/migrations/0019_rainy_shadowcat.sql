ALTER TABLE "users" ADD COLUMN "employee_code" text;--> statement-breakpoint
ALTER TABLE "training_assignments" ADD COLUMN "assigned_by" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
