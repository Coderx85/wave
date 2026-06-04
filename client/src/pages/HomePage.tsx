import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "@tanstack/react-router"
import { Plus, ArrowUpRight } from "lucide-react"
import { signOut } from "../lib/auth-client"
import { useUser } from "../lib/user-context"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import SectionCards from "../components/SectionCards"
import ChartAreaInteractive from "../components/ChartAreaInteractive"
import DataTable from "../components/DataTable"
import type { TBankAccount, WaveResponse } from "@/types"

interface WalletTransaction {
  id: string
  userId: string
  senderAccountId: string
  senderName: string
  receiverAccountId: string
  receiverName: string
  amount: string
  status: "pending" | "success" | "failed"
  createdAt: string
  updatedAt?: string | null
}

type ApiResponse<T> = WaveResponse<T>

const formatBalance = (b: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(b)

export default function HomePage() {
  const user = useUser()
  const [accounts, setAccounts] = useState<TBankAccount[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  const userAccountIds = useMemo(() => new Set(accounts.map((a) => a.id)), [accounts])

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/wallet/users/${user.id}/accounts`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ApiResponse<TBankAccount[]> = await res.json()
      setAccounts(json.ok ? json.data : [])
    } catch {
      setAccounts([])
    } finally {
      setLoadingAccounts(false)
    }
  }, [user.id])

  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true)
    try {
      const res = await fetch(`/api/wallet/users/${user.id}/transactions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ApiResponse<WalletTransaction[]> = await res.json()
      if (json.ok) {
        const sorted = json.data.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setTransactions(sorted)
      }
    } catch {
      setTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchAccounts()
    fetchTransactions()
  }, [fetchAccounts, fetchTransactions])

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  const dailyVolumes = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      const day = tx.createdAt.slice(0, 10)
      map.set(day, (map.get(day) ?? 0) + Number(tx.amount))
    }
    return Array.from(map.entries())
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions])

  const recentTransactions = useMemo(() => transactions.slice(0, 10), [transactions])

  const successCount = transactions.filter((tx) => tx.status === "success").length
  const pendingCount = transactions.filter((tx) => tx.status === "pending").length
  const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)

  const cardData = loadingAccounts
    ? []
    : [
        {
          title: "Total Balance",
          value: formatBalance(totalBalance),
          subtitle: `${accounts.length} account${accounts.length !== 1 ? "s" : ""}`,
          trend: { value: `${accounts.length > 0 ? "+" : ""}${accounts.length}`, positive: accounts.length > 0 },
        },
        {
          title: "Transaction Volume",
          value: formatBalance(totalVolume),
          subtitle: `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`,
        },
        {
          title: "Success Rate",
          value: transactions.length > 0 ? `${Math.round((successCount / transactions.length) * 100)}%` : "\u2014",
          subtitle: `${successCount} of ${transactions.length} succeeded`,
          trend: successCount > 0 ? { value: `${successCount}`, positive: true } : undefined,
        },
        {
          title: "Pending",
          value: String(pendingCount),
          subtitle: pendingCount === 1 ? "1 awaiting confirmation" : `${pendingCount} awaiting confirmation`,
        },
      ]

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      <header className="flex items-center justify-between flex-wrap gap-3 px-8 py-5 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-8 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {new Date().getHours() < 12
              ? "Good morning"
              : new Date().getHours() < 18
                ? "Good afternoon"
                : "Good evening"
            }, {user.name}
          </h2>
        </div>

        <SectionCards data={cardData} />

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/account"
            search={{ section: "deposit" }}
            className="inline-flex items-center justify-center gap-3 rounded-xl bg-primary text-primary-foreground h-14 text-sm font-semibold transition-colors hover:opacity-90"
          >
            <Plus className="size-4" />
            Add Money
          </Link>
          <Link
            to="/account"
            className="inline-flex items-center justify-center gap-3 rounded-xl bg-surface text-foreground h-14 text-sm font-semibold transition-colors hover:bg-surface-hover border border-border"
          >
            <ArrowUpRight className="size-4" />
            Send Money
          </Link>
        </div>

        <ChartAreaInteractive data={dailyVolumes} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <Link
              to="/account/transactions"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={recentTransactions}
              userAccountIds={userAccountIds}
              loading={loadingTransactions}
              emptyMessage="No transactions yet. Deposit funds to get started."
            />
          </CardContent>
        </Card>
      </main>

      <footer className="flex justify-between items-center px-8 py-4 text-sm text-muted-foreground/70 border-t border-border">
        <span>Wave Payment Platform</span>
        <span>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
      </footer>
    </>
  )
}
