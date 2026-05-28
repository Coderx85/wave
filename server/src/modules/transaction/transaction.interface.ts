import type { TAccountId, TTransactionId } from "@/types";

export type TransactionStatus = "pending" | "success" | "failed";

export interface ITransaction {
  id: TTransactionId;
  amount: number;
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

export interface ITransactionRepository {
  save(transaction: ITransaction): Promise<void>;
  findById(transactionId: string): Promise<ITransaction | null>;
  findByUserId(userId: string): Promise<ITransaction[]>;
  failedTransactions(): Promise<ITransaction[]>;
  successfulTransactions(): Promise<ITransaction[]>;
  delete(transactionId: string): Promise<void>;
};