import { useState } from "react"
import { useSession } from "../lib/auth-client"
import { Check, Copy } from "lucide-react"

export default function ProfileSection() {
  const { data: session } = useSession()
  const user = session!.user
  const initial = user.name.charAt(0).toUpperCase()
  const [copied, setCopied] = useState(false)

  const copyId = async () => {
    await navigator.clipboard.writeText(user.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors duration-150 hover:bg-surface-hover group">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold transition-transform duration-150 group-hover:scale-105 motion-reduce:group-hover:scale-100">
            {initial}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" aria-label="Signed in" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{user.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={copyId}
        className="mt-4 pt-4 border-t border-border/50 w-full flex items-center justify-between text-left transition-colors duration-150 hover:text-foreground"
        aria-label={copied ? "User ID copied" : "Copy user ID"}
      >
        <span className="text-xs text-muted-foreground">User ID</span>
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">{user.id}</span>
          <span className="shrink-0 transition-all duration-150 motion-reduce:transition-none">
            {copied ? (
              <Check className="size-3 text-success" />
            ) : (
              <Copy className="size-3 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 motion-reduce:opacity-100 motion-reduce:translate-x-0" />
            )}
          </span>
        </span>
      </button>
    </div>
  )
}
