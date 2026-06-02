import { useEffect, useState, useRef, useCallback } from "react"
import { signOut } from "../lib/auth-client"
import type { Session } from "../lib/auth-client"
import "./NotificationPage.css"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "error"
  timestamp: string
  read: boolean
}

interface StandardResponse<T> {
  ok: boolean
  status: number
  message: string
  data?: T
  error?: string
}

export default function NotificationPage({ user }: { user: Session["user"] }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting")
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notification/users/${user.id}/notifications?limit=50`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const json: StandardResponse<Notification[]> = await response.json()
      setNotifications(json.data ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user.id])

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
          setNotifications((prev) => {
            const existing = new Set(prev.map((n) => n.id))
            const newItems = items.filter((n) => !existing.has(n.id))
            return [...newItems, ...prev].slice(0, 50)
          })
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
  }, [user.id])

  useEffect(() => {
    fetchInitial()
    connectSSE()
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [fetchInitial, connectSSE])

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      <header className="page-header">
        <div className="header-left">
          <h1 className="page-title">Notifications</h1>
        </div>
        <div className="header-right">
          <span className={`status-badge status-${connectionStatus}`}>
            {connectionStatus === "connected" ? "Live" :
             connectionStatus === "disconnected" ? "Disconnected" : "Connecting"}
          </span>
          <div className="user-menu">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="btn btn-sm" onClick={fetchInitial}>
            Refresh
          </button>
          <button className="btn btn-sm btn-signout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="notification-main">
        {loading && (
          <div className="loading-state">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="error-state">
            <div className="error-icon" />
            <p>{error}</p>
            <button className="btn" onClick={fetchInitial}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="empty-state">
            <h2>No notifications</h2>
            <p>New notifications will appear here in real time.</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="notification-list">
            {notifications.map((n) => (
              <article
                key={n.id}
                className={`notification-card ${n.read ? "is-read" : "is-unread"}`}
              >
                <div className={`card-icon card-icon--${n.type}`} />
                <div className="card-body">
                  <div className="card-header">
                    <h3 className="card-title">{n.title}</h3>
                    <time className="card-time">
                      {new Date(n.timestamp).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="card-message">{n.message}</p>
                  <div className="card-actions">
                    {!n.read && (
                      <button className="btn btn-ghost btn-xs" onClick={() => markRead(n.id)}>
                        Mark read
                      </button>
                    )}
                    <button className="btn btn-ghost btn-xs" onClick={() => dismissNotification(n.id)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="page-footer">
        <span>Wave Notification Center</span>
        <span className="footer-count">{notifications.length} notifications</span>
      </footer>
    </>
  )
}