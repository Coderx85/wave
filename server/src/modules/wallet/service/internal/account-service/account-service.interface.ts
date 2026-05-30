import type { TBankAccountId, TUserId } from "@/types";

export interface IAccount {
  id: TBankAccountId;
  name: string;
  userId: TUserId;
  accountNumber: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface IAccountService {
  create(account: Omit<IAccount, "id" | "createdAt" | "updatedAt">): Promise<IAccount>;
  getAccountById(accountId: TBankAccountId): Promise<IAccount | null>;
  getUserAccounts(userId: TUserId): Promise<IAccount[]>;
  getBalance(accountId: TBankAccountId): Promise<number>;
  updateAccountBalance(accountId: TBankAccountId, amount: number): Promise<IAccount>;
}
