import type { TBankAccountNumber, TUserId } from "@/types";

export interface IAccount {
  name: string;
  userId: TUserId;
  accountNumber: TBankAccountNumber;
  balance: number;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface IAccountService {
  create(account: Omit<IAccount, | "createdAt" | "updatedAt">): Promise<IAccount>;
  getAccountByNumber(accountNumber: TBankAccountNumber): Promise<IAccount | null>;
  getUserAccounts(userId: TUserId): Promise<IAccount[]>;
  getBalance(accountNumber: TBankAccountNumber): Promise<number>;
  updateAccountBalance(accountNumber: TBankAccountNumber, amount: number): Promise<IAccount>;
}
