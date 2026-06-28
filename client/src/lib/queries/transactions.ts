import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchJSON } from "../queryClient"
import type { ITransaction } from "@/types"

// ─── Query Keys ───────────────────────────────────────────────
export const transactionKeys = {
  all: ["transactions"] as const,
  user: (userId: string) => ["transactions", userId] as const,
  single: (txId: string) => ["transaction", txId] as const,
}

// ─── Queries ──────────────────────────────────────────────────

/** Fetch all transactions for a user, sorted by createdAt desc */
export function useTransactions(userId: string) {
  return useQuery({
    queryKey: transactionKeys.user(userId),
    queryFn: async () => {
      const data = await fetchJSON<ITransaction[]>(
        `/api/wallet/users/${userId}/transactions`,
      )
      return data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    },
    enabled: !!userId,
  })
}

// ─── Mutations ────────────────────────────────────────────────

/** Transfer funds between accounts */
export function useTransfer(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      senderAccountNumber: string
      senderName: string
      receiverAccountNumber: string
      receiverName: string
      amount: number
    }) =>
      fetchJSON<ITransaction>("/api/wallet/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.user(userId) })
      queryClient.invalidateQueries({ queryKey: ["accounts", userId] })
    },
  })
}
