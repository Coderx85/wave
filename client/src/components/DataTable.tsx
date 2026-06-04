import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table"
import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"

interface Transaction {
  id: string
  senderName: string
  receiverName: string
  senderAccountId: string
  receiverAccountId: string
  amount: string
  status: "pending" | "success" | "failed"
  createdAt: string
}

interface DataTableProps {
  data: Transaction[]
  userAccountIds: Set<string>
  loading?: boolean
  emptyMessage?: string
}

const formatBalance = (b: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(b))

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))

type SortDir = "in" | "out" | "self"

export default function DataTable({ data, userAccountIds, loading, emptyMessage }: DataTableProps) {
  const columnHelper = createColumnHelper<Transaction>()

  const getDirection = (tx: Transaction): SortDir => {
    if (tx.senderName === tx.receiverName) return "self"
    if (userAccountIds.has(tx.receiverAccountId) && !userAccountIds.has(tx.senderAccountId)) return "in"
    return "out"
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("createdAt", {
        header: "Date",
        cell: (info) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(info.getValue())}
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
              dir === "in" ? "text-success" : dir === "out" ? "text-foreground" : "text-foreground"
            }`}>
              {dir === "in" ? "+" : dir === "out" ? "\u2212" : ""}{formatBalance(tx.amount)}
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
    [userAccountIds],
  )

  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage ?? "No transactions yet."}</p>
      </div>
    )
  }

  return (
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
                <td key={cell.id} className="px-4 py-3 border-b border-border/30 last:border-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


