import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useAccounts, useAccountByNumber, useCreateAccount, useDeposit } from "../accounts"

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

describe("useAccounts", () => {
  it("fetches accounts for a user", async () => {
    const accounts = [{ id: "a1", name: "Checking", accountNumber: "1000000000001", balance: 500 }]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: accounts }),
    })

    const { result } = renderHook(() => useAccounts("user_1"), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(accounts)
    expect(mockFetch).toHaveBeenCalledWith("/api/wallet/users/user_1/accounts")
  })

  it("does not fetch when userId is empty", () => {
    const { result } = renderHook(() => useAccounts(""), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("useAccountByNumber", () => {
  it("fetches a single account by number", async () => {
    const account = { id: "a1", name: "Savings", accountNumber: "1000000000002", balance: 1000 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: account }),
    })

    const { result } = renderHook(
      () => useAccountByNumber("1000000000002" as any),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(account)
  })
})

describe("useCreateAccount", () => {
  it("creates an account and invalidates cache", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const newAccount = { id: "a2", name: "Savings", accountNumber: "1000000000003", balance: 0 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: newAccount }),
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useCreateAccount("user_1"), { wrapper })

    result.current.mutate({ name: "Savings", accountNumber: "1000000000003" as any, balance: 0 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(newAccount)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts", "user_1"] })
  })
})

describe("useDeposit", () => {
  it("deposits and invalidates cache", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const updated = { id: "a1", name: "Checking", accountNumber: "1000000000001", balance: 600 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: updated }),
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDeposit("user_1"), { wrapper })

    result.current.mutate({ accountNumber: "1000000000001" as any, amount: 100 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["accounts", "user_1"] })
  })
})
