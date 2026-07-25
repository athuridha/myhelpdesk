import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useTickets, isOverdue, type TicketRow } from '@/hooks/useTickets'
import { useUiStore } from '@/store/ui'
import { apiFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const COLUMNS = [
  { key: 'BARU', label: 'Masuk Antrian' },
  { key: 'DITUGASKAN', label: 'Ditugaskan' },
  { key: 'SEDANG_DIKERJAKAN', label: 'Sedang Dikerjakan' },
  { key: 'MENUNGGU_USER', label: 'Menunggu User' },
  { key: 'SELESAI', label: 'Selesai' },
]

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'border-l-red-500',
  HIGH: 'border-l-orange-400',
  MEDIUM: 'border-l-blue-400',
  LOW: 'border-l-yellow-400',
}

function TicketCard({ ticket }: { ticket: TicketRow }) {
  const overdue = isOverdue(ticket)
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className={`block bg-white border border-l-4 ${PRIORITY_COLOR[ticket.priority]} rounded p-3 shadow-sm hover:shadow-md transition-shadow space-y-1`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium line-clamp-2">{ticket.subject}</span>
        {overdue && <span className="shrink-0 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">Overdue</span>}
      </div>
      <div className="font-mono text-xs text-gray-400">{ticket.ticketNumber}</div>
      <div className="text-xs text-gray-500">{ticket.requester.name}</div>
      {ticket.assignee && <div className="text-xs text-gray-400">→ {ticket.assignee.name}</div>}
      {ticket.dueDate && (
        <div className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
          Due: {formatDate(ticket.dueDate)}
        </div>
      )}
    </Link>
  )
}

export function BoardView() {
  const { activeFilters } = useUiStore()
  const { data: tickets } = useTickets(activeFilters)
  const qc = useQueryClient()
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tickets'] })
      const prev = qc.getQueriesData({ queryKey: ['tickets'] })
      qc.setQueriesData({ queryKey: ['tickets'] }, (old: TicketRow[] | undefined) =>
        old?.map(t => t.id === id ? { ...t, status } : t)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prev.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null)
    const { active, over } = e
    if (!over) return
    const targetCol = over.id as string
    if (COLUMNS.some(c => c.key === targetCol)) {
      const ticket = tickets?.find(t => t.id === active.id)
      if (ticket && ticket.status !== targetCol) {
        updateStatus.mutate({ id: ticket.id, status: targetCol })
      }
    }
  }

  const handleDragOver = (e: DragOverEvent) => {
    setDraggingId(e.active.id as string)
  }

  const byStatus = (status: string) => tickets?.filter(t => t.status === status) ?? []

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
      <div className="flex gap-3 p-4 overflow-x-auto h-full">
        {COLUMNS.map(col => {
          const colTickets = byStatus(col.key)
          return (
            <div
              key={col.key}
              id={col.key}
              className="shrink-0 w-64 bg-slate-50 rounded-lg flex flex-col"
            >
              <div className="px-3 py-2 font-medium text-sm border-b flex items-center justify-between">
                <span>{col.label}</span>
                <span className="text-xs text-gray-400 bg-white border rounded-full px-2">{colTickets.length}</span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]">
                {colTickets.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-6">Kosong</div>
                ) : (
                  colTickets.map(t => (
                    <div key={t.id} className={draggingId === t.id ? 'opacity-50' : ''}>
                      <TicketCard ticket={t} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}
