import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import NotificationPage from "../components/NotificationPage"

const mockSignOut = vi.fn()
const fakeUser = { id: "user_1", name: "Test User", email: "test@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() }
let mockQueryClient: QueryClient

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useRouter: () => ({ navigate: vi.fn() }),
}))

vi.mock("../lib/auth-client", () => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: (...args: any[]) => mockSignOut(...args),
  useSession: vi.fn(() => ({ data: { user: fakeUser, session: { id: "sess_1", expiresAt: new Date() } } })),
  $Infer: { Session: {} },
}))

// Track mock state for notifications
let mockNotificationsData: any[] = []
let mockNotificationsLoading = false
let mockNotificationsError: Error | null = null
let mockRefetch = vi.fn()
let mockDismissMutate = vi.fn()
let mockMarkReadMutate = vi.fn()

vi.mock("../lib/queries/notifications", () => ({
  useNotifications: vi.fn(() => ({
    data: mockNotificationsData,
    isLoading: mockNotificationsLoading,
    isError: !!mockNotificationsError,
    error: mockNotificationsError,
    refetch: mockRefetch,
  })),
  useDismissNotification: vi.fn(() => ({
    mutate: mockDismissMutate,
    isPending: false,
    data: null,
    error: null,
  })),
  useMarkNotificationRead: vi.fn(() => ({
    mutate: mockMarkReadMutate,
    isPending: false,
    data: null,
    error: null,
  })),
  notificationKeys: {
    all: ["notifications"] as const,
    user: (userId: string) => ["notifications", userId] as const,
  },
}))

let sseUrlUsed = ""

function createMockEventSource() {
  let onopen: (() => void) | null = null
  let onmessage: ((e: MessageEvent) => void) | null = null
  let onerror: ((e: Event) => void) | null = null

  return {
    MockEventSource: class {
      static CONNECTING = 0
      static OPEN = 1
      static CLOSED = 2
      readyState = 0

      constructor(public url: string) {
        sseUrlUsed = url
        setTimeout(() => {
          this.readyState = 1
          onopen?.()
        }, 0)
      }

      set onopen(fn: (() => void) | null) { onopen = fn }
      get onopen() { return onopen }

      set onmessage(fn: ((e: MessageEvent) => void) | null) { onmessage = fn }
      get onmessage() { return onmessage }

      set onerror(fn: ((e: Event) => void) | null) { onerror = fn }
      get onerror() { return onerror }

      close() { this.readyState = 2 }
    },
    triggerMessage: (data: string) => onmessage?.(new MessageEvent("message", { data })),
  }
}

function renderWithQuery(ui: React.ReactNode) {
  mockQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={mockQueryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe("NotificationPage", () => {
  let esHelpers: ReturnType<typeof createMockEventSource>

  beforeEach(() => {
    sseUrlUsed = ""
    mockNotificationsData = []
    mockNotificationsLoading = false
    mockNotificationsError = null

    esHelpers = createMockEventSource()
    vi.stubGlobal("EventSource", esHelpers.MockEventSource as any)

    mockSignOut.mockReset()
    mockRefetch.mockReset()
    mockDismissMutate.mockReset()
    mockMarkReadMutate.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders loading skeletons initially", () => {
    mockNotificationsLoading = true
    mockNotificationsData = undefined as any

    renderWithQuery(<NotificationPage />)

    expect(screen.getByRole("heading", { name: /notifications/i })).toBeInTheDocument()
    expect(document.querySelectorAll("[data-testid='skeleton-card']").length).toBe(4)
  })

  it("fetches notifications on mount", async () => {
    mockNotificationsData = [
      { id: "n1", title: "Test Notification", message: "Hello", type: "info", timestamp: new Date().toISOString(), read: false },
    ]

    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("Test Notification")).toBeInTheDocument()
    })
  })

  it("displays error state when fetch fails", async () => {
    mockNotificationsError = new Error("Network error")
    mockNotificationsData = undefined as any

    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
  })

  it("shows empty state when no notifications", async () => {
    mockNotificationsData = []

    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })
  })

  it("adds incoming SSE notifications", async () => {
    mockNotificationsData = []

    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })

    // SSE message triggers optimistic cache update via queryClient.setQueryData
    esHelpers.triggerMessage(JSON.stringify({
      result: [{ id: "n1", title: "Live Alert", message: "Urgent", type: "warning", timestamp: new Date().toISOString(), read: false }],
    }))

    // Verify the query client received the SSE data via setQueryData
    await waitFor(() => {
      const cachedData = mockQueryClient.getQueryData(["notifications", fakeUser.id])
      expect(cachedData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "n1", title: "Live Alert" }),
        ]),
      )
    })
  })

  it("dismisses a notification", async () => {
    mockNotificationsData = [
      { id: "n1", title: "To Dismiss", message: "Bye", type: "info", timestamp: new Date().toISOString(), read: false },
    ]

    const user = userEvent.setup()
    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("To Dismiss")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /dismiss/i }))

    expect(mockDismissMutate).toHaveBeenCalledWith("n1")
  })

  it("marks a notification as read", async () => {
    mockNotificationsData = [
      { id: "n1", title: "Read Me", message: "Please", type: "info", timestamp: new Date().toISOString(), read: false },
    ]

    const user = userEvent.setup()
    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("Read Me")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /mark read/i }))

    expect(mockMarkReadMutate).toHaveBeenCalledWith("n1")
  })

  it("calls signOut when sign-out button clicked", async () => {
    mockNotificationsData = []

    const user = userEvent.setup()
    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /sign out/i }))

    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it("shows user details in header", async () => {
    mockNotificationsData = []

    renderWithQuery(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument()
    })
  })

  it("uses user.id in SSE URL", () => {
    mockNotificationsData = undefined as any
    mockNotificationsLoading = true

    renderWithQuery(<NotificationPage />)

    expect(sseUrlUsed).toBe(`/api/notification/users/${fakeUser.id}/notifications/stream`)
  })
})
