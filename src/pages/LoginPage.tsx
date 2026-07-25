import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Headphones, Eye, EyeOff, ArrowRight } from 'lucide-react'

interface AppSettingResponse {
  appName: string
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Dynamic app name query
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login.mutateAsync({ email, password })
      navigate('/tickets')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login gagal. Periksa email dan password.')
    }
  }

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('password')
    login.mutate(
      { email: demoEmail, password: 'password' },
      {
        onSuccess: () => navigate('/tickets'),
        onError: (err) => setError(err.message),
      }
    )
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-[#fafafa] text-slate-900">
      <div className="w-full max-w-[360px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs mx-auto">
            <Headphones className="w-5 h-5" />
          </div>
          <h1 className="font-heading font-bold text-xl text-slate-900 tracking-tight">
            {appName}
          </h1>
          <p className="text-slate-500 text-xs">
            Masuk ke portal helpdesk Anda
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 space-y-5 border border-slate-200/80 shadow-2xs">
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 mt-1"
            >
              {login.isPending ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Minimal Quick Demo Login Pills */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
              Login Cepat Demo:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('super@demo.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-center font-medium text-[11px] truncate transition-colors"
              >
                Super Admin
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('itadmin@demo.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-center font-medium text-[11px] truncate transition-colors"
              >
                IT Admin
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('itagent@demo.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-center font-medium text-[11px] truncate transition-colors"
              >
                IT Agent
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('budi@demo.com')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-center font-medium text-[11px] truncate transition-colors"
              >
                Budi (User)
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <p className="text-center text-[10px] text-slate-400">
          &copy; {new Date().getFullYear()} {appName}
        </p>
      </div>
    </div>
  )
}
