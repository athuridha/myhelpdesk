import { useState } from 'react'
import { useUiStore } from '@/store/ui'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications, type Notif } from '@/hooks/useNotifications'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  Bell,
  LayoutList,
  Kanban,
  CheckCheck,
  UserCheck,
  ChevronDown,
  Check,
  Undo2,
  ShieldCheck,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserOption {
  id: string
  name: string
  email: string
  role: string
  divisionId: string | null
  division?: { name: string; code: string }
}

export function TopBar({ title }: { title: string }) {
  const { viewMode, setViewMode, isSidebarOpen, toggleSidebar } = useUiStore()
  const { user, switchUser } = useAuth()
  const { items, unreadCount, markAllRead, markRead } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserSwitcher, setShowUserSwitcher] = useState(false)

  const isSuperAdminOrImpersonating =
    user?.role === 'super_admin' || Boolean(user?.isImpersonating) || Boolean(user?.originalSuperAdminId)

  // Fetch all users only for Super Admin / impersonating sessions
  const { data: allUsers } = useQuery<UserOption[]>({
    queryKey: ['all-users-switcher'],
    queryFn: () => apiFetch('/users'),
    enabled: isSuperAdminOrImpersonating,
  })

  const handleSwitchAccount = (targetUserId: string) => {
    switchUser.mutate(targetUserId, {
      onSuccess: () => setShowUserSwitcher(false),
    })
  }

  const handleSwitchBackToSuperAdmin = () => {
    // Find Super Admin account ID from list or originalSuperAdminId
    const superAdminAccount = allUsers?.find((u) => u.role === 'super_admin' || u.email === 'super@demo.com')
    const targetId = user?.originalSuperAdminId || superAdminAccount?.id
    if (targetId) {
      handleSwitchAccount(targetId)
    }
  }

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    division_admin: 'Admin Divisi',
    agent: 'Agent Desk',
    requester: 'Pemohon Tiket',
  }

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white flex items-center justify-between px-4 md:px-6 gap-4 sticky top-0 z-30 shadow-xs">
      {/* Sidebar Toggle & Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          title={isSidebarOpen ? 'Sembunyikan Sidebar' : 'Tampilkan Sidebar'}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <h2 className="text-sm md:text-base font-heading font-bold text-slate-900 tracking-tight truncate">
          {title}
        </h2>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Switch Back to Super Admin Button (When Impersonating) */}
        {user?.isImpersonating && (
          <button
            onClick={handleSwitchBackToSuperAdmin}
            disabled={switchUser.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs animate-pulse"
            title="Kembali ke Akun Super Admin"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali ke Super Admin</span>
          </button>
        )}

        {/* Profile Switcher Dropdown (STRICTLY FOR SUPER ADMIN / IMPERSONATING SESSIONS ONLY) */}
        {isSuperAdminOrImpersonating && (
          <div className="relative">
            <button
              onClick={() => setShowUserSwitcher(!showUserSwitcher)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 hover:bg-slate-200/70 transition-all text-xs font-semibold"
              title="Ganti Profil / Akun Pengguna (Super Admin Only)"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span className="max-w-[120px] truncate hidden md:inline">{user?.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold uppercase border border-indigo-200">
                {user?.isImpersonating ? 'Pindah Mode' : user?.role.replace('_', ' ')}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Profile Switcher Dropdown */}
            {showUserSwitcher && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Switch Profile (Super Admin)
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Pilih profil akun yang ingin Anda jalankan
                    </p>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {allUsers?.map((u) => {
                    const isCurrent = user?.email === u.email || user?.id === u.id
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchAccount(u.id)}
                        disabled={isCurrent || switchUser.isPending}
                        className={cn(
                          'w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors border',
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-100'
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold truncate">{u.name}</p>
                          <p className={cn('text-[10px] truncate', isCurrent ? 'text-slate-300' : 'text-slate-500')}>
                            {u.email} · {roleLabels[u.role] || u.role}
                          </p>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg text-xs font-semibold transition-all',
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg text-xs font-semibold transition-all',
              viewMode === 'board'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Board</span>
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Notifikasi ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tandai Dibaca
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {items?.length ? (
                  items.map((n: Notif) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead.mutate(n.id)}
                      className={cn(
                        'p-2.5 rounded-xl text-xs transition-colors cursor-pointer border',
                        n.isRead
                          ? 'bg-slate-50/50 border-slate-100 text-slate-500'
                          : 'bg-indigo-50/50 border-indigo-100 text-slate-800 font-medium'
                      )}
                    >
                      <p>{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">Tidak ada notifikasi.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
