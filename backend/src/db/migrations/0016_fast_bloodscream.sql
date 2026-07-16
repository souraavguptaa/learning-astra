ALTER TABLE "support_tickets" ADD COLUMN "ticket_number" text;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number");