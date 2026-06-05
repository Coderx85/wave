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