import { create } from 'zustand'

type ViewMode = 'list' | 'board'

export interface VideoCallRoom {
  roomId: string
  roomTitle: string
}

interface UiStore {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
  activeFilters: Record<string, string>
  setFilter: (key: string, value: string) => void
  clearFilters: () => void
  isChatOpen: boolean
  activeChatPartnerId: string | null
  openChat: (partnerId?: string | null) => void
  closeChat: () => void
  videoCallRoom: VideoCallRoom | null
  isVideoCallMinimized: boolean
  startVideoCall: (room: VideoCallRoom) => void
  closeVideoCall: () => void
  toggleMinimizeVideoCall: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  viewMode: 'list',
  setViewMode: (viewMode) => set({ viewMode }),
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  activeFilters: {},
  setFilter: (key, value) => set((s) => ({ activeFilters: { ...s.activeFilters, [key]: value } })),
  clearFilters: () => set({ activeFilters: {} }),
  isChatOpen: false,
  activeChatPartnerId: null,
  openChat: (partnerId = null) =>
    set({
      isChatOpen: true,
      ...(partnerId ? { activeChatPartnerId: partnerId } : {}),
    }),
  closeChat: () => set({ isChatOpen: false }),
  videoCallRoom: null,
  isVideoCallMinimized: false,
  startVideoCall: (room) => set({ videoCallRoom: room, isVideoCallMinimized: false }),
  closeVideoCall: () => set({ videoCallRoom: null, isVideoCallMinimized: false }),
  toggleMinimizeVideoCall: () => set((s) => ({ isVideoCallMinimized: !s.isVideoCallMinimized })),
}))
