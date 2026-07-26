import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import {
  Ticket,
  PlusCircle,
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  Headphones,
  ShieldCheck,
  Globe,
  PanelLeftClose,
  Video,
} from 'lucide-react'

interface AppSettingResponse {
  appName: string
}

export function Sidebar() {
  const { user } = useAuth()
  const { isSidebarOpen, toggleSidebar } = useUiStore()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const currentTab = searchParams.get('tab') || 'users'

  // Fetch dynamic app name setting (default: MyHelpDesk)
  const { data: appNameData } = useQuery<AppSettingResponse>({
    queryKey: ['app-name'],
    queryFn: async (): Promise<AppSettingResponse> => {
      try {
        const res = await apiFetch<AppSettingResponse>('/settings/app-name')
        return res || { appName: 'MyHelpDesk' }
      } catch {
        return { appName: 'MyHelpDesk' }
      }
    },
    staleTime: 60 * 1000,
  })

  const appName = appNameData?.appName || 'MyHelpDesk'
  const isAdmin = user && ['super_admin', 'division_admin'].includes(user.role)

  const handleNavClick = () => {
    if (window.innerWidth < 768 && isSidebarOpen) {
      toggleSidebar()
    }
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={cn(
          'border-r border-slate-200/80 bg-white min-h-[100dvh] flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0',
          // Desktop behavior
          'md:sticky md:top-0 md:z-20 md:h-[100dvh]',
          isSidebarOpen ? 'md:w-60' : 'md:w-16',
          // Mobile drawer behavior
          'fixed inset-y-0 left-0 z-40 w-64 shadow-2xl md:shadow-none',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100/80">
            {isSidebarOpen ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-heading font-bold text-slate-900 text-sm tracking-tight leading-none flex items-center gap-1.5 truncate">
                    <span className="truncate">{appName}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      v1.0
                    </span>
                  </h1>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">Multi-Dept Desk</p>
                </div>
              </div>
            ) : (
              <button
                onClick={toggleSidebar}
                className="w-9 h-9 mx-auto rounded-xl bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Tampilkan Sidebar Full"
              >
                <Headphones className="w-4 h-4" />
              </button>
            )}

            {/* Toggle Button */}
            {isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                title="Sembunyikan Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <div className="p-3 space-y-4">
            {/* Main Category */}
            <div>
              {isSidebarOpen ? (
                <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Navigasi Utama
                </p>
              ) : (
                <div className="h-px bg-slate-100 my-2 mx-1" />
              )}
              <nav className="space-y-1">
                <NavLink
                  to="/tickets"
                  onClick={handleNavClick}
                  title="Daftar Tiket"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-xl text-xs font-medium transition-all',
                      isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center',
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                    )
                  }
                >
                  <Ticket className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && <span className="truncate">Daftar Tiket</span>}
                </NavLink>

                <NavLink
                  to="/new-ticket"
                  onClick={handleNavClick}
                  title="Buat Tiket Baru"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-xl text-xs font-medium transition-all',
                      isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center',
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                    )
                  }
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && <span className="truncate">Buat Tiket Baru</span>}
                </NavLink>

                {user && ['super_admin', 'division_admin', 'agent'].includes(user.role) && (
                  <NavLink
                    to="/dashboard"
                    onClick={handleNavClick}
                    title="Dashboard & SLA"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-xl text-xs font-medium transition-all',
                        isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center',
                        isActive
                          ? 'bg-slate-900 text-white font-semibold shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                      )
                    }
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    {isSidebarOpen && <span className="truncate">Dashboard & SLA</span>}
                  </NavLink>
                )}

                <NavLink
                  to="/meeting"
                  onClick={handleNavClick}
                  title="Video Meeting Hub"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                      isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center',
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/80'
                    )
                  }
                >
                  <Video className="w-4 h-4 shrink-0" />
                  {isSidebarOpen && (
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate font-semibold">Video Meeting</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold animate-pulse">
                        HUB
                      </span>
                    </div>
                  )}
                </NavLink>
              </nav>
            </div>

            {/* Admin Settings Sub-Menu Category */}
            {isAdmin && (
              <div>
                {isSidebarOpen ? (
                  <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-slate-400" />
                    <span>Pengaturan Admin</span>
                  </p>
                ) : (
                  <div className="h-px bg-slate-100 my-2 mx-1" />
                )}
                <nav className="space-y-1">
                  <NavLink
                    to="/admin?tab=users"
                    onClick={handleNavClick}
                    title="Master Akun Pengguna"
                    className={
                      location.pathname === '/admin' && currentTab === 'users'
                        ? cn(
                            'flex items-center gap-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all',
                            isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                          )
                        : cn(
                            'flex items-center gap-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 transition-all',
                            isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                          )
                    }
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    {isSidebarOpen && <span className="truncate">Master Akun Pengguna</span>}
                  </NavLink>

                  {user.role === 'super_admin' && (
                    <>
                      <NavLink
                        to="/admin?tab=divisions"
                        onClick={handleNavClick}
                        title="Mode Akun Divisi"
                        className={
                          location.pathname === '/admin' && currentTab === 'divisions'
                            ? cn(
                                'flex items-center gap-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all',
                                isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                              )
                            : cn(
                                'flex items-center gap-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 transition-all',
                                isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                              )
                        }
                      >
                        <Building2 className="w-4 h-4 shrink-0" />
                        {isSidebarOpen && <span className="truncate">Mode Akun Divisi</span>}
                      </NavLink>

                      <NavLink
                        to="/admin?tab=branding"
                        onClick={handleNavClick}
                        title="Branding & Nama App"
                        className={
                          location.pathname === '/admin' && currentTab === 'branding'
                            ? cn(
                                'flex items-center gap-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all',
                                isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                              )
                            : cn(
                                'flex items-center gap-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 transition-all',
                                isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                              )
                        }
                      >
                        <Globe className="w-4 h-4 shrink-0" />
                        {isSidebarOpen && <span className="truncate">Branding & Nama App</span>}
                      </NavLink>
                    </>
                  )}

                  <NavLink
                    to="/admin?tab=categories"
                    onClick={handleNavClick}
                    title="Kategori & Form Builder"
                    className={
                      location.pathname === '/admin' && currentTab === 'categories'
                        ? cn(
                            'flex items-center gap-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all',
                            isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                          )
                        : cn(
                            'flex items-center gap-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 transition-all',
                            isSidebarOpen ? 'px-3 py-2 justify-start' : 'w-10 h-10 mx-auto justify-center'
                          )
                    }
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    {isSidebarOpen && <span className="truncate">Kategori & Form Builder</span>}
                  </NavLink>
                </nav>
              </div>
            )}

            {/* Active Division Badge */}
            {user?.division && isSidebarOpen && (
              <div className="mx-1 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>Divisi</span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">
                  {user.division.name} ({user.division.code})
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
