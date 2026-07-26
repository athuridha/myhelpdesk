import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { Video, Radio, X, ArrowRight } from 'lucide-react'

export interface DbNotification {
  id: string
  userId: string
  title?: string
  type?: string
  message: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

export function MeetingInviteToast() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // Poll notifications every 5 seconds
  const { data: notifications } = useQuery<DbNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiFetch('/notifications'),
    enabled: Boolean(user),
    refetchInterval: 5000,
  })

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Find latest unread video meeting invite notification that hasn't been dismissed
  const meetingInvite = notifications?.find(
    (n) =>
      !n.isRead &&
      !dismissedIds.includes(n.id) &&
      (n.type === 'MEETING_INVITE' ||
        n.message.includes('/room/') ||
        n.message.toLowerCase().includes('video call') ||
        n.message.toLowerCase().includes('undangan'))
  )

  if (!meetingInvite) return null

  const handleJoin = () => {
    markReadMutation.mutate(meetingInvite.id)

    let targetLink = meetingInvite.link
    if (!targetLink && meetingInvite.message.includes('/room/')) {
      const match = meetingInvite.message.match(/\/room\/[^\s"']*/)
      if (match) targetLink = match[0]
    }

    if (targetLink) {
      navigate(targetLink)
    } else {
      navigate('/meeting')
    }
  }

  const handleDismiss = () => {
    setDismissedIds((prev) => [...prev, meetingInvite.id])
    markReadMutation.mutate(meetingInvite.id)
  }

  return (
    <div className="fixed bottom-6 right-6 z-[99] max-w-sm w-full font-sans animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white space-y-3 relative overflow-hidden backdrop-blur-md">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500" />

        {/* Header Bar */}
        <div className="flex items-start justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold uppercase tracking-wider animate-pulse shrink-0">
              <Radio className="w-3 h-3" />
              <span>Panggilan Masuk</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 truncate">
              {meetingInvite.title || 'Undangan Video Call'}
            </h4>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Abaikan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {meetingInvite.message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Abaikan
          </button>
          <button
            onClick={handleJoin}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
          >
            <span>Gabung Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
