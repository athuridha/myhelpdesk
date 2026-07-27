import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Loader2, RefreshCw } from 'lucide-react'

export function DatabasePreloader({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const startPreload = async () => {
    setError(null)

    try {
      // 1. Fetch user session
      const user = await queryClient.fetchQuery({
        queryKey: ['me'],
        queryFn: () => apiFetch('/auth/me').catch(() => null),
        staleTime: 5 * 60 * 1000,
      })

      if (user) {
        // 2. Prefetch essential database collections
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: ['tickets', {}],
            queryFn: () => apiFetch('/tickets'),
            staleTime: 15 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: ['categories'],
            queryFn: () => apiFetch('/categories'),
            staleTime: 60 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: ['divisions'],
            queryFn: () => apiFetch('/divisions'),
            staleTime: 60 * 1000,
          }),
          queryClient.prefetchQuery({
            queryKey: ['notifications'],
            queryFn: () => apiFetch('/notifications'),
            staleTime: 15 * 1000,
          }),
        ])
      }

      // Smooth finish
      setTimeout(() => {
        setIsDone(true)
      }, 300)
    } catch (err) {
      console.error('Database preload error:', err)
      setError((err as Error).message || 'Gagal memuat data')
    }
  }

  useEffect(() => {
    startPreload()
  }, [])

  const handleRetry = async () => {
    setIsRetrying(true)
    await startPreload()
    setIsRetrying(false)
  }

  return (
    <>
      <AnimatePresence>
        {!isDone && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 select-none"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center space-y-4 max-w-sm"
            >
              {/* App Brand Icon */}
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Headphones className="w-6 h-6" />
              </div>

              {/* Title & Status */}
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">MyHelpdesk</h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">Memuat data database...</p>
              </div>

              {error ? (
                <div className="pt-2 w-full space-y-2">
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                    {error}
                  </p>
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              ) : (
                /* Minimal Spinner & Pulse Bar */
                <div className="flex items-center gap-2 text-slate-400 pt-1">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  <span className="text-xs text-slate-500 font-medium">Menyiapkan...</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  )
}
