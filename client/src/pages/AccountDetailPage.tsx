import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, Link } from "@tanstack/react-router"
import { ArrowLeft, Eye, EyeOff, MoreVertical } from "lucide-react"
import { useSession } from "../lib/auth-client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu"
import { fetchAccountData } from "@/actions/account.actions"
import { fetchTransactionsAction } from "@/actions/transaction.actions"
import type { IWalletTransaction, ITransaction, WaveResponse } from "@/types"

const formatBalance = (b: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(b))

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))

type Direction = "in" | "out" | "self"

export default function AccountDetailPage() {
  const { data: session } = useSession()
  const user = session!.user
  const params = useParams({ from: "/account/$accountNumber" })
  const accountNumberParam = params.accountNumber

  const [accounts, setAccounts] = useState<IWalletTransaction[]>([])
  const [transactions, setTransactions] = useState<ITransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)

  const account = useMemo(
    () => accounts.find((a) => String(a.accountNumber) === accountNumberParam) ?? null,
    [accounts, accountNumberParam],
  )

  const getDirection = useCallback(
    (tx: ITransaction): Direction => {
      const txSender = String(tx.senderAccountNumber)
      const txReceiver = String(tx.receiverAccountNumber)
      if (txSender === txReceiver) return "self"
      if (txReceiver === accountNumberParam) return "in"
      if (txSender === accountNumberParam) return "out"
      return "out"
    },
    [accountNumberParam],
  )

  const accountTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        const sender = String(tx.senderAccountNumber)
        const receiver = String(tx.receiverAccountNumber)
        return sender === accountNumberParam || receiver === accountNumberParam
      }),
    [transactions, accountNumberParam],
  )

  const recentTransactions = useMemo(() => accountTransactions.slice(0, 10), [accountTransactions])

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchAccountData(user.id)
      if (!res.ok) {
        setError(res.error ?? "Failed to load account")
        return
      }
      setAccounts(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account")
    } finally {
      setLoading(false)
    }
  }, [user.id])

  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true)
    try {
      const res = await fetchTransactionsAction(user.id)
      if (res.ok) {
        const sorted = (res.data ?? []).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        setTransactions(sorted)
      }
    } catch {
      // silently fail for transactions
    } finally {
      setTransactionsLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchAccounts()
    fetchTransactions()
  }, [fetchAccounts, fetchTransactions])

  const pageTitle = account?.name ?? "Account Details"

  return (
    <>
      <header className="flex items-center justify-between flex-wrap gap-3 px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/account"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to Account"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-foreground truncate max-w-[300px]">
            {loading ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              pageTitle
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          {account && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => window.location.href = "/account/settings"}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = "/account/transactions"}>
                  All Transactions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-8 py-8 space-y-6">
        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAccounts}>
              Retry
            </Button>
          </div>
        )}

        {loading && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-56" />
            </CardContent>
          </Card>
        )}

        {!loading && !error && account && (
          <>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Current Balance
                    </p>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-3xl font-semibold font-mono tracking-tight transition-all duration-300 ${
                          !showBalance ? "blur-lg select-none" : ""
                        }`}
                        aria-hidden={!showBalance}
                      >
                        {formatBalance(account.balance)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowBalance((v) => !v)}
                        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={showBalance ? "Hide balance" : "Show balance"}
                      >
                        {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="text-sm font-mono text-foreground">
                      {String(account.accountNumber)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm text-foreground">
                      {formatDate(String(account.createdAt))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Account Name</p>
                    <p className="text-sm text-foreground">{account.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Monthly Volume</p>
                    <p className="text-sm text-foreground">
                      {formatBalance(accountTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/account"
                search={{ section: "deposit" }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground h-12 text-sm font-semibold transition-colors hover:opacity-90"
              >
                Add Money
              </Link>
              <Link
                to="/account"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface text-foreground h-12 text-sm font-semibold transition-colors hover:bg-surface-hover border border-border"
              >
                Send Money
              </Link>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-sm font-medium">
                  Recent Transactions
                </CardTitle>
                <Link
                  to="/account/transactions"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {transactionsLoading && (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-md" />
                    ))}
                  </div>
                )}

                {!transactionsLoading && recentTransactions.length === 0 && (
                  <div className="py-10 text-center px-6">
                    <p className="text-sm text-muted-foreground">
                      No transactions yet for this account.
                    </p>
                  </div>
                )}

                {!transactionsLoading && recentTransactions.length > 0 && (
                  <div className="divide-y divide-border/30">
                    {recentTransactions.map((tx) => {
                      const dir = getDirection(tx)
                      const amount = Number(tx.amount)
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-hover"
                        >
                          <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold bg-secondary text-secondary-foreground">
                            {dir === "in" ? "\u2190" : dir === "self" ? "\u21C4" : "\u2192"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {dir === "self"
                                ? "Deposit"
                                : dir === "in"
                                  ? `From ${tx.senderName}`
                                  : `To ${tx.receiverName}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-mono font-semibold whitespace-nowrap ${
                                dir === "in" ? "text-success" : "text-foreground"
                              }`}
                            >
                              {dir === "in" ? "+" : dir === "out" ? "\u2212" : ""}
                              {formatBalance(amount)}
                            </p>
                            <Badge
                              variant={
                                tx.status === "success"
                                  ? "default"
                                  : tx.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-[10px] px-1.5 py-0 mt-0.5"
                            >
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!loading && !error && !account && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Account not found.</p>
            <Link to="/account">
              <Button variant="outline" size="sm">
                Back to Accounts
              </Button>
            </Link>
          </div>
        )}
      </main>

      <footer className="flex justify-between items-center px-8 py-4 text-sm text-muted-foreground/70 border-t border-border">
        <span>Wave Payment Platform</span>
        <span>
          {accountTransactions.length} transaction{accountTransactions.length !== 1 ? "s" : ""}
        </span>
      </footer>
    </>
  )
}
