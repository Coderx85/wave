import type { TAccountId, TTransactionId, TUserId } from "@/types";

export type TransactionStatus = "pending" | "success" | "failed";

export interface ITransaction {
  id: TTransactionId;
  amount: bigint; 
  userId: TUserId;
  senderAccountId: TAccountId;
  senderName: string;
  receiverAccountId: TAccountId;
  receiverName: string;
  status: TransactionStatus;
  createdAt: Date;
};

export type TransactionInput = Omit<ITransaction, "id" | "status" | "amount"> & {
  amount: number;
};

export type TTransactionQuery = 
  | {
      status?: "success";
      dateRange?: {
        from: Date;
        to: Date;
      };
    }
  | {
      status?: "failed";
      dateRange?: {
        from: Date;
        to: Date;
      };
    };

export interface ITransactionModule {
  create(transaction: TransactionInput): Promise<ITransaction>;
  list(userId: string): Promise<ITransaction[]>;
  query(query: TTransactionQuery, userId: string): Promise<ITransaction[]>;
};
