import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useLedgerEntries } from "../ledger"

let mockFetch: ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal("fetch", mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useLedgerEntries", () => {
  it("fetches ledger entries for a transaction", async () => {
    const entries = [
      { id: "l1", transactionId: "t1", entryType: "debit", amount: "100" },
      { id: "l2", transactionId: "t1", entryType: "credit", amount: "100" },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: entries }),
    })

    const { result } = renderHook(
      () => useLedgerEntries("t1"),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(entries)
    expect(mockFetch).toHaveBeenCalledWith("/api/wallet/transactions/t1/ledger")
  })

  it("does not fetch when transactionId is empty", () => {
    const { result } = renderHook(
      () => useLedgerEntries(""),
      { wrapper: createWrapper() },
    )

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
