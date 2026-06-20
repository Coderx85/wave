import { useState, useMemo } from "react"
import { ArrowDownLeft, ArrowUpRight, Plus, CreditCard, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./ui/skeleton"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { formatCurrency } from "@/lib/utils"
import type { IWalletTransaction, ITransaction, TBankAccountNumber } from "@/types"

const PAGE_SIZE = 25

type TimelineEventType = "deposit" | "transfer_incoming" | "transfer_outgoing" | "account_created"

interface TimelineEvent {
  id: string
  type: TimelineEventType
  description: string
  amount: string
  status?: string
  timestamp: string
  href: string
}

function eventIcon(type: TimelineEventType) {
  switch (type) {
    case "transfer_incoming":
      return <ArrowDownLeft className="size-4" />
    case "transfer_outgoing":
      return <ArrowUpRight className="size-4" />
    case "deposit":
      return <Plus className="size-4" />
    case "account_created":
      return <CreditCard className="size-4" />
  }
}

function eventColor(type: TimelineEventType): string {
  switch (type) {
    case "transfer_incoming":
      return "bg-accent-subtle text-success"
    case "transfer_outgoing":
      return "bg-muted text-muted-foreground"
    case "deposit":
      return "bg-accent-subtle text-success"
    case "account_created":
      return "bg-secondary text-secondary-foreground"
  }
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (dateStr === todayStr) return "Today"
  if (dateStr === yesterdayStr) return "Yesterday"
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "success") return "default"
  if (status === "failed") return "destructive"
  return "secondary"
}

function buildEvents(
  transactions: ITransaction[],
  accounts: IWalletTransaction[],
  userAccountNumbers: Set<string>
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const tx of transactions) {
    const senderStr = String(tx.senderAccountNumber)
    const receiverStr = String(tx.receiverAccountNumber)
    const isSender = userAccountNumbers.has(senderStr)
    const isReceiver = userAccountNumbers.has(receiverStr)

    let type: TimelineEventType
    let description: string

    if (senderStr === receiverStr) {
      type = "deposit"
      description = "Deposit"
    } else if (isSender) {
      type = "transfer_outgoing"
      description = `To ${tx.receiverName}`
    } else if (isReceiver) {
      type = "transfer_incoming"
      description = `From ${tx.senderName}`
    } else {
      type = "transfer_outgoing"
      description = `To ${tx.receiverName}`
    }

    events.push({
      id: `tx-${tx.id}`,
      type,
      description,
      amount: tx.amount,
      status: tx.status,
      timestamp: tx.createdAt,
      href: `/transactions/${tx.id}`,
    })
  }

  for (const acc of accounts) {
    events.push({
      id: `acct-${acc.id}`,
      type: "account_created",
      description: `${acc.name} created`,
      amount: "",
      timestamp: acc.createdAt instanceof Date ? acc.createdAt.toISOString() : String(acc.createdAt),
      href: `/account/${acc.accountNumber}`,
    })
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return events
}

function groupByDay(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const groups = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const day = event.timestamp.slice(0, 10)
    const existing = groups.get(day)
    if (existing) {
      existing.push(event)
    } else {
      groups.set(day, [event])
    }
  }
  return groups
}

interface ActivityTimelineProps {
  transactions: ITransaction[]
  accounts: IWalletTransaction[]
  userAccountNumbers: Set<string>
  loading: boolean
  error: string | null
  onRetry: () => void
}

export default function ActivityTimeline({
  transactions,
  accounts,
  userAccountNumbers,
  loading,
  error,
  onRetry,
}: ActivityTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const events = useMemo(
    () => buildEvents(transactions, accounts, userAccountNumbers),
    [transactions, accounts, userAccountNumbers]
  )

  const dayGroups = useMemo(() => groupByDay(events), [events])

  const flatEvents = useMemo(() => {
    const result: { day: string; event: TimelineEvent }[] = []
    for (const [day, dayEvents] of dayGroups) {
      for (const event of dayEvents) {
        result.push({ day, event })
      }
    }
    return result
  }, [dayGroups])

  const visibleEvents = flatEvents.slice(0, visibleCount)
  const hasMore = flatEvents.length > visibleCount

  if (loading) {
    return (
      <div className="space-y-1">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-3">
          <Skeleton className="h-5 w-24" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    )
  }

  let lastDay = ""

  return (
    <div>
      {visibleEvents.map(({ day, event }) => {
        const showDayHeader = day !== lastDay
        lastDay = day

        return (
          <div key={event.id}>
            {showDayHeader && (
              <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {dayLabel(day)}
                </p>
              </div>
            )}
            <a
              href={event.href}
              className={cn(
                "flex items-center gap-3 px-2 py-3 rounded-lg transition-colors",
                "hover:bg-surface-hover cursor-pointer -mx-2"
              )}
            >
              <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0", eventColor(event.type))}>
                {eventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{event.description}</p>
                <p className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {event.amount && (
                  <span className="font-mono text-sm font-semibold whitespace-nowrap tabular-nums">
                    {formatCurrency(event.amount)}
                  </span>
                )}
                {event.status && (
                  <Badge variant={statusBadgeVariant(event.status)} className="text-[10px] px-1.5 py-0">
                    {event.status}
                  </Badge>
                )}
              </div>
            </a>
          </div>
        )
      })}

      {hasMore && (
        <div className="flex justify-center pt-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            <ChevronDown className="size-4 mr-1" />
            Show more
          </Button>
        </div>
      )}
    </div>
  )
}
