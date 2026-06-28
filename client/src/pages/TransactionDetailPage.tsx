import { useMemo } from "react"
import { useParams, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useSession } from "../lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Skeleton } from "../components/ui/skeleton"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"
import { useAccounts } from "@/lib/queries/accounts"
import { useTransactions } from "@/lib/queries/transactions"
import { useLedgerEntries } from "@/lib/queries/ledger"
import { getDirection } from "@/lib/direction"
import { formatCurrency } from "@/lib/utils"

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))

export default function TransactionDetailPage() {
  const { data: session } = useSession()
  const user = session!.user
  const params = useParams({ from: "/transactions/$transactionId" })
  const transactionId = params.transactionId

  const txQuery = useTransactions(user.id)
  const accountsQuery = useAccounts(user.id)

  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data])
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])

  const transaction = useMemo(
    () => transactions.find((tx) => tx.id === transactionId) ?? null,
    [transactions, transactionId],
  )

  const userAccountNumbers = useMemo(() => new Set(accounts.map((a) => String(a.accountNumber))), [accounts])

  const ledgerQuery = useLedgerEntries(transactionId)
  const ledger = useMemo(() => ledgerQuery.data ?? [], [ledgerQuery.data])

  const dir = transaction ? getDirection(transaction, userAccountNumbers) : null

  const loading = txQuery.isLoading || accountsQuery.isLoading
  const error = txQuery.error ?? accountsQuery.error

  const detailRow = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right font-mono break-all">{value}</span>
    </div>
  )

  return (
    <>
      <PageHeader
        title={loading ? <Skeleton className="h-6 w-40" /> : "Transaction Details"}
        email={user.email}
        beforeTitle={
          <Link
            to="/transactions"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to Transactions"
          >
            <ArrowLeft className="size-4" />
          </Link>
        }
      />

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
            <p className="text-sm text-muted-foreground">{error.message ?? "Failed to load transaction"}</p>
            <Link to="/transactions">
              <Button variant="default" size="sm">Back to Transactions</Button>
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
                    <p className={`text-2xl font-semibold font-mono tracking-tight ${
                      dir === "in" ? "text-success" : "text-foreground"
                    }`}>
                      {dir === "in" ? "+" : dir === "out" ? "\u2212" : ""}
                      {formatCurrency(transaction.amount)}
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
                {ledgerQuery.isLoading && (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                )}
                {!ledgerQuery.isLoading && ledger.length === 0 && (
                  <div className="py-8 text-center px-6">
                    <p className="text-sm text-muted-foreground">No ledger entries available.</p>
                  </div>
                )}
                {!ledgerQuery.isLoading && ledger.length > 0 && (
                  <div className="divide-y divide-border/30">
                    {ledger.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.entryType === "debit" ? "bg-destructive" : "bg-success"
                          }`} />
                          <span className="text-sm font-medium text-foreground capitalize">{entry.entryType}</span>
                        </div>
                        <span className="text-sm font-mono font-semibold text-foreground">{formatCurrency(entry.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <PageFooter
        right={transaction && <span>ID: {transaction.id.slice(0, 8)}&hellip;</span>}
      />
    </>
  )
}
