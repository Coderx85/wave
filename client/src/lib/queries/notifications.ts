import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchJSON } from "../queryClient"

// ─── Types ────────────────────────────────────────────────────
export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "error"
  timestamp: string
  read: boolean
}

// ─── Query Keys ───────────────────────────────────────────────
export const notificationKeys = {
  all: ["notifications"] as const,
  user: (userId: string) => ["notifications", userId] as const,
}

// ─── Queries ──────────────────────────────────────────────────

/** Fetch notifications for a user */
export function useNotifications(userId: string, limit = 50) {
  return useQuery({
    queryKey: [...notificationKeys.user(userId), { limit }],
    queryFn: () =>
      fetchJSON<Notification[]>(
        `/api/notification/users/${userId}/notifications?limit=${limit}`,
      ),
    enabled: !!userId,
  })
}

// ─── Mutations ────────────────────────────────────────────────

/** Dismiss (delete) a notification */
export function useDismissNotification(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) =>
      fetchJSON<void>(
        `/api/notification/users/${userId}/notifications/${notificationId}`,
        { method: "DELETE" },
      ),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.user(userId) })
      const previous = queryClient.getQueryData<Notification[]>(
        notificationKeys.user(userId),
      )
      queryClient.setQueryData<Notification[]>(
        notificationKeys.user(userId),
        (old) => old?.filter((n) => n.id !== notificationId) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.user(userId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.user(userId) })
    },
  })
}

/** Mark a notification as read */
export function useMarkNotificationRead(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) =>
      fetchJSON<void>(
        `/api/notification/users/${userId}/notifications/${notificationId}/read`,
        { method: "PATCH" },
      ),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.user(userId) })
      const previous = queryClient.getQueryData<Notification[]>(
        notificationKeys.user(userId),
      )
      queryClient.setQueryData<Notification[]>(
        notificationKeys.user(userId),
        (old) =>
          old?.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.user(userId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.user(userId) })
    },
  })
}
