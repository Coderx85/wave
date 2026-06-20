import { Button } from "./button"

interface TransactionSuccessProps {
  title: string
  amount: string
  description: string
  actionLabel: string
  onReset: () => void
}

export default function TransactionSuccess({ title, amount, description, actionLabel, onReset }: TransactionSuccessProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-success/15 p-5 text-center space-y-1">
        <p className="text-sm font-semibold text-success">{title}</p>
        <p className="text-lg font-mono font-bold text-foreground">{amount}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={onReset}>
        {actionLabel}
      </Button>
    </div>
  )
}
