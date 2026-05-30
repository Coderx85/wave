import type { TLedgerEntryId, TTransactionId } from "@/types";

export type EntryType = "debit" | "credit";

export interface ILedgerEntryDBDTO {
  id: TLedgerEntryId;
  transactionId: TTransactionId;
  amount: number;
  entryType: EntryType;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ILedgerRepository {
  create(entry: Omit<ILedgerEntryDBDTO, "id" | "createdAt" | "updatedAt">): Promise<ILedgerEntryDBDTO>;
  findById(entryId: TLedgerEntryId): Promise<ILedgerEntryDBDTO | null>;
  findByTransactionId(transactionId: TTransactionId): Promise<ILedgerEntryDBDTO[]>;
  findByEntryType(entryType: EntryType): Promise<ILedgerEntryDBDTO[]>;
  update(entryId: TLedgerEntryId, updates: Partial<Omit<ILedgerEntryDBDTO, "id" | "createdAt">>): Promise<void>;
  delete(entryId: TLedgerEntryId): Promise<void>;
}
