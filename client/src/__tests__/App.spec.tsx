import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "../App"

const mockUseSession = vi.fn()

vi.mock("../lib/auth-client", () => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
  useSession: () => mockUseSession(),
  $Infer: { Session: {} },
}))

vi.mock("../components/NotificationPage", () => ({
  default: ({ user }: any) => <div data-testid="notification-page">Notifications for {user.name}</div>,
}))

vi.mock("../components/AuthPage", () => ({
  default: () => <div data-testid="auth-page">Auth Page</div>,
}))

describe("App", () => {
  beforeEach(() => {
    mockUseSession.mockReset()
  })

  it("shows loading spinner while session is pending", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    render(<App />)
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument()
    expect(screen.queryByTestId("notification-page")).not.toBeInTheDocument()
  })

  it("shows AuthPage when not authenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
      error: { message: "No session", status: 401, statusText: "Unauthorized" },
    })
    render(<App />)
    expect(screen.getByTestId("auth-page")).toBeInTheDocument()
  })

  it("shows NotificationPage when authenticated", () => {
    const fakeSession = {
      user: { id: "user_1", name: "Test User", email: "test@example.com" },
      session: { id: "sess_1", expiresAt: new Date() },
    }
    mockUseSession.mockReturnValue({ data: fakeSession, isPending: false })
    render(<App />)
    expect(screen.getByTestId("notification-page")).toBeInTheDocument()
    expect(screen.getByText(/notifications for test user/i)).toBeInTheDocument()
  })

  it("passes user prop to NotificationPage", () => {
    const fakeSession = {
      user: { id: "user_42", name: "Alice", email: "alice@test.com" },
      session: { id: "sess_1", expiresAt: new Date() },
    }
    mockUseSession.mockReturnValue({ data: fakeSession, isPending: false })
    render(<App />)
    expect(screen.getByText(/notifications for alice/i)).toBeInTheDocument()
  })
})
