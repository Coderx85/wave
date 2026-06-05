import { useSession } from "../lib/auth-client"

export default function ProfileSection() {
  const { data: session } = useSession()
  const user = session!.user
  const initial = user.name.charAt(0).toUpperCase()

  return (
    <div className="rounded-xl bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-semibold">
          {initial}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{user.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">User ID</span>
          <span className="text-xs font-mono text-muted-foreground">{user.id}</span>
        </div>
      </div>
    </div>
  )
}
