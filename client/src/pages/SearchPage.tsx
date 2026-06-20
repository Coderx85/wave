import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { Search, X } from "lucide-react"
import { signOut, useSession } from "../lib/auth-client"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"
import { formatCurrency } from "@/lib/utils"
import type { IWalletTransaction, WaveResponse, ITransaction, TBankAccountNumber } from "@/types"

type ResourceType = "transaction" | "account" | "notification"

interface SearchResult {
  id: string
  type: ResourceType
  title: string
  subtitle: string
  href: string
  amount?: string
  timestamp: string
  status?: string
}

interface RawNotification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "error"
  timestamp: string
  read: boolean
}

const TABS: { key: ResourceType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "transaction", label: "Transactions" },
  { key: "account", label: "Accounts" },
  { key: "notification", label: "Notifications" },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function typeBadgeVariant(type: ResourceType): "default" | "secondary" | "outline" {
  switch (type) {
    case "transaction": return "default"
    case "account": return "secondary"
    case "notification": return "outline"
  }
}

function typeLabel(type: ResourceType): string {
  switch (type) {
    case "transaction": return "Transaction"
    case "account": return "Account"
    case "notification": return "Notification"
  }
}

export default function SearchPage() {
  const { data: session } = useSession()
  const user = session!.user

  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<ResourceType | "all">("all")
  const inputRef = useRef<HTMLInputElement>(null)

  const [transactions, setTransactions] = useState<ITransaction[]>([])
  const [accounts, setAccounts] = useState<IWalletTransaction[]>([])
  const [notifications, setNotifications] = useState<RawNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [txRes, acctRes, notifRes] = await Promise.all([
        fetch(`/api/wallet/users/${user.id}/transactions`),
        fetch(`/api/wallet/users/${user.id}/accounts`),
        fetch(`/api/notification/users/${user.id}/notifications?limit=100`),
      ])

      const [txJson, acctJson, notifJson]: [
        WaveResponse<ITransaction[]>,
        WaveResponse<IWalletTransaction[]>,
        { ok: boolean; data?: RawNotification[] }
      ] = await Promise.all([
        txRes.json(),
        acctRes.json(),
        notifRes.json(),
      ])

      if (txJson.ok) setTransactions(txJson.data)
      if (acctJson.ok) setAccounts(acctJson.data)
      if (notifJson.ok) setNotifications(notifJson.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items: SearchResult[] = []

    if (!q) return items

    for (const tx of transactions) {
      const senderStr = String(tx.senderAccountNumber)
      const receiverStr = String(tx.receiverAccountNumber)
      const searchable = [
        tx.senderName.toLowerCase(),
        tx.receiverName.toLowerCase(),
        senderStr,
        receiverStr,
        tx.amount,
        tx.status,
      ]
      if (!searchable.some((s) => s.includes(q))) continue

      items.push({
        id: `tx-${tx.id}`,
        type: "transaction",
        title: tx.senderName === tx.receiverName
          ? "Deposit"
          : `To ${tx.receiverName}`,
        subtitle: tx.senderName === tx.receiverName
          ? `From ${tx.senderName}`
          : `From ${tx.senderName}`,
        amount: tx.amount,
        status: tx.status,
        timestamp: tx.createdAt,
        href: `/transactions/${tx.id}`,
      })
    }

    for (const acct of accounts) {
      const searchable = [
        acct.name.toLowerCase(),
        String(acct.accountNumber),
        String(acct.balance),
      ]
      if (!searchable.some((s) => s.includes(q))) continue

      items.push({
        id: `acct-${acct.id}`,
        type: "account",
        title: acct.name,
        subtitle: `Account ${acct.accountNumber}`,
        amount: String(acct.balance),
        timestamp: acct.createdAt instanceof Date
          ? acct.createdAt.toISOString()
          : String(acct.createdAt),
        href: `/account/${acct.accountNumber}`,
      })
    }

    for (const notif of notifications) {
      const searchable = [
        notif.title.toLowerCase(),
        notif.message.toLowerCase(),
      ]
      if (!searchable.some((s) => s.includes(q))) continue

      items.push({
        id: `notif-${notif.id}`,
        type: "notification",
        title: notif.title,
        subtitle: notif.message,
        timestamp: notif.timestamp,
        href: "/notifications",
      })
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return items
  }, [query, transactions, accounts, notifications])

  const filteredResults = useMemo(() => {
    if (activeTab === "all") return results
    return results.filter((r) => r.type === activeTab)
  }, [results, activeTab])

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      <PageHeader
        title="Search"
        email={user.email}
        actions={
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-3xl px-8 py-8 space-y-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder="Search transactions, accounts, notifications..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 h-12 text-sm rounded-md"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && query && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {TABS.map((tab) => {
                const count = tab.key === "all"
                  ? results.length
                  : results.filter((r) => r.type === tab.key).length
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeTab === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>

            {filteredResults.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-sm text-muted-foreground">No results found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
                </p>
                <div className="divide-y divide-border/30">
                  {filteredResults.map((result) => (
                    <a
                      key={result.id}
                      href={result.href}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-surface-hover -mx-3"
                    >
                      <Badge variant={typeBadgeVariant(result.type)} className="shrink-0 text-[10px] px-1.5 py-0">
                        {typeLabel(result.type)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {result.amount && (
                          <p className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums">
                            {formatCurrency(result.amount)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">{formatDate(result.timestamp)}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && !query && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Search across your transactions, accounts, and notifications
            </p>
          </div>
        )}
      </main>

      <PageFooter />
    </>
  )
}
