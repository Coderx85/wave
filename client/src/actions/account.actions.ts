import type { WaveResponse, TBankAccount, TCreateBankAccountInput } from "@/types";

export async function fetchAccountData() {};

export async function createAccount(input: TCreateBankAccountInput): Promise<WaveResponse<TBankAccount>> {
  try {
    const res = await fetch("/api/wallet/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const data = await res.json() as WaveResponse<TBankAccount>;
    
    return data;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  };
};