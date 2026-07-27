import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoginPage } from '@/pages/LoginPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { NewTicketPage } from '@/pages/NewTicketPage'
import { AdminPage } from '@/pages/AdminPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MeetingPage } from '@/pages/MeetingPage'
import { NewMeetingPage } from '@/pages/NewMeetingPage'
import { RoomPage } from '@/pages/RoomPage'
import { PrivateChatWidget } from '@/components/chat/PrivateChatWidget'
import { VideoCallWidget } from '@/components/video/VideoCallWidget'
import { MeetingInviteToast } from '@/components/video/MeetingInviteToast'

import { DatabasePreloader } from '@/components/common/DatabasePreloader'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-slate-50 overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 min-w-0 min-h-[100dvh] overflow-y-auto">{children}</main>
      <PrivateChatWidget />
      <VideoCallWidget />
      <MeetingInviteToast />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-medium">
        Memeriksa sesi pengguna...
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <DatabasePreloader>{children}</DatabasePreloader>
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
      <Route
        path="/meeting"
        element={
          <RequireAuth>
            <AppLayout>
              <MeetingPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/new-meeting"
        element={
          <RequireAuth>
            <AppLayout>
              <NewMeetingPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/room/:roomId"
        element={
          <RequireAuth>
            <AppLayout>
              <RoomPage />
            </AppLayout>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
