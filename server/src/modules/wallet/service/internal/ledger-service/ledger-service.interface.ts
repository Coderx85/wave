import type { TBankAccountNumber, TLedgerEntryId, TTransactionId } from "@/types";

export type TEntryType = "debit" | "credit";

export interface ILedger {
  id: TLedgerEntryId;
  transactionId: TTransactionId;
  accountNumber: TBankAccountNumber;
  amount: number;
  entryType: TEntryType;
  createdAt: Date;
  updatedAt: Date | null;
};

export interface ILedgerService {
  createEntry(transactionId: TTransactionId, accountNumber: TBankAccountNumber, amount: number, entryType: TEntryType): Promise<ILedger>;
  getEntries(transactionId: TTransactionId): Promise<ILedger[] | null>;
};