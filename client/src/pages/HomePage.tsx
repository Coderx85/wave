import { useEffect, useState, useCallback } from "react"
import { Link } from "@tanstack/react-router"
import { signOut } from "../lib/auth-client"
import { useUser } from "../lib/user-context"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"

interface WalletAccount {
  id: string
  name: string
  userId: string
  accountNumber: string
  balance: number
  createdAt: string
  updatedAt: string | null
}

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

interface StandardResponse<T = unknown> {
  ok: boolean
  status: number
  message: string
  data?: T
  error?: string
}

export default function HomePage() {
  const user = useUser()
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/wallet/users/${user.id}/accounts`)
      if (res.ok) {
        const json: StandardResponse<WalletAccount[]> = await res.json()
        setAccounts(json.data ?? [])
      }
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
      if (res.ok) {
        const json: StandardResponse<WalletTransaction[]> = await res.json()
        const sorted = (json.data ?? []).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setTransactions(sorted.slice(0, 5))
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

  const formatBalance = (balance: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(balance)

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))

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

      <main className="flex-1 mx-auto w-full max-w-3xl px-8 py-8 space-y-8">
        <section className="space-y-1">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{user.name}</h2>
        </section>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAccounts ? (
              <Skeleton className="h-10 w-48 rounded-md" />
            ) : (
              <p className="text-3xl font-bold font-mono text-foreground tracking-tight">
                {formatBalance(totalBalance)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/account"
            search={{ section: "deposit" }}
            className="inline-flex items-center justify-center rounded-xl bg-surface text-foreground h-20 text-sm font-semibold flex-col gap-1.5 transition-colors hover:bg-surface-hover"
          >
            <span className="text-lg leading-none">+</span>
            <span>Add Money</span>
          </Link>
          <Link
            to="/account"
            className="inline-flex items-center justify-center rounded-xl bg-surface text-foreground h-20 text-sm font-semibold flex-col gap-1.5 transition-colors hover:bg-surface-hover"
          >
            <span className="text-lg leading-none">&uarr;</span>
            <span>Send Money</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Link
              to="/transactions"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loadingTransactions && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            )}

            {!loadingTransactions && transactions.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No transactions yet.</p>
                <Link
                  to="/transactions"
                  className="text-sm font-medium text-primary hover:text-accent-hover transition-colors mt-1 inline-block"
                >
                  View all activity
                </Link>
              </div>
            )}

            {!loadingTransactions && transactions.length > 0 && (
              <div className="divide-y divide-border/50">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {tx.senderName === tx.receiverName
                          ? "Deposit"
                          : `To ${tx.receiverName}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-semibold text-foreground">
                        {formatBalance(Number(tx.amount))}
                      </span>
                      <Badge
                        variant={tx.status === "success" ? "default" : tx.status === "failed" ? "destructive" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Link
            to="/notifications"
            className="inline-flex items-center justify-center rounded-xl bg-surface text-foreground h-14 text-sm font-medium transition-colors hover:bg-surface-hover"
          >
            Notifications
          </Link>
          <Link
            to="/transactions"
            className="inline-flex items-center justify-center rounded-xl bg-surface text-foreground h-14 text-sm font-medium transition-colors hover:bg-surface-hover"
          >
            Transactions
          </Link>
          <Link
            to="/account"
            className="inline-flex items-center justify-center rounded-xl bg-surface text-foreground h-14 text-sm font-medium transition-colors hover:bg-surface-hover"
          >
            Account
          </Link>
        </div>
      </main>

      <footer className="flex justify-between items-center px-8 py-4 text-sm text-muted-foreground/70 border-t border-border">
        <span>Wave Payment Platform</span>
        <span>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
      </footer>
    </>
  )
}
