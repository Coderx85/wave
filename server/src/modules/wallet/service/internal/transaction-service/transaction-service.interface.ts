import type { TBankAccountNumber, TAccountId, TTransactionId, TUserId } from "@/types";

export type TransactionStatus = "pending" | "success" | "failed";

export interface ITransaction {
  id: TTransactionId;
  amount: bigint; 
  userId: TUserId;
  senderAccountNumber: TBankAccountNumber;
  senderName: string;
  receiverAccountNumber: TBankAccountNumber;
  receiverName: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date | null;
};

export type TransactionInput = Omit<ITransaction, "id" | "status" | "amount" | "createdAt" | "updatedAt"> & {
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
  list(userId: TUserId): Promise<ITransaction[]>;
  query(query: TTransactionQuery, userId: TUserId): Promise<ITransaction[]>;
};
