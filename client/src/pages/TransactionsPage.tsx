import { useState, useMemo, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table"
import { Search } from "lucide-react"
import { signOut, useSession } from "../lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Skeleton } from "../components/ui/skeleton"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"
import { useAccounts } from "@/lib/queries/accounts"
import { useTransactions } from "@/lib/queries/transactions"
import { getDirection } from "@/lib/direction"
import type { ITransaction } from "@/types"
import { formatCurrency } from "@/lib/utils"

type Filter = "all" | "success" | "failed" | "pending"

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))

export default function TransactionsPage() {
  const { data: session } = useSession()
  const user = session!.user

  const txQuery = useTransactions(user.id)
  const accountsQuery = useAccounts(user.id)

  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data])
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])

  const [filter, setFilter] = useState<Filter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])

  const columnHelper = createColumnHelper<ITransaction>()

  const userAccountNumbers = useMemo(() => new Set(accounts.map((a) => String(a.accountNumber))), [accounts])

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
          const dir = getDirection(row.original, userAccountNumbers)
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
          const dir = getDirection(tx, userAccountNumbers)
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
          const dir = getDirection(tx, userAccountNumbers)
          return (
            <span className={`text-sm font-mono font-semibold whitespace-nowrap ${
              dir === "in" ? "text-success" : "text-foreground"
            }`}>
              {dir === "in" ? "+" : dir === "out" ? "\u2212" : ""}{formatCurrency(tx.amount)}
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
    [columnHelper, userAccountNumbers],
  )

  const filtered = useMemo(() => {
    let result = transactions

    if (filter !== "all") {
      result = result.filter((tx) => tx.status === filter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (tx) =>
          tx.senderName.toLowerCase().includes(q) ||
          tx.receiverName.toLowerCase().includes(q) ||
          tx.senderAccountNumber.toString().includes(q) ||
          tx.receiverAccountNumber.toString().includes(q),
      )
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime()
      result = result.filter((tx) => new Date(tx.createdAt).getTime() >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000
      result = result.filter((tx) => new Date(tx.createdAt).getTime() <= to)
    }

    return result
  }, [transactions, filter, searchQuery, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = pageIndex * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [filter, searchQuery, dateFrom, dateTo])

  const table = useReactTable({
    data: paginated,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        email={user.email}
        actions={
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-4xl px-8 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[140px] text-sm"
            />
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[140px] text-sm"
            />
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm font-medium">
              {filter === "all" ? "All Transactions" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Transactions`}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{filtered.length} total</span>
          </CardHeader>
          <CardContent className="p-0">
            {txQuery.isLoading && (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            )}

            {txQuery.isError && (
              <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
                <p className="text-sm text-muted-foreground">{txQuery.error?.message ?? "Failed to load transactions"}</p>
                <Button variant="outline" size="sm" onClick={() => txQuery.refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {!txQuery.isLoading && !txQuery.isError && filtered.length === 0 && (
              <div className="py-10 text-center px-6">
                <p className="text-sm text-muted-foreground">
                  {transactions.length === 0
                    ? "No transactions yet. Deposit funds to get started."
                    : `No ${filter !== "all" ? filter : ""} transactions found.`}
                </p>
              </div>
            )}

            {!txQuery.isLoading && !txQuery.isError && filtered.length > 0 && (
              <>
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
                        <tr
                          key={row.id}
                          className="cursor-pointer transition-colors hover:bg-surface-hover"
                          onClick={() => window.location.href = `/transactions/${row.original.id}`}
                        >
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rows per page</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0) }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {[10, 25, 50, 100].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageIndex === 0}
                      onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                      className="h-8 px-2 text-xs"
                    >
                      Prev
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i)
                      .filter((i) => {
                        if (totalPages <= 7) return true
                        if (i === 0 || i === totalPages - 1) return true
                        if (Math.abs(i - pageIndex) <= 1) return true
                        return false
                      })
                      .map((i, idx, arr) => {
                        const showEllipsis = idx > 0 && i - arr[idx - 1] > 1
                        return (
                          <span key={i} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-xs text-muted-foreground">&hellip;</span>}
                            <Button
                              variant={i === pageIndex ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPageIndex(i)}
                              className="h-8 min-w-[28px] px-1 text-xs"
                            >
                              {i + 1}
                            </Button>
                          </span>
                        )
                      })}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageIndex >= totalPages - 1}
                      onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                      className="h-8 px-2 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <PageFooter
        right={
          <span>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
        }
      />
    </>
  )
}
