import { useEffect, useState, useCallback, useMemo } from "react"
import { Link } from "@tanstack/react-router"
import { Plus, ArrowUpRight } from "lucide-react"
import { signOut, useSession } from "../lib/auth-client"
import { Button } from "../components/ui/button"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"
import SectionCards from "../components/SectionCards"
import ActivityTimeline from "../components/ActivityTimeline"
import type { IWalletTransaction, WaveResponse, ITransaction } from "@/types"
import { formatCurrency } from "@/lib/utils"

export default function HomePage() {
  const { data: session } = useSession()
  const user = session!.user
  const [accounts, setAccounts] = useState<IWalletTransaction[]>([])
  const [transactions, setTransactions] = useState<ITransaction[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  const userAccountNumbers = useMemo(() => new Set(accounts.map((a) => String(a.accountNumber))), [accounts])

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/wallet/users/${user.id}/accounts`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: WaveResponse<IWalletTransaction[]> = await res.json()
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
      const json: WaveResponse<ITransaction[]> = await res.json()
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

  const successCount = transactions.filter((tx) => tx.status === "success").length
  const pendingCount = transactions.filter((tx) => tx.status === "pending").length
  const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0)

  const cardData = loadingAccounts
    ? []
    : [
        {
          title: "Total Balance",
          value: formatCurrency(totalBalance),
          subtitle: `${accounts.length} account${accounts.length !== 1 ? "s" : ""}`,
          trend: { value: `${accounts.length > 0 ? "+" : ""}${accounts.length}`, positive: accounts.length > 0 },
        },
        {
          title: "Transaction Volume",
          value: formatCurrency(totalVolume),
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
      <PageHeader
        title="Dashboard"
        email={user.email}
        actions={
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        }
      />

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
            className="inline-flex items-center justify-center gap-3 rounded-md bg-primary text-primary-foreground h-14 text-sm font-semibold transition-colors hover:opacity-90"
          >
            <Plus className="size-4" />
            Add Money
          </Link>
          <Link
            to="/account?section=transfer"
            className="inline-flex items-center justify-center gap-3 rounded-md bg-surface text-foreground h-14 text-sm font-semibold transition-colors hover:bg-surface-hover border border-border"
          >
            <ArrowUpRight className="size-4" />
            Send Money
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-medium text-foreground mb-1">Activity</h2>
          <ActivityTimeline
            transactions={transactions}
            accounts={accounts}
            userAccountNumbers={userAccountNumbers}
            loading={loadingTransactions}
            error={null}
            onRetry={fetchTransactions}
          />
        </div>
      </main>

      <PageFooter
        right={
          <span>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
        }
      />
    </>
  )
}
