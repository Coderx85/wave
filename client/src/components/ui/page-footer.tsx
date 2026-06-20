import type { ReactNode } from "react"

interface PageFooterProps {
  left?: ReactNode
  right?: ReactNode
}

export default function PageFooter({ left, right }: PageFooterProps) {
  return (
    <footer className="flex justify-between items-center px-8 py-4 text-sm text-muted-foreground/70 border-t border-border">
      <span>{left ?? "Wave Payment Platform"}</span>
      {right}
    </footer>
  )
}
