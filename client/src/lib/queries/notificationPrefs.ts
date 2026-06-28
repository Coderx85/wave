import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchJSON } from "../queryClient"

// ─── Types ────────────────────────────────────────────────────
export interface NotificationPreference {
  id: string
  userId: string
  eventType: string
  enabled: boolean
}

// ─── Query Keys ───────────────────────────────────────────────
export const notificationPrefsKeys = {
  all: ["notificationPrefs"] as const,
  user: (userId: string) => ["notificationPrefs", userId] as const,
}

// ─── Queries ──────────────────────────────────────────────────

export function useNotificationPrefs(userId: string) {
  return useQuery({
    queryKey: notificationPrefsKeys.user(userId),
    queryFn: () =>
      fetchJSON<NotificationPreference[]>(
        `/api/notification/users/${userId}/notification-preferences`,
      ),
    enabled: !!userId,
  })
}

// ─── Mutations ────────────────────────────────────────────────

export function useTogglePreference(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { eventType: string; enabled: boolean }) =>
      fetchJSON<NotificationPreference>(
        `/api/notification/users/${userId}/notification-preferences`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: notificationPrefsKeys.user(userId) })
      const previous = queryClient.getQueryData<NotificationPreference[]>(
        notificationPrefsKeys.user(userId),
      )
      queryClient.setQueryData<NotificationPreference[]>(
        notificationPrefsKeys.user(userId),
        (old) => {
          if (!old) return old
          const idx = old.findIndex((p) => p.eventType === input.eventType)
          if (idx >= 0) {
            const next = [...old]
            next[idx] = { ...next[idx], enabled: input.enabled }
            return next
          }
          return [...old, { id: "temp", userId, eventType: input.eventType, enabled: input.enabled }]
        },
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationPrefsKeys.user(userId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationPrefsKeys.user(userId) })
    },
  })
}
