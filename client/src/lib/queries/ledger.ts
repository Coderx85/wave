import { useQuery } from "@tanstack/react-query"
import { fetchJSON } from "../queryClient"
import type { ILedgerEntry } from "@/types"

export const ledgerKeys = {
  all: ["ledger"] as const,
  transaction: (txId: string) => ["ledger", txId] as const,
}

/** Fetch ledger entries for a transaction */
export function useLedgerEntries(transactionId: string) {
  return useQuery({
    queryKey: ledgerKeys.transaction(transactionId),
    queryFn: () =>
      fetchJSON<ILedgerEntry[]>(
        `/api/wallet/transactions/${transactionId}/ledger`,
      ),
    enabled: !!transactionId,
  })
}
