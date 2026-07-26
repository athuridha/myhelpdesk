import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  ArrowLeft,
  Copy,
  Check,
  Radio,
  ExternalLink,
  Lock,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DbMeetingRoom } from '@/pages/MeetingPage'

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const qc = useQueryClient()
  const rawRoomId = roomId ? decodeURIComponent(roomId) : ''
  const sanitizedRoomId = rawRoomId.replace(/[^a-zA-Z0-9-]/g, '')
  const meetingUrl = `https://meet.element.io/${sanitizedRoomId}`

  // Fetch active room details from DB if available
  const { data: dbRooms } = useQuery<DbMeetingRoom[]>({
    queryKey: ['db-meeting-rooms'],
    queryFn: () => apiFetch('/meetings'),
  })

  const currentRoom = dbRooms?.find(
    (r) => r.roomId === roomId || r.id === roomId || r.roomId === sanitizedRoomId
  )

  const [isEnding, setIsEnding] = useState(false)

  const handleEndRoom = async () => {
    if (isEnding) return
    setIsEnding(true)
    const targetId = currentRoom?.id || sanitizedRoomId || roomId
    if (targetId) {
      try {
        await apiFetch(`/meetings/${targetId}`, { method: 'DELETE' })
      } catch (err) {
        console.error('Failed deleting room:', err)
      }
    }
    qc.invalidateQueries({ queryKey: ['db-meeting-rooms'] })
    navigate('/meeting')
  }

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      try {
        const dataStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
        if (
          dataStr.includes('videoConferenceLeft') ||
          dataStr.includes('readyToClose') ||
          dataStr.includes('terminated')
        ) {
          handleEndRoom()
        }
      } catch {}
    }
    window.addEventListener('message', handleIframeMessage)
    return () => window.removeEventListener('message', handleIframeMessage)
  }, [currentRoom?.id, sanitizedRoomId, roomId])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!sanitizedRoomId) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-4 text-center">
        <div className="space-y-3">
          <p className="text-slate-700 font-bold text-sm">Room ID tidak valid.</p>
          <Link to="/meeting" className="text-xs text-indigo-600 font-bold underline">
            Kembali ke Meeting Hub
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-64px)] bg-slate-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Room Header Action Bar */}
      <div className="px-4 sm:px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/meeting')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Kembali ke Dashboard Meeting"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider animate-pulse shrink-0">
              <Radio className="w-3 h-3" />
              <span>Live Room</span>
            </div>

            <h1 className="font-heading font-bold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
              {currentRoom?.title || sanitizedRoomId}
            </h1>

            {currentRoom && (
              <span
                className={cn(
                  'hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border shrink-0',
                  currentRoom.accessType === 'PUBLIC'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                )}
              >
                {currentRoom.accessType === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>{currentRoom.accessType}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Header Control Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Salin Link'}</span>
          </button>

          <a
            href={meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Buka di Tab Baru"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={handleEndRoom}
            disabled={isEnding}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer ml-1 disabled:opacity-50"
          >
            {isEnding ? 'Menutup...' : 'Akhiri & Tutup Room'}
          </button>
        </div>
      </div>

      {/* Main Full-Page Meeting Video Container */}
      <main className="flex-1 w-full bg-slate-950 relative overflow-hidden">
        <iframe
          src={meetingUrl}
          allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; encrypted-media *; fullscreen *"
          className="w-full h-full border-0 absolute inset-0"
          title={currentRoom?.title || sanitizedRoomId}
        />
      </main>
    </div>
  )
}
