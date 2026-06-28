import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import {
  useNotificationPrefs,
  useTogglePreference,
  type NotificationPreference,
} from "../notificationPrefs"

let mockFetch: ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const fakePrefs: NotificationPreference[] = [
  { id: "p1", userId: "user_1", eventType: "transaction.completed", enabled: true },
  { id: "p2", userId: "user_1", eventType: "transaction.failed", enabled: false },
]

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal("fetch", mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useNotificationPrefs", () => {
  it("fetches preferences for a user", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: fakePrefs }),
    })

    const { result } = renderHook(
      () => useNotificationPrefs("user_1"),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(fakePrefs)
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notification/users/user_1/notification-preferences",
    )
  })

  it("does not fetch when userId is empty", () => {
    const { result } = renderHook(() => useNotificationPrefs(""), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("useTogglePreference", () => {
  it("optimistically toggles preference", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["notificationPrefs", "user_1"], fakePrefs)

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          message: "OK",
          data: { ...fakePrefs[1], enabled: true },
        }),
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useTogglePreference("user_1"), { wrapper })

    await act(async () => {
      result.current.mutate({ eventType: "transaction.failed", enabled: true })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = queryClient.getQueryData<NotificationPreference[]>(["notificationPrefs", "user_1"])
    const toggled = data!.find((p) => p.eventType === "transaction.failed")
    expect(toggled!.enabled).toBe(true)
  })

  it("rolls back on error", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(["notificationPrefs", "user_1"], fakePrefs)

    mockFetch.mockRejectedValueOnce(new Error("Network error"))

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useTogglePreference("user_1"), { wrapper })

    await act(async () => {
      result.current.mutate({ eventType: "transaction.failed", enabled: true })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    const data = queryClient.getQueryData<NotificationPreference[]>(["notificationPrefs", "user_1"])
    expect(data).toEqual(fakePrefs)
  })
})
