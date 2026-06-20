import type { ReactNode } from "react"

interface PageHeaderProps {
  title: ReactNode
  email: string
  beforeTitle?: ReactNode
  actions?: ReactNode
}

export default function PageHeader({ title, email, beforeTitle, actions }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between flex-wrap gap-3 px-8 py-5 border-b border-border">
      <div className="flex items-center gap-3">
        {beforeTitle}
        <h1 className="text-xl font-semibold tracking-tight text-foreground text-balance">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{email}</span>
        {actions}
      </div>
    </header>
  )
}
