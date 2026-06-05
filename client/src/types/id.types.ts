import type { Brand } from "@/lib/brand";

// String-based IDs 
export type TUserId = Brand<string, "UserId">;
export type TSessionId = Brand<string, "SessionId">;
export type TAccountId = Brand<string, "AccountId">;
export type TVerificationId = Brand<string, "VerificationId">;
export type TTokenId = Brand<string, "TokenId">;
export type TTransactionId = Brand<string, "TransactionId">;
export type TLedgerEntryId = Brand<string, "LedgerEntryId">;

// String-based IDs
export type TBankAccountNumber = Brand<bigint, "BankAccountNumber">;