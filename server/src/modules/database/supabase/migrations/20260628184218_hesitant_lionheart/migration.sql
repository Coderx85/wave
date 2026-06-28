ALTER TABLE "notifications" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "lastRetryAt" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "errorMessage" text;--> statement-breakpoint
CREATE INDEX "notifications_retry_count_idx" ON "notifications" ("retry_count");--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "status_valid", ADD CONSTRAINT "status_valid" CHECK ("status" IN ('pending', 'sent', 'failed', 'dead_letter'));
