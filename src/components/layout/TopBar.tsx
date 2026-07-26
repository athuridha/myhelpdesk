import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
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
  ChevronDown,
  Check,
  Undo2,
  ShieldCheck,
  MessageSquare,
  Ticket,
  LogOut,
  X,
  Search,
  Menu,
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
  const navigate = useNavigate()
  const { viewMode, setViewMode, openChat, toggleSidebar } = useUiStore()
  const { user, switchUser, logout } = useAuth()
  const { items, unreadCount, markAllRead, markRead } = useNotifications()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showUserSwitcherModal, setShowUserSwitcherModal] = useState(false)
  const [switcherSearch, setSwitcherSearch] = useState('')

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
      onSuccess: () => {
        setShowProfileDropdown(false)
        setShowUserSwitcherModal(false)
      },
    })
  }

  const handleSwitchBackToSuperAdmin = () => {
    const superAdminAccount = allUsers?.find((u) => u.role === 'super_admin' || u.email === 'super@demo.com')
    const targetId = user?.originalSuperAdminId || superAdminAccount?.id
    if (targetId) {
      handleSwitchAccount(targetId)
    }
  }

  const handleNotificationClick = (n: Notif) => {
    if (!n.isRead) {
      markRead.mutate(n.id)
    }
    setShowNotifications(false)

    if (n.ticketId) {
      navigate(`/tickets/${n.ticketId}`)
    } else if (n.type === 'PRIVATE_CHAT' || n.message.toLowerCase().includes('pesan privat')) {
      openChat()
    }
  }

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    division_admin: 'Admin Divisi',
    agent: 'Agent Desk',
    requester: 'Pemohon Tiket',
  }

  const filteredUsers = allUsers?.filter((u) => {
    const q = switcherSearch.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.division?.name && u.division.name.toLowerCase().includes(q))
    )
  })

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white flex items-center justify-between px-4 md:px-6 gap-4 sticky top-0 z-30 shadow-xs">
      {/* Title & Mobile Hamburger Button */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors md:hidden shrink-0 cursor-pointer"
          title="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm md:text-base font-heading font-bold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-none">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs animate-pulse cursor-pointer"
            title="Kembali ke Akun Super Admin"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali ke Super Admin</span>
          </button>
        )}

        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
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
              'flex items-center gap-1.5 px-2.5 md:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
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
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfileDropdown(false)
            }}
            className="relative p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
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
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Notifikasi ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tandai Dibaca
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {items?.length ? (
                  items.map((n: Notif) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        'p-3 rounded-2xl text-xs transition-all cursor-pointer border group relative hover:shadow-xs',
                        n.isRead
                          ? 'bg-slate-50/70 border-slate-200/60 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                          : 'bg-indigo-50/80 border-indigo-200/80 text-slate-900 font-medium hover:bg-indigo-100/70 shadow-xs'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          {n.ticketId ? (
                            <>
                              <Ticket className="w-3 h-3 text-indigo-500" /> Tiket
                            </>
                          ) : n.type === 'PRIVATE_CHAT' ? (
                            <>
                              <MessageSquare className="w-3 h-3 text-emerald-500" /> Private Chat
                            </>
                          ) : (
                            <>
                              <Bell className="w-3 h-3 text-slate-400" /> Info
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">Tidak ada notifikasi.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown Button (Top Right Header) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown)
              setShowNotifications(false)
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 text-slate-800 transition-all text-xs font-semibold cursor-pointer"
            title="Menu Profil Pengguna"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="font-bold text-xs text-slate-900 truncate max-w-[120px]">{user?.name}</span>
              <span className="text-[10px] text-slate-500 truncate">
                {roleLabels[user?.role || ''] || user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* User Profile Dropdown Menu */}
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{user?.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80">
                      {roleLabels[user?.role || ''] || user?.role}
                    </span>
                    {user?.division && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200">
                        {user.division.code}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Switch Profile Button (Opens Pop-up Modal) */}
              {isSuperAdminOrImpersonating && (
                <div className="py-2 border-b border-slate-100">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false)
                      setShowUserSwitcherModal(true)
                    }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Switch Profile (Super Admin)</span>
                  </button>
                </div>
              )}

              {/* Logout Button inside Top Right Dropdown */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowProfileDropdown(false)
                    logout.mutate()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200/60 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Keluar dari Akun (Log Out)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Switch Profile Pop-up Modal (Portaled to document.body for full screen backdrop covering sidebar & header) */}
      {showUserSwitcherModal &&
        createPortal(
          <div
            onClick={() => setShowUserSwitcherModal(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Switch Profile</h3>
                    <p className="text-[11px] text-slate-400">Simulasi / Pindah mode akun pengguna</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserSwitcherModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama, email, atau divisi..."
                    value={switcherSearch}
                    onChange={(e) => setSwitcherSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-100/90 border border-slate-200/60 rounded-xl focus:bg-white focus:border-slate-400 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {filteredUsers?.map((u) => {
                    const isCurrent = user?.email === u.email || user?.id === u.id
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleSwitchAccount(u.id)}
                        disabled={isCurrent || switchUser.isPending}
                        className={cn(
                          'w-full text-left p-3 rounded-2xl text-xs flex items-center justify-between transition-all border cursor-pointer',
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border',
                              isCurrent
                                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{u.name}</p>
                            <p className={cn('text-[11px] truncate', isCurrent ? 'text-slate-300' : 'text-slate-500')}>
                              {u.email}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={cn(
                                  'text-[9px] px-1.5 py-0.2 rounded font-semibold',
                                  isCurrent
                                    ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                )}
                              >
                                {roleLabels[u.role] || u.role}
                              </span>
                              {u.division && (
                                <span className={cn('text-[9px] font-medium', isCurrent ? 'text-slate-400' : 'text-slate-400')}>
                                  • {u.division.code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  )
}
