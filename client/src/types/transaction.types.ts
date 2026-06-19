import type { TBankAccountNumber, TTransactionId } from "./id.types";

export type TransactionStatus = "pending" | "success" | "failed";

export interface ITransaction {
  id: TTransactionId;
  amount: string;
  userId: string;
  senderAccountNumber: TBankAccountNumber;
  senderName: string;
  receiverAccountNumber: TBankAccountNumber;
  receiverName: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
  updatedAt: string | null;
};

export type TransactionInput = Omit<ITransaction, "id" | "status" | "amount"> & {
  amount: number;
};

export interface ILedgerEntry {
  id: string;
  transactionId: string;
  accountNumber: TBankAccountNumber;
  amount: string;
  entryType: "debit" | "credit";
  createdAt: string;
  updatedAt: string | null;
}