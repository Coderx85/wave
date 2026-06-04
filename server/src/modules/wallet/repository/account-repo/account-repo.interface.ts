import type { TUserId, TBankAccountId } from "@/types";

export interface IAccountDBDTO {
  id: TBankAccountId;
  name: string;
  userId: TUserId;
  accountNumber: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export interface IAccountRepository {
  create(account: Omit<IAccountDBDTO, "createdAt" | "updatedAt">): Promise<IAccountDBDTO>;
  findById(accountId: TBankAccountId): Promise<IAccountDBDTO | null>;
  findByAccountNumber(accountNumber: string): Promise<IAccountDBDTO | null>;
  findByUserId(userId: TUserId): Promise<IAccountDBDTO[]>;
  calculateNewBalance(accountId: TBankAccountId, amount: number): Promise<number>;
  adjustBalance(accountId: TBankAccountId, amount: number): Promise<number>;
  checkBalance(accountId: TBankAccountId): Promise<IAccountDBDTO>;
  updateBalance(accountId: TBankAccountId, newBalance: number): Promise<void>;
};