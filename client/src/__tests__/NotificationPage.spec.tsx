import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NotificationPage from "../components/NotificationPage"

const mockSignOut = vi.fn()
const fakeUser = { id: "user_1", name: "Test User", email: "test@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() }

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

describe("NotificationPage", () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let esHelpers: ReturnType<typeof createMockEventSource>

  beforeEach(() => {
    sseUrlUsed = ""

    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    esHelpers = createMockEventSource()
    vi.stubGlobal("EventSource", esHelpers.MockEventSource as any)

    mockSignOut.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders loading skeletons initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<NotificationPage />)

    expect(screen.getByRole("heading", { name: /notifications/i })).toBeInTheDocument()
    expect(document.querySelectorAll("[data-testid='skeleton-card']").length).toBe(4)
  })

  it("fetches notifications on mount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        status: 200,
        message: "SUCCESS",
        data: [
          { id: "n1", title: "Test Notification", message: "Hello", type: "info", timestamp: new Date().toISOString(), read: false },
        ],
      }),
    })

    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("Test Notification")).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/notification/users/${fakeUser.id}/notifications?limit=50`,
    )
  })

  it("displays error state when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))

    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
  })

  it("shows empty state when no notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "EMPTY", data: [] }),
    })

    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })
  })

  it("adds incoming SSE notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "EMPTY", data: [] }),
    })

    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })

    esHelpers.triggerMessage(JSON.stringify({
      result: [{ id: "n1", title: "Live Alert", message: "Urgent", type: "warning", timestamp: new Date().toISOString(), read: false }],
    }))

    await waitFor(() => {
      expect(screen.getByText("Live Alert")).toBeInTheDocument()
      expect(screen.getByText("Urgent")).toBeInTheDocument()
    })
  })

  it("dismisses a notification", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true, status: 200, message: "OK", data: [
          { id: "n1", title: "To Dismiss", message: "Bye", type: "info", timestamp: new Date().toISOString(), read: false },
        ],
      }),
    })

    const user = userEvent.setup()
    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("To Dismiss")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /dismiss/i }))

    expect(screen.queryByText("To Dismiss")).not.toBeInTheDocument()
  })

  it("marks a notification as read", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true, status: 200, message: "OK", data: [
          { id: "n1", title: "Read Me", message: "Please", type: "info", timestamp: new Date().toISOString(), read: false },
        ],
      }),
    })

    const user = userEvent.setup()
    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("Read Me")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /mark read/i }))

    const card = screen.getByText("Read Me").closest("[data-testid='notification-card']")
    expect(card?.getAttribute("data-read")).toBe("true")
    expect(screen.queryByRole("button", { name: /mark read/i })).not.toBeInTheDocument()
  })

  it("calls signOut when sign-out button clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "EMPTY", data: [] }),
    })

    const user = userEvent.setup()
    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /sign out/i }))

    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it("shows user details in header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "EMPTY", data: [] }),
    })

    render(<NotificationPage />)

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument()
    })
  })

  it("uses user.id in SSE URL", () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<NotificationPage />)

    expect(sseUrlUsed).toBe(`/api/notification/users/${fakeUser.id}/notifications/stream`)
  })
})
