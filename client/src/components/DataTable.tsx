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
import { formatCurrency } from "../lib/utils"
import { getDirection } from "@/lib/direction"
import type { ITransaction } from "@/types"

interface DataTableProps {
  data: ITransaction[]
  userAccountNumbers: Set<string>
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (tx: ITransaction) => void
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))

export default function DataTable({ data, userAccountNumbers, loading, emptyMessage, onRowClick }: DataTableProps) {
  const columnHelper = createColumnHelper<ITransaction>()

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
              dir === "in" ? "text-success" : dir === "out" ? "text-foreground" : "text-foreground"
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
            <tr
              key={row.id}
              className={`transition-colors ${onRowClick ? "cursor-pointer hover:bg-surface-hover" : "hover:bg-surface-hover"}`}
              onClick={() => onRowClick?.(row.original)}
            >
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
