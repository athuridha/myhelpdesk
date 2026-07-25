import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { TopBar } from '@/components/layout/TopBar'
import { FormBuilder } from '@/components/form-builder/FormBuilder'
import { useAuth } from '@/hooks/useAuth'
import {
  Building2,
  Layers,
  Wrench,
  Plus,
  ChevronRight,
  Users,
  UserPlus,
  Globe,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Division {
  id: string
  name: string
  code: string
  accountMode: string
  _count?: { users: number; categories: number; tickets: number }
}

interface Category {
  id: string
  name: string
  divisionId: string
  division: { name: string; code: string }
}

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  divisionId: string | null
  isActive: boolean
  isSharedAccount: boolean
  division?: { id: string; name: string; code: string }
}

export function AdminPage() {
  const { user, switchUser } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get('tab') || 'users'

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [showAddDivision, setShowAddDivision] = useState(false)

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'requester',
    divisionId: '',
  })

  const [newDivision, setNewDivision] = useState({
    name: '',
    code: '',
    accountMode: 'INDIVIDUAL',
  })

  // Dynamic App Name query & mutation
  const { data: appNameData } = useQuery<{ appName: string }>({
    queryKey: ['app-name'],
    queryFn: () => apiFetch('/settings/app-name'),
  })
  const [customAppName, setCustomAppName] = useState('')

  const updateAppName = useMutation({
    mutationFn: (appName: string) =>
      apiFetch('/settings/app-name', {
        method: 'PATCH',
        body: JSON.stringify({ appName }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app-name'] })
    },
  })

  // Queries
  const { data: divisions } = useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: () => apiFetch('/divisions'),
  })
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/categories'),
  })
  const { data: usersList } = useQuery<UserItem[]>({
    queryKey: ['users-master'],
    queryFn: () => apiFetch('/users'),
  })

  // Mutations
  const toggleMode = useMutation({
    mutationFn: ({ id, accountMode }: { id: string; accountMode: string }) =>
      apiFetch(`/divisions/${id}/account-mode`, {
        method: 'PATCH',
        body: JSON.stringify({ accountMode }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['divisions'] }),
  })

  const createDivision = useMutation({
    mutationFn: () =>
      apiFetch('/divisions', {
        method: 'POST',
        body: JSON.stringify({
          name: newDivision.name,
          code: newDivision.code.toUpperCase(),
          accountMode: newDivision.accountMode,
        }),
      }),
    onSuccess: () => {
      setNewDivision({ name: '', code: '', accountMode: 'INDIVIDUAL' })
      setShowAddDivision(false)
      qc.invalidateQueries({ queryKey: ['divisions'] })
    },
  })

  const [newCat, setNewCat] = useState({ name: '', divisionId: '' })
  const createCat = useMutation({
    mutationFn: () => apiFetch('/categories', { method: 'POST', body: JSON.stringify(newCat) }),
    onSuccess: () => {
      setNewCat({ name: '', divisionId: '' })
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const createUser = useMutation({
    mutationFn: () =>
      apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...newUser,
          divisionId: newUser.divisionId || null,
        }),
      }),
    onSuccess: () => {
      setNewUser({ name: '', email: '', password: '', role: 'requester', divisionId: '' })
      setShowAddUser(false)
      qc.invalidateQueries({ queryKey: ['users-master'] })
    },
  })

  const updateUserRoleOrDiv = useMutation({
    mutationFn: ({ userId, role, divisionId }: { userId: string; role?: string; divisionId?: string | null }) =>
      apiFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role, divisionId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users-master'] }),
  })

  const toggleUserActive = useMutation({
    mutationFn: (userId: string) => apiFetch(`/users/${userId}/toggle-active`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users-master'] }),
  })

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    division_admin: 'Admin Divisi',
    agent: 'Agent Desk',
    requester: 'Pemohon Tiket',
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] text-slate-900">
      <TopBar title="Pengaturan Admin & Sub-Menu" />

      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* Sub-Menu Top Tab Bar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200/80 pb-2">
          <button
            onClick={() => setSearchParams({ tab: 'users' })}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === 'users'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Master Akun Pengguna</span>
          </button>

          {user?.role === 'super_admin' && (
            <>
              <button
                onClick={() => setSearchParams({ tab: 'divisions' })}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                  activeTab === 'divisions'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Mode & Master Divisi</span>
              </button>

              <button
                onClick={() => setSearchParams({ tab: 'branding' })}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                  activeTab === 'branding'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Branding & Nama App</span>
              </button>
            </>
          )}

          <button
            onClick={() => setSearchParams({ tab: 'categories' })}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
              activeTab === 'categories'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kategori & Form Builder</span>
          </button>
        </div>

        {/* TAB 1: MASTER AKUN PENGGUNA */}
        {activeTab === 'users' && (
          <section className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Master Data Akun Pengguna</h2>
                <p className="text-xs text-slate-400">
                  Kelola peran (role), divisi, dan status seluruh akun terdaftar
                </p>
              </div>

              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddUser ? 'Tutup Form' : 'Tambah Akun Baru'}</span>
              </button>
            </div>

            {/* Form Tambah Akun Baru */}
            {showAddUser && (
              <div className="p-4 rounded-xl bg-white border border-slate-200/70 shadow-2xs space-y-3">
                <p className="text-xs font-bold text-slate-800">Registrasi Akun Pengguna Baru</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nama Lengkap:</label>
                    <input
                      type="text"
                      placeholder="Nama Pengguna..."
                      value={newUser.name}
                      onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Email Akun:</label>
                    <input
                      type="email"
                      placeholder="email@demo.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Password:</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Peran (Role):</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                    >
                      <option value="requester">Pemohon Tiket</option>
                      <option value="agent">Agent Desk</option>
                      <option value="division_admin">Admin Divisi</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Divisi:</label>
                    <select
                      value={newUser.divisionId}
                      onChange={(e) => setNewUser((u) => ({ ...u, divisionId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                    >
                      <option value="">— Tidak Ada —</option>
                      {divisions?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {createUser.isError && (
                  <p className="text-rose-600 text-xs font-semibold">{(createUser.error as Error).message}</p>
                )}

                <button
                  onClick={() => createUser.mutate()}
                  disabled={!newUser.name || !newUser.email || !newUser.password || createUser.isPending}
                  className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs disabled:opacity-50 transition-all"
                >
                  Simpan Akun Pengguna
                </button>
              </div>
            )}

            {/* Master Users List Table */}
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-2xs overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/70 text-[10px]">
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Ubah Peran (Role)</th>
                    <th className="py-3 px-4">Ubah Divisi</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList?.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{u.email}</td>

                      {/* Interactive Role Switcher for Super Admin */}
                      <td className="py-3 px-4">
                        {user?.role === 'super_admin' ? (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              updateUserRoleOrDiv.mutate({
                                userId: u.id,
                                role: e.target.value,
                              })
                            }
                            disabled={updateUserRoleOrDiv.isPending}
                            className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold text-[11px] text-slate-800 focus:outline-none focus:border-slate-400"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="division_admin">Admin Divisi</option>
                            <option value="agent">Agent Desk</option>
                            <option value="requester">Pemohon Tiket</option>
                          </select>
                        ) : (
                          <span className="font-bold text-slate-700">{roleLabels[u.role] || u.role}</span>
                        )}
                      </td>

                      {/* Interactive Division Switcher for Super Admin */}
                      <td className="py-3 px-4">
                        {user?.role === 'super_admin' ? (
                          <select
                            value={u.divisionId || ''}
                            onChange={(e) =>
                              updateUserRoleOrDiv.mutate({
                                userId: u.id,
                                divisionId: e.target.value || null,
                              })
                            }
                            disabled={updateUserRoleOrDiv.isPending}
                            className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-[11px] text-slate-800 focus:outline-none focus:border-slate-400"
                          >
                            <option value="">— Tidak Ada —</option>
                            {divisions?.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.code})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            {u.division?.name ? `${u.division.name} (${u.division.code})` : '—'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => toggleUserActive.mutate(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                        >
                          {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>

                        {user?.role === 'super_admin' && (
                          <button
                            onClick={() => switchUser.mutate(u.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] transition-colors"
                          >
                            Switch Akun
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: MODE & MASTER DIVISI */}
        {activeTab === 'divisions' && user?.role === 'super_admin' && (
          <section className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Mode & Master Divisi</h2>
                <p className="text-xs text-slate-400">
                  Tambah divisi baru (misal: Finance, Legal, Marketing) dan atur skema akun (Individual / Shared)
                </p>
              </div>

              <button
                onClick={() => setShowAddDivision(!showAddDivision)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddDivision ? 'Tutup Form' : 'Tambah Divisi Baru'}</span>
              </button>
            </div>

            {/* Form Tambah Divisi Baru */}
            {showAddDivision && (
              <div className="p-4 rounded-xl bg-white border border-slate-200/70 shadow-2xs space-y-3">
                <p className="text-xs font-bold text-slate-800">Buat Master Divisi Baru</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nama Divisi:</label>
                    <input
                      type="text"
                      placeholder="Contoh: Finance / Marketing / Legal..."
                      value={newDivision.name}
                      onChange={(e) => setNewDivision((d) => ({ ...d, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Kode Singkatan Divisi:</label>
                    <input
                      type="text"
                      placeholder="Contoh: FIN / MKT / LEG..."
                      value={newDivision.code}
                      onChange={(e) => setNewDivision((d) => ({ ...d, code: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Mode Akun:</label>
                    <select
                      value={newDivision.accountMode}
                      onChange={(e) => setNewDivision((d) => ({ ...d, accountMode: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none"
                    >
                      <option value="INDIVIDUAL">INDIVIDUAL (Akun Per Orang)</option>
                      <option value="SHARED">SHARED (Satu Akun Bersama Divisi)</option>
                    </select>
                  </div>
                </div>

                {createDivision.isError && (
                  <p className="text-rose-600 text-xs font-semibold">{(createDivision.error as Error).message}</p>
                )}

                <button
                  onClick={() => createDivision.mutate()}
                  disabled={!newDivision.name || !newDivision.code || createDivision.isPending}
                  className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs disabled:opacity-50 transition-all"
                >
                  Simpan Divisi Baru
                </button>
              </div>
            )}

            {/* List of Divisions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {divisions?.map((d) => {
                const isShared = d.accountMode === 'SHARED'
                return (
                  <div
                    key={d.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 text-xs flex items-center justify-center">
                          {d.code}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{d.name}</h3>
                          <p className="text-xs text-slate-400">Kode: {d.code}</p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                          isShared
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        {isShared ? 'Shared' : 'Individual'}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        toggleMode.mutate({
                          id: d.id,
                          accountMode: isShared ? 'INDIVIDUAL' : 'SHARED',
                        })
                      }
                      disabled={toggleMode.isPending}
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Ubah ke {isShared ? 'INDIVIDUAL' : 'SHARED'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* TAB: BRANDING & NAMA APLIKASI */}
        {activeTab === 'branding' && user?.role === 'super_admin' && (
          <section className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pengaturan Branding & Nama Aplikasi</h2>
              <p className="text-xs text-slate-400">
                Ubah nama brand helpdesk (Default: <strong>MyHelpDesk</strong>) yang tampil di sidebar dan header
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Nama Aplikasi / Desk Brand:</label>
                <input
                  type="text"
                  placeholder="Contoh: MyHelpDesk / DeskPerusahaan..."
                  defaultValue={appNameData?.appName || 'MyHelpDesk'}
                  onChange={(e) => setCustomAppName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-slate-400"
                />
              </div>

              {updateAppName.isSuccess && (
                <p className="text-xs font-semibold text-emerald-600">
                  Nama aplikasi berhasil diperbarui ke &ldquo;{appNameData?.appName}&rdquo;!
                </p>
              )}

              <button
                onClick={() => updateAppName.mutate(customAppName || appNameData?.appName || 'MyHelpDesk')}
                disabled={updateAppName.isPending}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{updateAppName.isPending ? 'Menyimpan...' : 'Simpan Nama Aplikasi'}</span>
              </button>
            </div>
          </section>
        )}

        {/* TAB 3: KATEGORI & FORM BUILDER */}
        {activeTab === 'categories' && (
          <section className="space-y-6 animate-in fade-in duration-150">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Kategori Layanan & Form Builder</h2>
              <p className="text-xs text-slate-400">Susun skema formulir khusus per kategori layanan helpdesk</p>
            </div>

            {/* Form Tambah Kategori */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/70 shadow-2xs space-y-2">
              <p className="text-xs font-bold text-slate-800">Tambah Kategori Baru</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <input
                    type="text"
                    placeholder="Nama Kategori..."
                    value={newCat.name}
                    onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>

                <div>
                  <select
                    value={newCat.divisionId}
                    onChange={(e) => setNewCat((c) => ({ ...c, divisionId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
                  >
                    <option value="">— Pilih Divisi —</option>
                    {divisions?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    onClick={() => createCat.mutate()}
                    disabled={!newCat.name || !newCat.divisionId || createCat.isPending}
                    className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs disabled:opacity-50 flex items-center justify-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan Kategori</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List of categories */}
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-2xs overflow-hidden divide-y divide-slate-100">
              {categories?.map((c) => {
                const isSelected = selectedCat === c.id
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors',
                      isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {c.name[0]?.toUpperCase()}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{c.name}</h4>
                        <p className="text-[11px] text-slate-400">
                          Divisi: <strong className="text-slate-700 font-semibold">{c.division?.name}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCat(isSelected ? null : c.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border',
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{isSelected ? 'Tutup Builder' : 'Form Builder'}</span>
                        <ChevronRight className={cn('w-3 h-3 transition-transform', isSelected && 'rotate-90')} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dynamic Form Builder Container */}
            {selectedCat && (
              <div className="space-y-3 pt-4 border-t border-slate-200/70 animate-in fade-in duration-150">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-slate-500" />
                  Form Builder — {categories?.find((c) => c.id === selectedCat)?.name}
                </h3>

                <div className="p-5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                  <FormBuilder
                    key={selectedCat}
                    categoryId={selectedCat}
                    onSaved={() => qc.invalidateQueries({ queryKey: ['form-schema', selectedCat] })}
                  />
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
