import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  divisionId: string | null
  division?: { id: string; name: string; code: string }
  isImpersonating?: boolean
  originalSuperAdminId?: string | null
}

export function useAuth() {
  const qc = useQueryClient()
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['me'],
    queryFn: () => apiFetch<AuthUser>('/auth/me').catch(() => null),
    staleTime: 5 * 60 * 1000,
  })

  const login = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      apiFetch<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(creds) }),
    onSuccess: (data) => qc.setQueryData(['me'], data),
  })

  const logout = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => qc.setQueryData(['me'], null),
  })

  const switchUser = useMutation({
    mutationFn: (targetUserId: string) =>
      apiFetch<AuthUser>('/auth/switch-user', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data)
      qc.invalidateQueries()
    },
  })

  return { user, isLoading, login, logout, switchUser }
}
