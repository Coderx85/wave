import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"

interface DailyVolume {
  date: string
  volume: number
}

const periods = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
] as const

export default function ChartAreaInteractive({ data }: { data: DailyVolume[] }) {
  const [period, setPeriod] = useState<string>("30d")

  const filtered = useMemo(() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
    return data.slice(-days)
  }, [data, period])

  const maxVolume = Math.max(...filtered.map((d) => d.volume), 1)

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getLabel = (value: string) => periods.find((p) => p.value === value)?.label ?? ""

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Transaction Volume</CardTitle>
          <CardDescription>Daily transaction volume for {getLabel(period)}</CardDescription>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {periods.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="flex items-end gap-[2px] h-44 sm:h-56 pt-2">
          {filtered.map((d, i) => {
            const height = (d.volume / maxVolume) * 100
            return (
              <div
                key={d.date}
                className="relative flex-1 group"
              >
                <div
                  className="w-full rounded-t-[3px] bg-primary/70 hover:bg-primary transition-colors cursor-pointer"
                  style={{ height: `${Math.max(height, 1)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                    ${d.volume.toLocaleString()}
                  </div>
                </div>
                {(filtered.length <= 14 || i % Math.ceil(filtered.length / 10) === 0 || i === filtered.length - 1) && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground text-center truncate">
                    {formatDate(d.date)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-44 sm:h-56">
            <p className="text-sm text-muted-foreground">No transaction data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
