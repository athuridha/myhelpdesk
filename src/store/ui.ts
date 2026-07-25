import { create } from 'zustand'

type ViewMode = 'list' | 'board'

interface UiStore {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (isOpen: boolean) => void
  activeFilters: Record<string, string>
  setFilter: (key: string, value: string) => void
  clearFilters: () => void
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
}))
