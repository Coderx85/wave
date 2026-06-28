import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import NotificationPreferencesPage from "../pages/NotificationPreferencesPage"

const fakeUser = { id: "user_1", name: "Test User", email: "test@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() }

vi.mock("../lib/auth-client", () => ({
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: { user: fakeUser, session: { id: "sess_1", expiresAt: new Date() } } })),
  $Infer: { Session: {} },
}))

let mockPrefsData: any[] = []
let mockPrefsLoading = false
let mockPrefsError: Error | null = null
let mockToggleMutate = vi.fn()
let mockRefetch = vi.fn()

vi.mock("@/lib/queries/notificationPrefs", () => ({
  useNotificationPrefs: vi.fn(() => ({
    data: mockPrefsData,
    isLoading: mockPrefsLoading,
    isError: !!mockPrefsError,
    error: mockPrefsError,
    refetch: mockRefetch,
  })),
  useTogglePreference: vi.fn(() => ({
    mutate: mockToggleMutate,
    isPending: false,
    data: null,
    error: null,
  })),
}))

function renderWithQuery(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe("NotificationPreferencesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrefsData = []
    mockPrefsLoading = false
    mockPrefsError = null
  })

  it("renders loading skeletons initially", () => {
    mockPrefsLoading = true
    mockPrefsData = undefined as any

    renderWithQuery(<NotificationPreferencesPage />)

    expect(screen.getByRole("heading", { name: /notification preferences/i })).toBeInTheDocument()
    expect(document.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0)
  })

  it("displays all event type toggles after loading", async () => {
    mockPrefsData = []

    renderWithQuery(<NotificationPreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Deposits")).toBeInTheDocument()
      expect(screen.getByText("Money Received")).toBeInTheDocument()
      expect(screen.getByText("Money Sent")).toBeInTheDocument()
    })
  })

  it("toggles a preference on click", async () => {
    mockPrefsData = []

    const user = userEvent.setup()
    renderWithQuery(<NotificationPreferencesPage />)

    await waitFor(() => {
      expect(screen.getByText("Deposits")).toBeInTheDocument()
    })

    const switches = screen.getAllByRole("switch")
    expect(switches).toHaveLength(3)

    await user.click(switches[0])

    await waitFor(() => {
      expect(mockToggleMutate).toHaveBeenCalledWith({ eventType: "deposit", enabled: false })
    })
  })

  it("displays error state when fetch fails", () => {
    mockPrefsError = new Error("Network error")
    mockPrefsData = undefined as any

    renderWithQuery(<NotificationPreferencesPage />)

    expect(screen.getByText(/network error/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
  })

  it("shows user email in header", () => {
    mockPrefsData = []

    renderWithQuery(<NotificationPreferencesPage />)

    expect(screen.getByText("test@example.com")).toBeInTheDocument()
  })
})
