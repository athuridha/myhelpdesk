import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface Notif {
  id: string
  ticketId: string | null
  type: string
  message: string
  isRead: boolean
  createdAt: string
}

export function useNotifications() {
  const qc = useQueryClient()
  const query = useQuery<Notif[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    refetchInterval: 15000,
  })

  const markAllRead = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = query.data?.filter((n) => !n.isRead).length ?? 0
  return { ...query, items: query.data, unreadCount, markAllRead, markRead }
}
