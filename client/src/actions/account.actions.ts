import type { WaveResponse, IWalletTransaction, ITransaction, TCreateBankAccountInput, TBankAccountNumber } from "@/types";

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

export async function getAccountByNumber(accountNumber: TBankAccountNumber): 
  Promise<WaveResponse<IWalletTransaction>> {
    try {
      const raw = await fetch(`/api/wallet/accounts/by-number/${encodeURIComponent(String(accountNumber))}`, {
        method: "GET",
      });

      const data = await raw.json() as WaveResponse<IWalletTransaction>;

      if (!data.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Error fetching account by number:", error);
      throw error;
    }
  }

export async function fetchAccountTransactionsAction(userId: string): 
  Promise<WaveResponse<IWalletTransaction[]>> {
    try {
      const raw = await fetch(`/api/wallet/users/${userId}/transactions`, {
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
      const raw = await fetch(`/api/wallet/users/${userId}/accounts`, {
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

export async function getBalance(accountNumber: TBankAccountNumber): 
  Promise<WaveResponse<{ accountNumber: TBankAccountNumber; balance: number }>> {
    try {
      const raw = await fetch(`/api/wallet/accounts/${encodeURIComponent(String(accountNumber))}/balance`, {
        method: "GET",
      });

      const data = await raw.json() as WaveResponse<{ accountNumber: TBankAccountNumber; balance: number }>;

      if (!data.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw error;
    }
  }

export async function deposit(input: { userId: string; accountNumber: TBankAccountNumber; amount: number }): 
  Promise<WaveResponse<IWalletTransaction>> {
    try {
      const raw = await fetch(`/api/wallet/accounts/${encodeURIComponent(String(input.accountNumber))}/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = await raw.json() as WaveResponse<IWalletTransaction>;

      if (!data.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Error depositing funds:", error);
      throw error;
    }
  }

export async function transfer(input: {
  userId: string;
  senderAccountNumber: TBankAccountNumber;
  senderName: string;
  receiverAccountNumber: TBankAccountNumber;
  receiverName: string;
  amount: number;
}): Promise<WaveResponse<ITransaction>> {
  try {
    const raw = await fetch("/api/wallet/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const data = await raw.json() as WaveResponse<ITransaction>;

    if (!data.ok) {
      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error("Error transferring funds:", error);
    throw error;
  }
}

export async function queryTransactions(userId: string, query: { status?: "success" | "failed"; dateRange?: { from: Date; to: Date } }): 
  Promise<WaveResponse<ITransaction[]>> {
    try {
      const params = new URLSearchParams();
      if (query.status) params.append("status", query.status);
      if (query.dateRange) {
        params.append("from", query.dateRange.from.toISOString());
        params.append("to", query.dateRange.to.toISOString());
      }
      
      const raw = await fetch(`/api/wallet/users/${userId}/transactions/query?${params.toString()}`, {
        method: "GET",
      });

      const data = await raw.json() as WaveResponse<ITransaction[]>;

      if (!data.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Error querying transactions:", error);
      throw error;
    }
  }

export async function getLedgerEntries(transactionId: string): 
  Promise<WaveResponse<{ id: string; transactionId: string; accountNumber: TBankAccountNumber; amount: string; createdAt: string; updatedAt: string | null }[]>> {
    try {
      const raw = await fetch(`/api/wallet/transactions/${transactionId}/ledger`, {
        method: "GET",
      });

      const data = await raw.json();

      if (!data.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
      throw error;
    }
  }