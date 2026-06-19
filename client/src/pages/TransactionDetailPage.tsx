import { useEffect, useState } from "react"
import { useParams, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useSession } from "../lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import { fetchTransactionsAction } from "@/actions/transaction.actions"
import { getLedgerEntries } from "@/actions/account.actions"
import type { ITransaction, ILedgerEntry } from "@/types"

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

export default function TransactionDetailPage() {
  const { data: session } = useSession()
  const user = session!.user
  const params = useParams({ from: "/transactions/$transactionId" })
  const transactionId = params.transactionId

  const [transaction, setTransaction] = useState<ITransaction | null>(null)
  const [accounts, setAccounts] = useState<Set<string>>(new Set())
  const [ledger, setLedger] = useState<ILedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getDirection = (tx: ITransaction): Direction => {
    if (tx.senderName === tx.receiverName) return "self"
    const senderIn = accounts.has(tx.senderAccountNumber.toString())
    const receiverIn = accounts.has(tx.receiverAccountNumber.toString())
    if (receiverIn && !senderIn) return "in"
    return "out"
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [txRes, accRes] = await Promise.all([
          fetchTransactionsAction(user.id),
          fetch("/api/wallet/users/" + user.id + "/accounts"),
        ])

        const accJson = await accRes.json()
        const accountIds = new Set<string>()
        if (accJson.ok && Array.isArray(accJson.data)) {
          accJson.data.forEach((a: { id: string }) => accountIds.add(a.id))
        }
        setAccounts(accountIds)

        if (!txRes.ok) throw new Error(txRes.error ?? "Failed to load transaction")
        const found = (txRes.data ?? []).find((tx) => tx.id === transactionId)
        if (!found) throw new Error("Transaction not found")
        setTransaction(found)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transaction")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id, transactionId])

  useEffect(() => {
    if (!transaction) return
    setLedgerLoading(true)
    getLedgerEntries(transactionId)
      .then((res) => {
        if (res.ok) setLedger(res.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLedgerLoading(false))
  }, [transaction, transactionId])

  const dir = transaction ? getDirection(transaction) : null

  const detailRow = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right font-mono break-all">{value}</span>
    </div>
  )

  return (
    <>
      <header className="flex items-center justify-between flex-wrap gap-3 px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/transactions"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to Transactions"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-foreground truncate max-w-[300px]">
            {loading ? <Skeleton className="h-6 w-40" /> : "Transaction Details"}
          </h1>
        </div>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-8 py-8 space-y-6">
        {loading && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link to="/transactions">
              <span className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium">Back to Transactions</span>
            </Link>
          </div>
        )}

        {!loading && !error && transaction && (
          <>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</p>
                    <p className={`text-3xl font-semibold font-mono tracking-tight ${
                      dir === "in" ? "text-success" : "text-foreground"
                    }`}>
                      {dir === "in" ? "+" : dir === "out" ? "\u2212" : ""}
                      {formatBalance(transaction.amount)}
                    </p>
                  </div>
                  <Badge
                    variant={transaction.status === "success" ? "default" : transaction.status === "failed" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {transaction.status}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-border/50 space-y-0">
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/30">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="text-sm font-medium text-foreground">{transaction.senderName}</p>
                      <p className="text-xs font-mono text-muted-foreground">{String(transaction.senderAccountNumber)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">To</p>
                      <p className="text-sm font-medium text-foreground">{transaction.receiverName}</p>
                      <p className="text-xs font-mono text-muted-foreground">{String(transaction.receiverAccountNumber)}</p>
                    </div>
                  </div>

                  {detailRow("Transaction ID", transaction.id)}
                  {detailRow("Created", formatDate(transaction.createdAt))}
                  {transaction.updatedAt && detailRow("Updated", formatDate(transaction.updatedAt))}
                  {detailRow("Type", dir === "self" ? "Deposit" : dir === "in" ? "Incoming Transfer" : "Outgoing Transfer")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ledger Entries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ledgerLoading && (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                )}
                {!ledgerLoading && ledger.length === 0 && (
                  <div className="py-8 text-center px-6">
                    <p className="text-sm text-muted-foreground">No ledger entries available.</p>
                  </div>
                )}
                {!ledgerLoading && ledger.length > 0 && (
                  <div className="divide-y divide-border/30">
                    {ledger.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.entryType === "debit" ? "bg-destructive" : "bg-success"
                          }`} />
                          <span className="text-sm font-medium text-foreground capitalize">{entry.entryType}</span>
                        </div>
                        <span className="text-sm font-mono text-foreground">{formatBalance(entry.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <footer className="flex justify-between items-center px-8 py-4 text-sm text-muted-foreground/70 border-t border-border">
        <span>Wave Payment Platform</span>
        {transaction && <span>ID: {transaction.id.slice(0, 8)}&hellip;</span>}
      </footer>
    </>
  )
}
