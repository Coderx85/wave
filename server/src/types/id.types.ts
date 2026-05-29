import { type Brand } from "@/lib/brand";

const ID = Symbol("ID");  

export type TUserId = Brand<string, typeof ID>;

export type TSessionId = Brand<string, typeof ID>;

export type TAccountId = Brand<string, typeof ID>;

export type TVerificationId = Brand<string, typeof ID>;

export type TTokenId = Brand<string, typeof ID>;

export type TBankAccountId = Brand<string, typeof ID>;

export type TTransactionId = Brand<string, typeof ID>;

export type TLedgerEntryId = Brand<string, typeof ID>;