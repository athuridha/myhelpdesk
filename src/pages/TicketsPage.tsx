import { useUiStore } from '@/store/ui'
import { TopBar } from '@/components/layout/TopBar'
import { ListView } from '@/components/tickets/ListView'
import { BoardView } from '@/components/tickets/BoardView'

export function TicketsPage() {
  const { viewMode } = useUiStore()
  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Kelola Tiket Helpdesk" />
      <div className="flex-1">
        {viewMode === 'list' ? <ListView /> : <BoardView />}
      </div>
    </div>
  )
}
