import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTickets, isOverdue, type TicketRow } from '@/hooks/useTickets'
import { useUiStore } from '@/store/ui'
import { formatDate } from '@/lib/utils'
import { Search, Filter, AlertCircle, ChevronRight, Calendar, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const SAVED_VIEWS = [
  { key: '', label: 'Tiket Aktif' },
  { key: 'BARU', label: 'Tiket Baru' },
  { key: 'DITUGASKAN', label: 'Ditugaskan' },
  { key: 'SEDANG_DIKERJAKAN', label: 'Sedang Dikerjakan' },
  { key: 'MENUNGGU_USER', label: 'Menunggu User' },
  { key: 'SELESAI', label: 'Selesai / Resolusi' },
  { key: 'ALL', label: 'Semua Tiket (Inc. Selesai)' },
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
    <div className="flex flex-col md:flex-row min-h-full bg-[#fafafa] text-slate-900">
      {/* Left Filter Sidebar */}
      <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200/80 bg-white p-3.5 md:p-4 space-y-4 md:space-y-5 shrink-0">
        {/* Status Filter Section */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filter Status Tiket
          </p>
          <div className="flex md:flex-col overflow-x-auto gap-1.5 pb-1 md:pb-0 scrollbar-none">
            {SAVED_VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setFilter('status', v.key)}
                className={cn(
                  'text-left px-3 py-1.5 md:py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between shrink-0 whitespace-nowrap cursor-pointer',
                  (activeFilters.status ?? '') === v.key
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-slate-100/70 md:bg-transparent'
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

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
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
            className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset Semua Filter</span>
          </button>
        )}
      </div>

      {/* Main Table / List Area */}
      <div className="flex-1 p-3.5 md:p-6 space-y-4 overflow-auto">
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

        {/* Tickets Content */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Memuat data tiket...</div>
        ) : tickets?.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200/70">
            Tidak ada tiket yang cocok dengan filter saat ini.
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="block md:hidden space-y-3">
              {tickets?.map((t: TicketRow) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5 active:scale-[0.99] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-indigo-600">{t.ticketNumber}</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold border',
                        PRIORITY_BADGE[t.priority] || 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {t.priority}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-xs text-slate-900 line-clamp-2">{t.subject}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pemohon: <span className="font-medium text-slate-700">{t.requester.name}</span> • Divisi:{' '}
                      <span className="font-bold text-slate-700">{t.division.code}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span>{formatDate(t.createdAt)}</span>
                    <div className="flex items-center gap-1 text-slate-700 font-semibold">
                      <span>Detail</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200/70 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[700px]">
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
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
