CREATE INDEX IF NOT EXISTS "points_ledger_user_id_idx" ON "points_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_reads_user_id_idx" ON "announcement_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_franchise_id_idx" ON "users" USING btree ("franchise_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_user_id_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_idx" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_assignments_training_id_idx" ON "training_assignments" USING btree ("training_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_assignments_user_id_idx" ON "training_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_items_training_id_idx" ON "training_items" USING btree ("training_id");