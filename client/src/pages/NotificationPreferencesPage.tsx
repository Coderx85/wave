import { useSession } from "../lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Skeleton } from "../components/ui/skeleton"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"
import { useNotificationPrefs, useTogglePreference } from "@/lib/queries/notificationPrefs"

const EVENT_LABELS: Record<string, string> = {
  deposit: "Deposits",
  transfer_incoming: "Money Received",
  transfer_outgoing: "Money Sent",
}

const EVENT_DESCRIPTIONS: Record<string, string> = {
  deposit: "When money is added to your account",
  transfer_incoming: "When someone sends you money",
  transfer_outgoing: "When you send money to someone",
}

export default function NotificationPreferencesPage() {
  const { data: session } = useSession()
  const user = session!.user

  const prefsQuery = useNotificationPrefs(user.id)
  const toggleMutation = useTogglePreference(user.id)

  const preferences = prefsQuery.data ?? []
  const allEventTypes = ["deposit", "transfer_incoming", "transfer_outgoing"]
  const preferenceMap = new Map(preferences.map((p) => [p.eventType, p]))

  return (
    <>
      <PageHeader
        title="Notification Preferences"
        email={user.email}
      />

      <main className="flex-1 mx-auto w-full max-w-2xl px-8 py-6">
        {prefsQuery.isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {prefsQuery.isError && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">{prefsQuery.error?.message ?? "Failed to load preferences"}</p>
            <Button variant="outline" onClick={() => prefsQuery.refetch()}>Retry</Button>
          </div>
        )}

        {!prefsQuery.isLoading && !prefsQuery.isError && (
          <div className="flex flex-col gap-2">
            {allEventTypes.map((eventType) => {
              const pref = preferenceMap.get(eventType)
              const enabled = pref?.enabled ?? true
              return (
                <Card key={eventType}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">{EVENT_LABELS[eventType]}</p>
                      <p className="text-xs text-muted-foreground">{EVENT_DESCRIPTIONS[eventType]}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ eventType, enabled: !enabled })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        toggleMutation.isPending ? "opacity-50 pointer-events-none" : ""
                      } ${
                        enabled ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
                          enabled ? "translate-x-[22px]" : "translate-x-[2px]"
                        }`}
                      />
                    </button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <PageFooter
        left="Wave Notification Center"
        right={<span>Preferences</span>}
      />
    </>
  )
}
