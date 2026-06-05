import type { TBankAccountNumber } from "./id.types";

export type IWalletTransaction = {
  id: string;
  name: string;
  userId: string;
  accountNumber: TBankAccountNumber;
  balance: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export type TCreateBankAccountInput = Omit<IWalletTransaction, "id" | "createdAt" | "updatedAt">;