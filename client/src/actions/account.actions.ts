import type { WaveResponse, IWalletTransaction, TCreateBankAccountInput } from "@/types";

export async function createAccount(input: TCreateBankAccountInput): Promise<WaveResponse<IWalletTransaction>> {
  try {
    const res = await fetch("/api/wallet/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const data = await res.json() as WaveResponse<IWalletTransaction>;
    
    return data;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  };
};

export async function fetchAccountTransactionsAction(userId: string): 
  Promise<WaveResponse<IWalletTransaction[]>> {
    try {
      const raw = await fetch(`/api/wallet/accounts/${userId}/transactions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await raw.json() as WaveResponse<IWalletTransaction[]>;

      if (!data.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      throw error;
    }
  }

export async function fetchAccountData(userId: string): 
  Promise<WaveResponse<IWalletTransaction[]>> {
    try {
      const raw = await fetch(`/api/wallet/accounts/${userId}`, {
        method: "GET",
      });

      const data = await raw.json() as WaveResponse<IWalletTransaction[]>;

      if (!data.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Error fetching account data:", error);
      throw error;
    }
  }