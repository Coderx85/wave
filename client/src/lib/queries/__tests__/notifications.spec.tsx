import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import {
  useNotifications,
  useDismissNotification,
  useMarkNotificationRead,
  type Notification,
} from "../notifications"

let mockFetch: ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const fakeNotification: Notification = {
  id: "n1",
  title: "Test",
  message: "Hello",
  type: "info",
  timestamp: new Date().toISOString(),
  read: false,
}

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal("fetch", mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useNotifications", () => {
  it("fetches notifications for a user", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: [fakeNotification] }),
    })

    const { result } = renderHook(
      () => useNotifications("user_1"),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([fakeNotification])
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notification/users/user_1/notifications?limit=50",
    )
  })

  it("respects custom limit", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: [] }),
    })

    renderHook(() => useNotifications("user_1", 100), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/notification/users/user_1/notifications?limit=100",
      )
    })
  })

  it("does not fetch when userId is empty", () => {
    const { result } = renderHook(() => useNotifications(""), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("useDismissNotification", () => {
  it("optimistically removes notification and rolls back on error", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    queryClient.setQueryData(["notifications", "user_1"], [fakeNotification])

    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDismissNotification("user_1"), { wrapper })

    await act(async () => {
      result.current.mutate("n1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const data = queryClient.getQueryData<Notification[]>(["notifications", "user_1"])
    expect(data).toEqual([fakeNotification])
  })

  it("removes notification on success", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["notifications", "user_1"], [fakeNotification])

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: null }),
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useDismissNotification("user_1"), { wrapper })

    await act(async () => {
      result.current.mutate("n1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe("useMarkNotificationRead", () => {
  it("optimistically marks as read", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["notifications", "user_1"], [fakeNotification])

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: null }),
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMarkNotificationRead("user_1"), { wrapper })

    await act(async () => {
      result.current.mutate("n1")
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = queryClient.getQueryData<Notification[]>(["notifications", "user_1"])
    expect(data![0].read).toBe(true)
  })

  it("rolls back on error", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["notifications", "user_1"], [fakeNotification])

    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useMarkNotificationRead("user_1"), { wrapper })

    await act(async () => {
      result.current.mutate("n1")
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const data = queryClient.getQueryData<Notification[]>(["notifications", "user_1"])
    expect(data![0].read).toBe(false)
  })
})
