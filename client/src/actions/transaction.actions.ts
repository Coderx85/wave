import type { ITransaction, WaveResponse } from "@/types";

export async function fetchTransactionsAction(userId: string): Promise<WaveResponse<ITransaction[]>> {
  try {
    const res = await fetch(`/api/wallet/users/${userId}/transactions`);
    return await res.json() as WaveResponse<ITransaction[]>;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
}