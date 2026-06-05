import type { WalletInternalService } from "../../service/";

export interface ITransactionDBDTO extends WalletInternalService.ITransaction {}

export interface TransactionQuery {
  userId: ITransactionDBDTO["userId"];
  dateRange?: { from: Date; to: Date };
  accountNumber?: ITransactionDBDTO["senderAccountNumber"] | ITransactionDBDTO["receiverAccountNumber"];
}

export interface ITransactionRepository {
  save(transaction: ITransactionDBDTO): Promise<void>;
  findById(transactionId: ITransactionDBDTO["id"]): Promise<ITransactionDBDTO | null>;
  findByUserId(userId: ITransactionDBDTO["userId"]): Promise<ITransactionDBDTO[]>;
  update(transaction: ITransactionDBDTO): Promise<ITransactionDBDTO>;
  failedTransactions(query: TransactionQuery): Promise<ITransactionDBDTO[]>;
  successfulTransactions(query: TransactionQuery): Promise<ITransactionDBDTO[]>;
};