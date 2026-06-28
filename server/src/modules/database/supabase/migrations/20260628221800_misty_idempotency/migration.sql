CREATE TABLE "idempotency_records" (
	"key" text PRIMARY KEY NOT NULL,
	"operation" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"result" jsonb,
	"error" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	CONSTRAINT "operation_valid" CHECK ("operation" IN ('transaction', 'balance_update', 'account_creation')),
	CONSTRAINT "status_valid" CHECK ("status" IN ('pending', 'completed', 'failed'))
);--> statement-breakpoint
CREATE INDEX "idempotency_expires_at_idx" ON "idempotency_records" ("expiresAt");--> statement-breakpoint
CREATE INDEX "idempotency_status_idx" ON "idempotency_records" ("status");
