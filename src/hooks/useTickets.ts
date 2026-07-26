import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface TicketRow {
  id: string
  ticketNumber: string
  subject: string
  priority: string
  status: string
  channel: string
  dueDate: string | null
  createdAt: string
  requester: { name: string }
  assignee: { name: string } | null
  category: { name: string }
  division: { id: string; name: string; code: string }
}

export function useTickets(filters: Record<string, string> = {}) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  return useQuery<TicketRow[]>({
    queryKey: ['tickets', filters],
    queryFn: () => apiFetch(`/tickets${qs ? `?${qs}` : ''}`),
    refetchInterval: 15000,
  })
}

export function isOverdue(t: { dueDate: string | null; status: string }) {
  if (!t.dueDate || ['SELESAI', 'DITUTUP', 'SPAM', 'TRASH'].includes(t.status)) return false
  return new Date() > new Date(t.dueDate)
}
