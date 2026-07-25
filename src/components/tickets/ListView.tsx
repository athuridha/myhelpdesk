import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTickets, isOverdue, type TicketRow } from '@/hooks/useTickets'
import { useUiStore } from '@/store/ui'
import { formatDate } from '@/lib/utils'
import { Search, Filter, AlertCircle, ChevronRight, Calendar, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const SAVED_VIEWS = [
  { key: '', label: 'Semua Tiket' },
  { key: 'BARU', label: 'Tiket Baru' },
  { key: 'DITUGASKAN', label: 'Ditugaskan' },
  { key: 'SEDANG_DIKERJAKAN', label: 'Sedang Dikerjakan' },
  { key: 'MENUNGGU_USER', label: 'Menunggu User' },
  { key: 'SELESAI', label: 'Selesai / Resolusi' },
]

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-sky-50 text-sky-700 border-sky-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function ListView() {
  const navigate = useNavigate()
  const { activeFilters, setFilter, clearFilters } = useUiStore()
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState(activeFilters.startDate || '')
  const [endDate, setEndDate] = useState(activeFilters.endDate || '')

  // Combined filters for API query
  const combinedFilters = {
    ...activeFilters,
    search,
    startDate,
    endDate,
  }

  const { data: tickets, isLoading } = useTickets(combinedFilters)

  const handleClearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    clearFilters()
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#fafafa] text-slate-900">
      {/* Left Filter Sidebar */}
      <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200/80 bg-white p-4 space-y-5 shrink-0">
        {/* Status Filter Section */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filter Status Tiket
          </p>
          <div className="flex md:flex-col overflow-x-auto gap-1">
            {SAVED_VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setFilter('status', v.key)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between shrink-0',
                  (activeFilters.status ?? '') === v.key
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter Section */}
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Filter Tanggal Dibuat
          </p>

          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Dari Tanggal:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sampai Tanggal:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Reset Filter Button */}
        {(activeFilters.status || startDate || endDate || search) && (
          <button
            onClick={handleClearFilters}
            className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset Semua Filter</span>
          </button>
        )}
      </div>

      {/* Main Table Area */}
      <div className="flex-1 p-4 md:p-6 space-y-4 overflow-auto">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              placeholder="Cari nomor tiket atau subjek..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-900 text-xs focus:outline-none focus:border-slate-400 shadow-2xs transition-colors"
            />
          </div>
        </div>

        {/* Tickets Table */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Memuat data tiket...</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/70 shadow-2xs overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200/70 text-[10px]">
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">No. Tiket</th>
                  <th className="py-3 px-4">Subjek Tiket</th>
                  <th className="py-3 px-4">Divisi</th>
                  <th className="py-3 px-4">Pemohon</th>
                  <th className="py-3 px-4">Petugas Assignee</th>
                  <th className="py-3 px-4">Tanggal Dibuat</th>
                  <th className="py-3 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets?.map((t: TicketRow) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-md text-[10px] font-bold border',
                          PRIORITY_BADGE[t.priority] || 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.ticketNumber}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {t.subject}
                        </span>
                        {isOverdue(t) && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{t.division.code}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{t.requester.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{t.assignee?.name ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{formatDate(t.createdAt)}</td>
                    <td className="py-3 px-2 text-slate-400 group-hover:text-slate-900 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))}

                {tickets?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada tiket yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
