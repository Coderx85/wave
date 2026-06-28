import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useTransactions, useTransfer } from "../transactions"

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

describe("useTransactions", () => {
  it("fetches and sorts transactions by createdAt desc", async () => {
    const txs = [
      { id: "t1", createdAt: "2026-01-01T00:00:00Z" },
      { id: "t2", createdAt: "2026-06-01T00:00:00Z" },
      { id: "t3", createdAt: "2026-03-01T00:00:00Z" },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: txs }),
    })

    const { result } = renderHook(() => useTransactions("user_1"), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map((t: any) => t.id)).toEqual(["t2", "t3", "t1"])
  })

  it("does not fetch when userId is empty", () => {
    const { result } = renderHook(() => useTransactions(""), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("sorts transactions correctly with mixed dates", async () => {
    const txs = [
      { id: "t1", createdAt: "2026-03-15T10:00:00Z" },
      { id: "t2", createdAt: "2026-03-15T08:00:00Z" },
      { id: "t3", createdAt: "2026-03-15T12:00:00Z" },
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: txs }),
    })

    const { result } = renderHook(() => useTransactions("user_1"), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map((t: any) => t.id)).toEqual(["t3", "t1", "t2"])
  })
})

describe("useTransfer", () => {
  it("transfers and invalidates transactions + accounts", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const txResult = { id: "t_new", amount: "100", status: "success" }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: txResult }),
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useTransfer("user_1"), { wrapper })

    result.current.mutate({
      senderAccountNumber: "1000000000001",
      senderName: "Alice",
      receiverAccountNumber: "1000000000002",
      receiverName: "Bob",
      amount: 100,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["transactions", "user_1"] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts", "user_1"] })
  })
})
