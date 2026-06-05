import { useEffect, useState, useMemo, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowLeft } from "lucide-react"
import { useSession } from "../lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import { fetchTransactionsAction } from "@/actions/transaction.actions"
import type { ITransaction, IWalletTransaction, WaveResponse } from "@/types"
import { fetchAccountTransactionsAction } from "@/actions/account.actions"

type Filter = "all" | "success" | "failed" | "pending"

const formatBalance = (balance: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(balance)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))

export default function AccountTransactionsPage() {
  const { data: session } = useSession()
  const user = session!.user
  const [transactions, setTransactions] = useState<ITransaction[]>([])
  const [accounts, setAccounts] = useState<IWalletTransaction[]>([])
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])

  const columnHelper = createColumnHelper<ITransaction>()

  const userAccountIds = useMemo(() => new Set(accounts.map((a) => a.id)), [accounts])

  const getDirection = useCallback(
    (tx: ITransaction): "in" | "out" | "self" => {
      if (tx.senderName === tx.receiverName) return "self"
      if (userAccountIds.has(tx.senderAccountNumber.toString())) return "in"
      if (userAccountIds.has(tx.receiverAccountNumber.toString())) return "in"
      return "out"
    },
    [userAccountIds],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor("createdAt", {
        header: "Date",
        cell: (info) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(info.getValue().toString())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "direction",
        header: "",
        cell: ({ row }) => {
          const dir = getDirection(row.original)
          return (
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold bg-secondary text-secondary-foreground">
              {dir === "in" ? "\u2190" : dir === "self" ? "\u21C4" : "\u2192"}
            </div>
          )
        },
      }),
      columnHelper.accessor("senderName", {
        header: "Counterparty",
        cell: (info) => {
          const tx = info.row.original
          const dir = getDirection(tx)
          const label = dir === "self" ? "Deposit" : dir === "in" ? `From ${tx.senderName}` : `To ${tx.receiverName}`
          return (
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{label}</p>
            </div>
          )
        },
      }),
      columnHelper.accessor("amount", {
        header: "Amount",
        cell: (info) => {
          const tx = info.row.original
          const dir = getDirection(tx)
          return (
            <span className={`text-sm font-mono font-semibold whitespace-nowrap ${
              dir === "in" ? "text-success" : "text-foreground"
            }`}>
              {dir === "in" ? "+" : dir === "out" ? "\u2212" : ""}{formatBalance(Number(tx.amount))}
            </span>
          )
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge
            variant={info.getValue() === "success" ? "default" : info.getValue() === "failed" ? "destructive" : "secondary"}
            className="text-[10px] px-1.5 py-0 whitespace-nowrap"
          >
            {info.getValue()}
          </Badge>
        ),
      }),
    ],
    [columnHelper, getDirection],
  )

  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((tx) => tx.status === filter)),
    [transactions, filter],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTransactionsAction(user.id);
      if (!res.ok) throw new Error(res.error ?? `HTTP ${res.status}`)

      const sorted = (res.data ?? []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setTransactions(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions")
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [user.id])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetchAccountTransactionsAction(user.id); 
      if (!res.ok) {
        throw new Error(res.error ?? `HTTP ${res.status}`)
      };

      setAccounts(res.data)
    } catch (error) {
      console.error("Error fetching account data:", error)
      setAccounts([])
    } finally {
      setAccountsLoaded(true)
    }
  }, [user.id])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (accountsLoaded) fetchTransactions()
  }, [user.id, accountsLoaded])

  return (
    <>
      <header className="flex items-center justify-between flex-wrap gap-3 px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <a
            href="/account"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to Account"
          >
            <ArrowLeft className="size-4" />
          </a>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Transactions</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-8 py-8 space-y-6">
        <div className="flex items-center gap-2">
          {(["all", "success", "pending", "failed"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium">
              {filter === "all" ? "All Transactions" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Transactions`}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{filtered.length} total</span>
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchTransactions}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="py-10 text-center px-6">
                <p className="text-sm text-muted-foreground">
                  {transactions.length === 0
                    ? "No transactions yet. Deposit funds to get started."
                    : `No ${filter !== "all" ? filter : ""} transactions found.`}
                </p>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b border-border/50">
                        {hg.headers.map((header) => (
                          <th
                            key={header.id}
                            className="text-left text-xs font-medium text-muted-foreground px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: " \u25B2",
                                desc: " \u25BC",
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-surface-hover">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3.5 border-b border-border/30 last:border-0">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="flex justify-between items-center px-8 py-4 text-sm text-muted-foreground/70 border-t border-border">
        <span>Wave Payment Platform</span>
        <span>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
      </footer>
    </>
  )
}
