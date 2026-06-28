import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchJSON } from "../queryClient"
import type { IWalletTransaction, TCreateBankAccountInput, TBankAccountNumber } from "@/types"

// ─── Query Keys ───────────────────────────────────────────────
export const accountKeys = {
  all: ["accounts"] as const,
  user: (userId: string) => ["accounts", userId] as const,
  byNumber: (num: TBankAccountNumber) => ["accountByNumber", String(num)] as const,
}

// ─── Queries ──────────────────────────────────────────────────

/** Fetch all wallet accounts for a user */
export function useAccounts(userId: string) {
  return useQuery({
    queryKey: accountKeys.user(userId),
    queryFn: () => fetchJSON<IWalletTransaction[]>(`/api/wallet/users/${userId}/accounts`),
    enabled: !!userId,
  })
}

/** Fetch a single account by its number */
export function useAccountByNumber(accountNumber: TBankAccountNumber) {
  return useQuery({
    queryKey: accountKeys.byNumber(accountNumber),
    queryFn: () =>
      fetchJSON<IWalletTransaction>(
        `/api/wallet/accounts/by-number/${encodeURIComponent(String(accountNumber))}`,
      ),
    enabled: !!accountNumber,
  })
}

// ─── Mutations ────────────────────────────────────────────────

/** Create a new wallet account */
export function useCreateAccount(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<TCreateBankAccountInput, "userId">) =>
      fetchJSON<IWalletTransaction>("/api/wallet/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.user(userId) })
    },
  })
}

/** Deposit funds into an account */
export function useDeposit(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { accountNumber: TBankAccountNumber; amount: number }) =>
      fetchJSON<IWalletTransaction>(
        `/api/wallet/accounts/${encodeURIComponent(String(input.accountNumber))}/deposit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, userId }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.user(userId) })
    },
  })
}
