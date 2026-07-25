import { create } from 'zustand'

type ViewMode = 'list' | 'board'

interface UiStore {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  activeFilters: Record<string, string>
  setFilter: (key: string, value: string) => void
  clearFilters: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  viewMode: 'list',
  setViewMode: (viewMode) => set({ viewMode }),
  activeFilters: {},
  setFilter: (key, value) => set(s => ({ activeFilters: { ...s.activeFilters, [key]: value } })),
  clearFilters: () => set({ activeFilters: {} }),
}))
