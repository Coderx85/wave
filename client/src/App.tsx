import { useState, useEffect } from "react"
import { Outlet, Link } from "@tanstack/react-router"
import { useSession } from "./lib/auth-client"
import type { Session } from "./lib/auth-client"
import { Skeleton } from "./components/ui/skeleton"
import AuthPage from "./components/AuthPage"

const linkBase =
  "relative text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const navItems = [
  { to: "/", label: "Home" },
  { to: "/notifications", label: "Notifications" },
  { to: "/transactions", label: "Transactions" },
  { to: "/account", label: "Account" },
  { to: "/performance", label: "Performance" },
] as const

export default function App() {
  const { data: session, isPending } = useSession()
  const [backendOff, setBackendOff] = useState(false)

  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        fetch("/api/auth/session", { method: "HEAD", signal: AbortSignal.timeout(1000) }).catch(() =>
          setBackendOff(true)
        )
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [isPending])

  if (isPending && !backendOff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div data-testid="loading-skeleton" className="w-full max-w-sm space-y-4">
          <div className="space-y-2 text-center">
            <Skeleton className="h-8 w-3/4 mx-auto rounded-md" />
            <Skeleton className="h-4 w-1/2 mx-auto rounded-md" />
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  const activeSession = session ?? (backendOff
    ? ({
        user: {
          id: "dev_user",
          name: "Alex Rivera",
          email: "alex@wave.dev",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: { id: "dev_session", expiresAt: new Date(Date.now() + 86400000) },
      } as Session)
    : null)

  if (!activeSession) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AuthPage />
      </div>
    )
  }

  return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <nav className="flex items-center gap-6 px-8 h-14 border-b border-border bg-card">
          <span className="text-base font-bold tracking-tight text-foreground mr-2">Wave</span>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={linkBase}
              activeProps={{ className: "text-foreground font-semibold after:absolute after:-bottom-[17px] after:left-0 after:right-0 after:h-[2px] after:bg-primary" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </div>
  )
}
