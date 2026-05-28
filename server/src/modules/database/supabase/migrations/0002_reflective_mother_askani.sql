CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"senderName" text NOT NULL,
	"receiverName" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"senderAccountId" text NOT NULL,
	"receiverAccountId" text NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amount_positive" CHECK ("transactions"."amount" > 0)
);
--> statement-breakpoint
DROP INDEX "accounts_userId_idx";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "accountNumber" text NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "balance" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_senderAccountId_accounts_id_fk" FOREIGN KEY ("senderAccountId") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiverAccountId_accounts_id_fk" FOREIGN KEY ("receiverAccountId") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_sender_account_id_idx" ON "transactions" USING btree ("senderAccountId");--> statement-breakpoint
CREATE INDEX "transactions_receiver_account_id_idx" ON "transactions" USING btree ("receiverAccountId");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "accountId";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "providerId";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "accessToken";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "refreshToken";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "idToken";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "accessTokenExpiresAt";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "refreshTokenExpiresAt";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "password";--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_accountNumber_unique" UNIQUE("accountNumber");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "balance_non_negative" CHECK ("accounts"."balance" > 0);--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "name_not_empty" CHECK ("accounts"."name" != '');