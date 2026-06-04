import type { TAccountId, TTransactionId } from "./id.types";

export type TransactionStatus = "pending" | "success" | "failed";

export interface ITransaction {
  id: TTransactionId;
  amount: string;
  senderAccountId: TAccountId;
  senderName: string;
  receiverAccountId: TAccountId;
  receiverName: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
};

export type TransactionInput = Omit<ITransaction, "id" | "status" | "amount"> & {
  amount: number;
};