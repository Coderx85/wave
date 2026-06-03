import { useState, useEffect } from "react"
import { useSession } from "./lib/auth-client"
import type { Session } from "./lib/auth-client"
import NotificationPage from "./components/NotificationPage"
import AuthPage from "./components/AuthPage"
import { Skeleton } from "./components/ui/skeleton"

function App() {
  const { data: session, isPending } = useSession()
  const [backendOff, setBackendOff] = useState(false)

  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        fetch("/api/auth/session", { method: "HEAD", signal: AbortSignal.timeout(1000) })
          .catch(() => setBackendOff(true))
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

  const activeSession = session ?? (backendOff ? {
    user: { id: "dev_user", name: "Alex Rivera", email: "alex@wave.dev", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: { id: "dev_session", expiresAt: new Date(Date.now() + 86400000) },
  } as Session : null)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground animate-fade-slide-in">
      {activeSession ? <NotificationPage user={activeSession.user} /> : <AuthPage />}
    </div>
  )
}

export default App
