import type {
  TBankAccountNumber,
  TUserId,
  TTransactionId,
} from "@/types";

import type {
  IAccount, 
  ITransaction, 
  TTransactionQuery,
  ILedger
} from "./internal";

export type CreateAccountInput = Omit<IAccount, "createdAt" | "updatedAt">;

export type TransferInput = Omit<ITransaction, "id" | "status" | "amount"> & {
  amount: number;
  idempotencyKey?: string;
};

export type DepositInput = {
  userId: TUserId;
  accountNumber: TBankAccountNumber;
  amount: number;
};

export interface IWalletService {
  createAccount(account: CreateAccountInput): Promise<IAccount>;
  getAccountById(accountNumber: TBankAccountNumber): Promise<IAccount | null>;
  getAccountByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccount | null>;
  getUserAccounts(userId: TUserId): Promise<IAccount[]>;
  getBalance(accountNumber: TBankAccountNumber): Promise<number>;
  deposit(input: DepositInput): Promise<IAccount>;
  transfer(input: TransferInput): Promise<ITransaction>;
  listTransactions(userId: TUserId): Promise<ITransaction[]>;
  queryTransactions(query: TTransactionQuery, userId: TUserId): Promise<ITransaction[]>;
  getLedgerEntries(transactionId: TTransactionId): Promise<ILedger[]>;
}
