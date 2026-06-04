import type {
  TBankAccountId,
  TUserId,
  TTransactionId,
} from "@/types";

import type {
  IAccount, 
  ITransaction, 
  TTransactionQuery,
  ILedger
} from "./internal";

export type CreateAccountInput = Omit<IAccount, "id" | "createdAt" | "updatedAt">;

export type TransferInput = Omit<ITransaction, "id" | "status" | "amount"> & {
  amount: number;
};

export type DepositInput = {
  userId: TUserId;
  accountId: TBankAccountId;
  amount: number;
};

export interface IWalletService {
  createAccount(account: CreateAccountInput): Promise<IAccount>;
  getAccountById(accountId: TBankAccountId): Promise<IAccount | null>;
  getAccountByAccountNumber(accountNumber: string): Promise<IAccount | null>;
  getUserAccounts(userId: TUserId): Promise<IAccount[]>;
  getBalance(accountId: TBankAccountId): Promise<number>;
  deposit(input: DepositInput): Promise<IAccount>;
  transfer(input: TransferInput): Promise<ITransaction>;
  listTransactions(userId: TUserId): Promise<ITransaction[]>;
  queryTransactions(query: TTransactionQuery, userId: TUserId): Promise<ITransaction[]>;
  getLedgerEntries(transactionId: TTransactionId): Promise<ILedger[]>;
}
