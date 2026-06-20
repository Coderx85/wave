interface ProcessingOverlayProps {
  amount: string
  description: string
  label: string
}

export default function ProcessingOverlay({ amount, description, label }: ProcessingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card p-6 text-center space-y-3 max-w-sm w-full mx-4 rounded-xl border border-border">
        <div className="flex justify-center">
          <span className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-a-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-mono font-bold text-foreground tracking-tight">{amount}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <p className="text-xs text-muted-foreground/70">{label}</p>
      </div>
    </div>
  )
}
