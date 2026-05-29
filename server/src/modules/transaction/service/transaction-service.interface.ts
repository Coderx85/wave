import type { TAccountId, TTransactionId, TUserId } from "@/types";

export type TransactionStatus = "pending" | "success" | "failed";

export interface ITransaction {
  id: TTransactionId;
  amount: string; 
  userId: TUserId;
  senderAccountId: TAccountId;
  senderName: string;
  receiverAccountId: TAccountId;
  receiverName: string;
  status: TransactionStatus;
  createdAt: Date;
};

export interface ITransactionModule {
  create(transaction: Omit<ITransaction, "id" | "status">): Promise<ITransaction>;
  list(userId: string): Promise<ITransaction[]>;
  query(query: {
    status?: "success" | "failed";
    dateRange?: { from: Date; to: Date };
  }): Promise<ITransaction[]>;
  delete(transactionId: string): Promise<void>;
};

