ALTER TABLE "transactions" DROP CONSTRAINT "transactions_senderAccountId_accounts_id_fkey";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_receiverAccountId_accounts_id_fkey";--> statement-breakpoint
DROP INDEX "transactions_sender_account_id_idx";--> statement-breakpoint
DROP INDEX "transactions_receiver_account_id_idx";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "senderAccountNumber" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "receiverAccountNumber" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "senderAccountId";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "receiverAccountId";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "accountNumber" SET DATA TYPE bigint USING "accountNumber"::bigint;--> statement-breakpoint
CREATE INDEX "transactions_sender_account_number_idx" ON "transactions" ("senderAccountNumber");--> statement-breakpoint
CREATE INDEX "transactions_receiver_account_number_idx" ON "transactions" ("receiverAccountNumber");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_senderAccountNumber_accounts_accountNumber_fkey" FOREIGN KEY ("senderAccountNumber") REFERENCES "accounts"("accountNumber") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiverAccountNumber_accounts_accountNumber_fkey" FOREIGN KEY ("receiverAccountNumber") REFERENCES "accounts"("accountNumber") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "balance_non_negative", ADD CONSTRAINT "balance_non_negative" CHECK ("balance" >= 0);