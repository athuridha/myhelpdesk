import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/TopBar'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import {
  Video,
  Plus,
  Copy,
  Check,
  Radio,
  Search,
  Trash2,
  Calendar,
  Globe,
  Lock,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DbMeetingRoom {
  id: string
  roomId: string
  title: string
  accessType: 'PUBLIC' | 'PRIVATE'
  hostId: string
  isActive: boolean
  scheduledAt?: string | null
  createdAt: string
  host: {
    id: string
    name: string
    role: string
    division?: { name: string; code: string }
  }
}

export function MeetingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'PUBLIC' | 'PRIVATE' | 'SCHEDULED'>('ALL')
  const [joinCode, setJoinCode] = useState('')
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Fetch active meeting rooms from database
  const { data: dbRooms, isLoading: loadingRooms } = useQuery<DbMeetingRoom[]>({
    queryKey: ['db-meeting-rooms'],
    queryFn: () => apiFetch('/meetings'),
    refetchInterval: 10000,
  })

  // Delete/End room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/meetings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['db-meeting-rooms'] })
    },
  })

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return

    let raw = joinCode.trim()
    if (raw.includes('meet.element.io/')) {
      raw = raw.split('meet.element.io/')[1].split('#')[0]
    } else if (raw.includes('meet.jit.si/')) {
      raw = raw.split('meet.jit.si/')[1].split('#')[0]
    }

    const cleanRoomId = decodeURIComponent(raw).replace(/[^a-zA-Z0-9-]/g, '')
    navigate(`/room/${cleanRoomId}`)
  }

  const handleCopyLink = (roomIdOrUrl: string) => {
    const cleanRoomId = decodeURIComponent(roomIdOrUrl).replace(/[^a-zA-Z0-9-]/g, '')
    const link = `https://meet.element.io/${cleanRoomId}`
    navigator.clipboard.writeText(link)
    setCopiedLink(roomIdOrUrl)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const filteredRooms = dbRooms?.filter((room) => {
    let matchesType = true
    if (filterType === 'PUBLIC') matchesType = room.accessType === 'PUBLIC'
    else if (filterType === 'PRIVATE') matchesType = room.accessType === 'PRIVATE'
    else if (filterType === 'SCHEDULED') matchesType = Boolean(room.scheduledAt)

    const matchesSearch =
      room.title.toLowerCase().includes(search.toLowerCase()) ||
      room.host.name.toLowerCase().includes(search.toLowerCase()) ||
      (room.host.division?.code &&
        room.host.division.code.toLowerCase().includes(search.toLowerCase()))
    return matchesType && matchesSearch
  }) ?? []

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 flex flex-col font-sans pb-16">
      <TopBar title="Video Meeting" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Minimalist Top Header & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>Workspace</span>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-semibold">Video Meeting</span>
            </div>
            <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
              Daftar Room Meeting Aktif
            </h1>
            <p className="text-xs text-slate-500">
              Ruang pertemuan digital tersimpan di database yang siap diakses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/new-meeting"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Room Baru</span>
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar + Quick Join Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Box & Type Filter Tabs (8 Cols) */}
          <div className="md:col-span-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama room, host, atau divisi..."
                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors shadow-2xs"
              />
            </div>

            {/* Filter Segment Tabs */}
            <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0 gap-0.5">
              {[
                { key: 'ALL', label: 'Semua', icon: Layers },
                { key: 'PUBLIC', label: 'Publik', icon: Globe },
                { key: 'PRIVATE', label: 'Privat', icon: Lock },
                { key: 'SCHEDULED', label: 'Jadwal Mendatang', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = filterType === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterType(tab.key as any)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      isActive
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Join via Code Form (4 Cols) */}
          <form onSubmit={handleJoinByCode} className="md:col-span-4 flex items-center gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Gabung via kode room..."
              className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-slate-400 shadow-2xs"
            />
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              Gabung
            </button>
          </form>
        </div>

        {/* Active Database Meeting Rooms Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>Room Aktif ({filteredRooms.length})</span>
            </span>
            <span>Database Synced</span>
          </div>

          {loadingRooms ? (
            <div className="p-12 text-center text-xs text-slate-400">Memuat daftar room meeting...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200/70 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Video className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-900">Belum Ada Room Meeting Aktif</p>
                <p className="text-xs text-slate-500">
                  {search ? 'Tidak ada room yang cocok dengan pencarian.' : 'Klik "Buat Room Baru" di atas untuk membuat ruang rapat baru.'}
                </p>
              </div>
              <Link
                to="/new-meeting"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Room Baru</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredRooms.map((room) => {
                const isHost = user?.id === room.hostId || user?.role === 'super_admin'
                return (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                              room.accessType === 'PUBLIC'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            )}
                          >
                            {room.accessType === 'PUBLIC' ? (
                              <Globe className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Lock className="w-3 h-3 text-indigo-600" />
                            )}
                            <span>{room.accessType === 'PUBLIC' ? 'Publik' : 'Privat'}</span>
                          </span>
                          {room.scheduledAt && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Calendar className="w-3 h-3 text-amber-600" />
                              <span>Terjadwal</span>
                            </span>
                          )}
                        </div>

                        {isHost && (
                          <button
                            onClick={() => deleteRoomMutation.mutate(room.id)}
                            disabled={deleteRoomMutation.isPending}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Tutup & Hapus Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 truncate" title={room.title}>
                        {room.title}
                      </h4>

                      <div className="space-y-1 text-xs text-slate-500">
                        <p className="truncate">
                          Host: <strong className="text-slate-800">{room.host.name}</strong>
                          {room.host.division?.code ? ` (${room.host.division.code})` : ''}
                        </p>
                        {room.scheduledAt ? (
                          <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-md flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            <span>Jadwal: {formatDateTime(room.scheduledAt)}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDateTime(room.createdAt)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => navigate(`/room/${room.roomId}`)}
                        className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer text-center"
                      >
                        Masuk Room
                      </button>
                      <button
                        onClick={() => handleCopyLink(room.roomId)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Salin Link"
                      >
                        {copiedLink === room.roomId ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
