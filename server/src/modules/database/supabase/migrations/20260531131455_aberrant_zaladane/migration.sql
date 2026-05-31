CREATE TABLE "transaction_outbox" (
	"id" text PRIMARY KEY,
	"transactionId" text NOT NULL UNIQUE,
	"eventType" text NOT NULL,
	"payload" jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_type_not_empty" CHECK ("eventType" != '')
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY,
	"transactionId" text NOT NULL,
	"userId" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "status_valid" CHECK ("status" IN ('pending', 'sent', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "outbox_transaction_id_idx" ON "transaction_outbox" ("transactionId");--> statement-breakpoint
CREATE INDEX "outbox_published_idx" ON "transaction_outbox" ("published");--> statement-breakpoint
CREATE INDEX "outbox_created_at_idx" ON "transaction_outbox" ("createdAt");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" ("userId");--> statement-breakpoint
CREATE INDEX "notifications_transaction_id_idx" ON "notifications" ("transactionId");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" ("status");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" ("createdAt");--> statement-breakpoint
ALTER TABLE "transaction_outbox" ADD CONSTRAINT "transaction_outbox_transactionId_transactions_id_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_transactionId_transactions_id_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;