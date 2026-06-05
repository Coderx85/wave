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

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  Link: ({ children, to, activeProps, inactiveProps, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe("App", () => {
  beforeEach(() => {
    mockUseSession.mockReset()
  })

  it("shows loading spinner while session is pending", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    render(<App />)
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument()
    expect(screen.queryByTestId("outlet")).not.toBeInTheDocument()
  })

  it("shows AuthPage when not authenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
      error: { message: "No session", status: 401, statusText: "Unauthorized" },
    })
    render(<App />)
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument()
  })

  it("renders layout and outlet when authenticated", () => {
    const fakeSession = {
      user: { id: "user_1", name: "Test User", email: "test@example.com" },
      session: { id: "sess_1", expiresAt: new Date() },
    }
    mockUseSession.mockReturnValue({ data: fakeSession, isPending: false })
    render(<App />)
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.getByText("Account")).toBeInTheDocument()
  })
})
