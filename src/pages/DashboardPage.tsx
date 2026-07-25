import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { apiFetch } from '@/lib/api'
import { type TicketRow, isOverdue } from '@/hooks/useTickets'
import { TopBar } from '@/components/layout/TopBar'
import { Ticket, CheckCircle2, AlertTriangle, TrendingUp, Clock, Activity, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const PIE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

export function DashboardPage() {
  const { data: tickets } = useQuery<TicketRow[]>({
    queryKey: ['tickets', {}],
    queryFn: () => apiFetch('/tickets'),
    refetchInterval: 15000,
  })

  const list = tickets ?? []
  const byStatus = Object.entries(
    list.reduce<Record<string, number>>((acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1
      return acc
    }, {})
  ).map(([status, count]) => ({ status, count }))

  const byDivision = Object.entries(
    list.reduce<Record<string, number>>((acc, t) => {
      acc[t.division.code] = (acc[t.division.code] ?? 0) + 1
      return acc
    }, {})
  ).map(([division, count]) => ({ division, count }))

  const total = list.length
  const overdue = list.filter(isOverdue).length
  const resolved = list.filter((t) => ['SELESAI', 'RESOLVED', 'CLOSED', 'DITUTUP'].includes(t.status)).length
  const slaCompliance = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <TopBar title="Dashboard Performa & SLA" />

      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Top Metric Bento Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Tiket Helpdesk"
            value={total}
            icon={Ticket}
            badge="Semua Divisi"
          />
          <StatCard
            label="Tiket Selesai"
            value={resolved}
            icon={CheckCircle2}
            badge={`${total ? Math.round((resolved / total) * 100) : 0}% Selesai`}
            badgeColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          />
          <StatCard
            label="Tiket Overdue SLA"
            value={overdue}
            icon={AlertTriangle}
            accent="text-rose-600"
            badge="Melewati Deadline"
            badgeColor="text-rose-700 bg-rose-50 border-rose-200"
          />
          <StatCard
            label="Kepatuhan SLA"
            value={`${slaCompliance}%`}
            icon={TrendingUp}
            accent="text-indigo-600"
            badge="Target >= 95%"
            badgeColor="text-indigo-700 bg-indigo-50 border-indigo-200"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Tiket per Status */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-base">Distribusi Status Tiket</h3>
                <p className="text-xs text-slate-500">Jumlah tiket berdasarkan tahapan penanganan saat ini</p>
              </div>
              <Activity className="w-4 h-4 text-slate-400" />
            </div>

            <div className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byStatus}>
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Tiket per Divisi */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-base">Tiket per Divisi</h3>
                <p className="text-xs text-slate-500">Beban kerja dan permintaan bantuan per departemen</p>
              </div>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byDivision}
                    dataKey="count"
                    nameKey="division"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                    paddingAngle={4}
                    label
                  >
                    {byDivision.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Tickets Activity List */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              Aktivitas Tiket Terbaru
            </h3>
            <span className="text-xs text-slate-400">Terakhir diperbarui secara realtime</span>
          </div>

          <div className="divide-y divide-slate-100">
            {list.slice(0, 5).map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md shrink-0">
                    {t.ticketNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.subject}</p>
                    <p className="text-[11px] text-slate-400">
                      Oleh <span className="text-slate-700 font-medium">{t.requester.name}</span> · {t.division.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
  badge,
  badgeColor,
}: {
  label: string
  value: string | number
  accent?: string
  icon: React.ElementType
  badge?: string
  badgeColor?: string
}) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className={cn('text-2xl font-bold font-heading text-slate-900 tracking-tight', accent)}>
        {value}
      </div>
      {badge && (
        <span
          className={cn(
            'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200',
            badgeColor
          )}
        >
          {badge}
        </span>
      )}
    </div>
  )
}
