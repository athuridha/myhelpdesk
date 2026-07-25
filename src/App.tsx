import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoginPage } from '@/pages/LoginPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { NewTicketPage } from '@/pages/NewTicketPage'
import { AdminPage } from '@/pages/AdminPage'
import { DashboardPage } from '@/pages/DashboardPage'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">{children}</main>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="p-8 text-xs text-slate-400">Memuat...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout>
              <Navigate to="/tickets" replace />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/tickets"
        element={
          <RequireAuth>
            <AppLayout>
              <TicketsPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RequireAuth>
            <AppLayout>
              <TicketDetailPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/new-ticket"
        element={
          <RequireAuth>
            <AppLayout>
              <NewTicketPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AppLayout>
              <AdminPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
