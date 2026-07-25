import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  Ticket,
  PlusCircle,
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  Headphones,
  LogOut,
  ShieldCheck,
  Globe,
} from 'lucide-react'

interface AppSettingResponse {
  appName: string
}

export function Sidebar() {
  const { user, logout } = useAuth()
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

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    division_admin: 'Admin Divisi',
    agent: 'Agent Desk',
    requester: 'Pemohon Tiket',
  }

  const isAdmin = user && ['super_admin', 'division_admin'].includes(user.role)

  return (
    <aside className="w-60 shrink-0 border-r border-slate-100 bg-white h-screen flex flex-col justify-between sticky top-0 z-40">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-100/80">
          <div className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
            <Headphones className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-slate-900 text-sm tracking-tight leading-none flex items-center gap-1 truncate">
              <span className="truncate">{appName}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                v1.0
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Multi-Dept Desk</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="p-3 space-y-5">
          {/* Main Category */}
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Navigasi Utama
            </p>
            <nav className="space-y-0.5">
              <NavLink
                to="/tickets"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  )
                }
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Daftar Tiket</span>
              </NavLink>

              <NavLink
                to="/new-ticket"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  )
                }
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Buat Tiket Baru</span>
              </NavLink>

              {user && ['super_admin', 'division_admin', 'agent'].includes(user.role) && (
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard & SLA</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Admin Settings Sub-Menu Category */}
          {isAdmin && (
            <div>
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                <span>Pengaturan Admin</span>
              </p>
              <nav className="space-y-0.5">
                <NavLink
                  to="/admin?tab=users"
                  className={
                    location.pathname === '/admin' && currentTab === 'users'
                      ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all'
                      : 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all'
                  }
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Master Akun Pengguna</span>
                </NavLink>

                {user.role === 'super_admin' && (
                  <>
                    <NavLink
                      to="/admin?tab=divisions"
                      className={
                        location.pathname === '/admin' && currentTab === 'divisions'
                          ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all'
                          : 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all'
                      }
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Mode Akun Divisi</span>
                    </NavLink>

                    <NavLink
                      to="/admin?tab=branding"
                      className={
                        location.pathname === '/admin' && currentTab === 'branding'
                          ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all'
                          : 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all'
                      }
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Branding & Nama App</span>
                    </NavLink>
                  </>
                )}

                <NavLink
                  to="/admin?tab=categories"
                  className={
                    location.pathname === '/admin' && currentTab === 'categories'
                      ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white shadow-xs transition-all'
                      : 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all'
                  }
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Kategori & Form Builder</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Active Division */}
          {user?.division && (
            <div className="mx-1 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>Divisi</span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {user.division.name} ({user.division.code})
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {roleLabels[user?.role || ''] || user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
