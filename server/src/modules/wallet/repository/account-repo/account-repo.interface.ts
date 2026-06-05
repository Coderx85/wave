import type { TUserId, TBankAccountNumber } from "@/types";

export interface IAccountDBDTO {
  name: string;
  userId: TUserId;
  accountNumber: TBankAccountNumber;
  balance: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export interface IAccountRepository {
  create(account: Omit<IAccountDBDTO, "createdAt" | "updatedAt">): Promise<IAccountDBDTO>;
  findById(accountNumber: TBankAccountNumber): Promise<IAccountDBDTO | null>;
  findByAccountNumber(accountNumber: TBankAccountNumber): Promise<IAccountDBDTO | null>;
  findByUserId(userId: TUserId): Promise<IAccountDBDTO[]>;
  calculateNewBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number>;
  adjustBalance(accountNumber: TBankAccountNumber, amount: number): Promise<number>;
  checkBalance(accountNumber: TBankAccountNumber): Promise<IAccountDBDTO>;
  updateBalance(accountNumber: TBankAccountNumber, newBalance: number): Promise<void>;
};