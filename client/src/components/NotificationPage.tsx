import { useEffect, useState, useRef, useCallback } from "react"
import { Link } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { signOut, useSession } from "../lib/auth-client"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import PageHeader from "./ui/page-header"
import PageFooter from "./ui/page-footer"
import {
  useNotifications,
  useDismissNotification,
  useMarkNotificationRead,
  notificationKeys,
  type Notification,
} from "../lib/queries/notifications"

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "connected") return "default"
  if (status === "disconnected") return "destructive"
  return "secondary"
}

function statusLabel(status: string): string {
  if (status === "connected") return "Live"
  if (status === "disconnected") return "Disconnected"
  return "Connecting"
}

export default function NotificationPage() {
  const { data: session } = useSession()
  const user = session!.user
  const queryClient = useQueryClient()

  const notificationsQuery = useNotifications(user.id)
  const dismissMutation = useDismissNotification(user.id)
  const markReadMutation = useMarkNotificationRead(user.id)

  const notifications = notificationsQuery.data ?? []

  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting")
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setConnectionStatus("connecting")
    const es = new EventSource(`/api/notification/users/${user.id}/notifications/stream`)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnectionStatus("connected")
      retryCountRef.current = 0
    }

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        const items: Notification[] = parsed.result ?? parsed.data ?? []
        if (items.length > 0) {
          // Optimistically merge SSE items into the cache
          queryClient.setQueryData<Notification[]>(
            notificationKeys.user(user.id),
            (old) => {
              const existing = new Set((old ?? []).map((n) => n.id))
              const newItems = items.filter((n) => !existing.has(n.id))
              return [...newItems, ...(old ?? [])].slice(0, 50)
            },
          )
        }
      } catch {
        // ping or parse error - ignore
      }
    }

    es.onerror = () => {
      setConnectionStatus("disconnected")
      es.close()
      eventSourceRef.current = null

      const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000)
      retryCountRef.current += 1
      setTimeout(connectSSE, delay)
    }
  }, [user.id, queryClient])

  useEffect(() => {
    connectSSE()
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [connectSSE])

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        email={user.email}
        actions={
          <>
            <Badge variant={statusVariant(connectionStatus)}>
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${
                connectionStatus === "connected" ? "bg-current" :
                connectionStatus === "disconnected" ? "bg-current" :
                "bg-current animate-a-spin"
              }`} />
              {statusLabel(connectionStatus)}
            </Badge>
            <Link
              to="/notifications/preferences"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Preferences
            </Link>
            <Button variant="outline" size="sm" onClick={() => notificationsQuery.refetch()}>
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-2xl px-8 py-6">
        {notificationsQuery.isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} data-testid="skeleton-card" className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {notificationsQuery.isError && !notificationsQuery.isLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 border-2 border-destructive/30 text-destructive text-lg font-bold">
              !
            </div>
            <p className="text-muted-foreground">{notificationsQuery.error?.message ?? "Failed to load"}</p>
            <Button variant="outline" onClick={() => notificationsQuery.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <h2 className="text-sm font-semibold text-muted-foreground">No notifications</h2>
            <p className="text-sm text-muted-foreground/60">
              New notifications will appear here in real time.
            </p>
          </div>
        )}

        {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length > 0 && (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                data-testid="notification-card"
                data-read={n.read}
                className={`group rounded-xl px-4 py-3.5 transition-colors ${
                  n.read
                    ? "bg-surface opacity-70 hover:opacity-100"
                    : "bg-accent-subtle"
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.type === "info" ? "bg-primary" :
                      n.type === "warning" ? "bg-warning" :
                      "bg-error"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-0.5">
                      <h3 className={`text-sm ${n.read ? "font-medium" : "font-semibold"} text-foreground`}>
                        {n.title}
                      </h3>
                      <time className="shrink-0 text-xs text-muted-foreground/70 font-mono">
                        {new Date(n.timestamp).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <Button variant="ghost" size="xs" onClick={() => markReadMutation.mutate(n.id)}>
                          Mark read
                        </Button>
                      )}
                      <Button variant="ghost" size="xs" onClick={() => dismissMutation.mutate(n.id)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PageFooter
        left="Wave Notification Center"
        right={<span>{notifications.length} notifications</span>}
      />
    </>
  )
}
