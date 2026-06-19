import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NotificationPreferencesPage from "../pages/NotificationPreferencesPage"

const fakeUser = { id: "user_1", name: "Test User", email: "test@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() }

vi.mock("../lib/auth-client", () => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: { user: fakeUser, session: { id: "sess_1", expiresAt: new Date() } } })),
  $Infer: { Session: {} },
}))

describe("NotificationPreferencesPage", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders loading skeletons initially", () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<NotificationPreferencesPage />)

    expect(screen.getByRole("heading", { name: /notification preferences/i })).toBeInTheDocument()
    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0)
  })

  it("displays all event type toggles after loading", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "SUCCESS", data: [] }),
    })

    render(<NotificationPreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Deposits")).toBeInTheDocument()
      expect(screen.getByText("Money Received")).toBeInTheDocument()
      expect(screen.getByText("Money Sent")).toBeInTheDocument()
    })
  })

  it("toggles a preference on click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "SUCCESS", data: [] }),
    })

    const user = userEvent.setup()
    render(<NotificationPreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Deposits")).toBeInTheDocument()
    })

    const switches = screen.getAllByRole("switch")
    expect(switches).toHaveLength(3)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        ok: true, status: 200, message: "UPDATED", data: { userId: "user_1", eventType: "deposit", enabled: false },
      }),
    })

    await user.click(switches[0])

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    const putCall = mockFetch.mock.calls[1]
    expect(putCall[0]).toContain("/notification-preferences")
    expect(putCall[1].method).toBe("PUT")
    expect(JSON.parse(putCall[1].body)).toEqual({ eventType: "deposit", enabled: false })
  })

  it("displays error state when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))

    render(<NotificationPreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
  })

  it("shows user email in header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "SUCCESS", data: [] }),
    })

    render(<NotificationPreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument()
    })
  })
})
