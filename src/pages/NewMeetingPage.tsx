import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/TopBar'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import {
  Video,
  ArrowLeft,
  ArrowRight,
  Globe,
  Lock,
  UserPlus,
  Search,
  Check,
  X,
  BellRing,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DbMeetingRoom } from '@/pages/MeetingPage'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  division?: { name: string; code: string }
}

export function NewMeetingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  const [roomTopic, setRoomTopic] = useState('')
  const [accessType, setAccessType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null)

  // Fetch users list for optional invitation
  const { data: usersList } = useQuery<UserItem[]>({
    queryKey: ['meeting-users-list'],
    queryFn: () => apiFetch('/users'),
  })

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: (payload: { title: string; accessType: 'PUBLIC' | 'PRIVATE' }) =>
      apiFetch<DbMeetingRoom>('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (newRoom) => {
      qc.invalidateQueries({ queryKey: ['db-meeting-rooms'] })

      // Send notifications to invited users if any
      if (selectedUserIds.length > 0) {
        sendInviteMutation.mutate({
          invitedUserIds: selectedUserIds,
          roomTitle: newRoom.title,
          roomId: newRoom.roomId,
        })
      }

      navigate(`/room/${newRoom.roomId}`)
    },
    onError: (err: Error) => {
      alert(`Gagal membuat room meeting: ${err.message}`)
    },
  })

  // Send meeting invite notifications
  const sendInviteMutation = useMutation({
    mutationFn: (payload: { invitedUserIds: string[]; roomTitle: string; roomId: string }) =>
      apiFetch('/notifications/invite-meeting', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (_, vars) => {
      setInviteSuccessMsg(`Notifikasi undangan dikirim ke ${vars.invitedUserIds.length} staf.`)
      setTimeout(() => setInviteSuccessMsg(null), 4000)
    },
  })

  const defaultRoomName = user?.division?.name
    ? `Meeting Divisi ${user.division.name}`
    : 'Meeting Umum Company'

  const filteredUsers = usersList?.filter(
    (u) =>
      u.id !== user?.id &&
      (u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.division?.name?.toLowerCase().includes(userSearch.toLowerCase()))
  ) ?? []

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault()
    const title = roomTopic.trim() || defaultRoomName
    createRoomMutation.mutate({ title, accessType })
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 flex flex-col font-sans pb-16">
      <TopBar title="Buat Room Meeting" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Link to="/meeting" className="hover:underline">
                Video Meeting
              </Link>
              <span>&rsaquo;</span>
              <span className="text-slate-700 font-semibold">Buat Room Baru</span>
            </div>
            <h1 className="font-heading font-bold text-2xl text-slate-900 tracking-tight">
              Buat Room Meeting Baru
            </h1>
            <p className="text-xs text-slate-500">
              Isi informasi topik meeting, tentukan tipe akses, dan simpan room ke database.
            </p>
          </div>

          <Link
            to="/meeting"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </Link>
        </div>

        {/* Success Alert Banner */}
        {inviteSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{inviteSuccessMsg}</span>
            </div>
            <button onClick={() => setInviteSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-950">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dedicated Creation Form */}
        <form onSubmit={handleCreateRoom} className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
          {/* Topik / Nama Rapat */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">Topik / Nama Rapat *</label>
            <input
              type="text"
              value={roomTopic}
              onChange={(e) => setRoomTopic(e.target.value)}
              placeholder={defaultRoomName}
              className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Tipe Akses Toggle: Publik / Privat */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">Tipe Akses Meeting</label>
            <div className="grid grid-cols-2 gap-3 bg-slate-100/70 p-1.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setAccessType('PUBLIC')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  accessType === 'PUBLIC'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <Globe className="w-4 h-4" />
                <span>🌐 Publik (Siapa Saja)</span>
              </button>

              <button
                type="button"
                onClick={() => setAccessType('PRIVATE')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  accessType === 'PRIVATE'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <Lock className="w-4 h-4" />
                <span>🔒 Privat (Terbatas)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {accessType === 'PUBLIC'
                ? '🌐 Siapa saja yang memiliki link meeting dapat langsung bergabung.'
                : '🔒 Pertemuan dibatasi hanya untuk staf/anggota terundang.'}
            </p>
          </div>

          {/* User Invitation Picker Button */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800">Undang Anggota / Staf (Opsional)</label>
                <p className="text-[11px] text-slate-400">Kirim notifikasi rapat langsung ke akun mereka.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Undang Staf ({selectedUserIds.length})</span>
              </button>
            </div>
          </div>

          {/* Form Action CTAs */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/meeting"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={createRoomMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              <span>{createRoomMutation.isPending ? 'Menyimpan...' : 'Buat & Simpan Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>

      {/* Clean User Invite Selection Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Pilih Staf Yang Diundang</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Cari nama atau divisi staf..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            {/* User List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">Tidak ada staf ditemukan.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id)
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className={cn(
                        'p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all',
                        isSelected
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold'
                          : 'bg-slate-50/60 border-slate-200/60 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="truncate text-slate-900">{u.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {u.role} {u.division?.name ? `• ${u.division.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {selectedUserIds.length} staf dipilih
              </span>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
