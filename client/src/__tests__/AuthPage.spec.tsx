import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AuthPage from "../components/AuthPage"

const mockSignIn = vi.hoisted(() => vi.fn())
const mockSignUp = vi.hoisted(() => vi.fn())

vi.mock("../lib/auth-client", () => ({
  signIn: { email: mockSignIn },
  signUp: { email: mockSignUp },
  signOut: vi.fn(),
  useSession: vi.fn(),
  $Infer: { Session: {} },
}))

describe("AuthPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    mockSignUp.mockReset()
  })

  it("renders sign-in form by default", () => {
    render(<AuthPage />)
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("toggles to sign-up form", async () => {
    const user = userEvent.setup()
    render(<AuthPage />)
    await user.click(screen.getByRole("button", { name: /sign up/i }))
    expect(screen.getByText("Create a new account")).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
  })

  it("calls signIn.email on sign-in submission", async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: "1", name: "Test" } }, error: null })
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.type(screen.getByLabelText(/email/i), "test@example.com")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(mockSignIn).toHaveBeenCalledTimes(1)
    expect(mockSignIn).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    })
  })

  it("calls signUp.email on sign-up submission", async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: "1", name: "Test" } }, error: null })
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.click(screen.getByRole("button", { name: /sign up/i }))
    await user.type(screen.getByLabelText(/name/i), "Test User")
    await user.type(screen.getByLabelText(/email/i), "test@example.com")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    expect(mockSignUp).toHaveBeenCalledTimes(1)
    expect(mockSignUp).toHaveBeenCalledWith({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    })
  })

  it("displays error on sign-in failure", async () => {
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials", status: 401 },
    })
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.type(screen.getByLabelText(/email/i), "test@example.com")
    await user.type(screen.getByLabelText(/password/i), "wrong")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
  })

  it("disables submit button while loading", async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.type(screen.getByLabelText(/email/i), "test@example.com")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled()
  })

  it("clears error on mode toggle", async () => {
    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials", status: 401 },
    })
    const user = userEvent.setup()
    render(<AuthPage />)

    await user.type(screen.getByLabelText(/email/i), "test@example.com")
    await user.type(screen.getByLabelText(/password/i), "wrong")
    await user.click(screen.getByRole("button", { name: /sign in/i }))

    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /sign up/i }))
    expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
  })
})
