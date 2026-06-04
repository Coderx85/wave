import { Skeleton } from "./ui/skeleton"

interface SectionCardData {
  title: string
  value: string
  subtitle: string
  trend?: { value: string; positive: boolean }
}

function SectionCard({ title, value, subtitle, trend }: SectionCardData) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-foreground">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? "text-success" : "text-destructive"}`}>
            {trend.positive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>
    </div>
  )
}

export default function SectionCards({ data }: { data: SectionCardData[] }) {
  if (data.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-28 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((card, i) => (
        <SectionCard key={i} {...card} />
      ))}
    </div>
  )
}
