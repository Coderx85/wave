import type { ITransaction } from "../../service/transaction-service";

export interface ITransactionDBDTO extends Omit<ITransaction, "amount"> {
  amount: bigint;
}

export interface TransactionQuery {
  userId: ITransactionDBDTO["userId"];
  dateRange?: { from: Date; to: Date };
  accountId?: ITransactionDBDTO["senderAccountId"] | ITransactionDBDTO["receiverAccountId"];
}

export interface ITransactionRepository {
  save(transaction: ITransactionDBDTO): Promise<void>;
  findById(transactionId: ITransactionDBDTO["id"]): Promise<ITransactionDBDTO | null>;
  findByUserId(userId: ITransactionDBDTO["userId"]): Promise<ITransactionDBDTO[]>;
  failedTransactions(query: TransactionQuery): Promise<ITransactionDBDTO[]>;
  successfulTransactions(query: TransactionQuery): Promise<ITransactionDBDTO[]>;
};