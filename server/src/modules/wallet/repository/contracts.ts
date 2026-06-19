import type { TBankAccountNumber, TLedgerEntryId, TTransactionId, TUserId } from "@/types";

// ── Account ──────────────────────────────────────────
export interface IAccountDTO {
  name: string;
  userId: TUserId;
  accountNumber: TBankAccountNumber;
  balance: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface IAccountRepository {
  create(account: Omit<IAccountDTO, "createdAt" | "updatedAt">): Promise<IAccountDTO>;
  findByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccountDTO | null>;
  findByUserId(userId: TUserId): Promise<IAccountDTO[]>;
  adjustBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number>;
  checkBalance(accountNumber: TBankAccountNumber): Promise<IAccountDTO>;
}

// ── Transaction ──────────────────────────────────────
export interface ITransactionDTO {
  id: TTransactionId;
  amount: bigint;
  userId: TUserId;
  senderAccountNumber: TBankAccountNumber;
  senderName: string;
  receiverAccountNumber: TBankAccountNumber;
  receiverName: string;
  status: "pending" | "success" | "failed";
  createdAt: Date;
  updatedAt: Date | null;
}

export interface TransactionQuery {
  userId: TUserId;
  dateRange?: { from: Date; to: Date };
  accountNumber?: TBankAccountNumber;
}

export interface ITransactionRepository {
  save(transaction: ITransactionDTO): Promise<void>;
  findById(transactionId: TTransactionId): Promise<ITransactionDTO | null>;
  findByUserId(userId: TUserId): Promise<ITransactionDTO[]>;
  update(transaction: ITransactionDTO): Promise<ITransactionDTO>;
  failedTransactions(query: TransactionQuery): Promise<ITransactionDTO[]>;
  successfulTransactions(query: TransactionQuery): Promise<ITransactionDTO[]>;
}

// ── Ledger ──────────────────────────────────────────
export type EntryType = "debit" | "credit";

export interface ILedgerEntryDTO {
  id: TLedgerEntryId;
  transactionId: TTransactionId;
  accountNumber: TBankAccountNumber;
  amount: number;
  entryType: EntryType;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ILedgerRepository {
  create(entry: Omit<ILedgerEntryDTO, "id" | "createdAt" | "updatedAt">): Promise<ILedgerEntryDTO>;
  findById(entryId: TLedgerEntryId): Promise<ILedgerEntryDTO | null>;
  findByTransactionId(transactionId: TTransactionId): Promise<ILedgerEntryDTO[]>;
  findByEntryType(entryType: EntryType): Promise<ILedgerEntryDTO[]>;
  update(entryId: TLedgerEntryId, updates: Partial<Omit<ILedgerEntryDTO, "id" | "createdAt">>): Promise<void>;
  delete(entryId: TLedgerEntryId): Promise<void>;
}

// ── Outbox ──────────────────────────────────────────
export interface IOutboxEntry {
  id: string;
  transactionId: TTransactionId;
  eventType: string;
  payload: Record<string, any>;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOutboxRepository {
  create(entry: Omit<IOutboxEntry, "id" | "createdAt" | "updatedAt">): Promise<IOutboxEntry>;
  markAsPublished(transactionId: TTransactionId, publishedAt?: Date): Promise<void>;
  findUnpublished(limit?: number): Promise<IOutboxEntry[]>;
}
