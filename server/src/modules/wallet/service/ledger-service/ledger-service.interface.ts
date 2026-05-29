import type { TLedgerEntryId, TTransactionId } from "@/types";

export type TEntryType = "debit" | "credit";

export interface ILedger {
  id: TLedgerEntryId;
  transactionId: TTransactionId;
  amount: number;
  entryType: TEntryType;
  createdAt: Date;
  updatedAt: Date | null;
};

export interface ILedgerService {
  createEntry(transactionId: TTransactionId, amount: number, entryType: TEntryType): Promise<ILedger>;
  getEntries(transactionId: TTransactionId): Promise<ILedger[]>;
};