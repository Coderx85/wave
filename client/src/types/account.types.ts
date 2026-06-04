export type TBankAccount = {
  id: string;
  name: string;
  userId: string;
  accountNumber: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export type TCreateBankAccountInput = Omit<TBankAccount, "id" | "createdAt" | "updatedAt">;