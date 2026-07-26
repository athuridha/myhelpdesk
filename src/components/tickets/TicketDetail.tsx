import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, type ChangeEvent } from 'react'
import { apiFetch } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { isOverdue } from '@/hooks/useTickets'
import {
  ArrowLeft,
  UserCheck,
  Send,
  AlertCircle,
  FileText,
  Paperclip,
  Upload,
  MessageSquare,
  Lock,
  Activity,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Image as ImageIcon,
  Download,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketAttachmentItem {
  id: string
  fileName: string
  fileUrl: string
  uploadedBy?: { id: string; name: string }
}

interface TicketDetail {
  id: string
  ticketNumber: string
  subject: string
  priority: string
  status: string
  divisionId: string
  dueDate: string | null
  createdAt: string
  resolvedAt: string | null
  requester: { id: string; name: string }
  assignee: { id: string; name: string } | null
  category: {
    id: string
    name: string
    slaCriticalHours: number
    slaHighHours: number
    slaMediumHours: number
    slaLowHours: number
  }
  division: { id?: string; name: string; code: string }
  fieldValues: { id: string; value: string; formField: { label: string; fieldType: string } }[]
  attachments: TicketAttachmentItem[]
  comments: {
    id: string
    content: string
    isInternalNote: boolean
    createdAt: string
    author: { id: string; name: string; role: string }
  }[]
  activityLogs: {
    id: string
    action: string
    fromValue: string | null
    toValue: string | null
    createdAt: string
    actor: { name: string }
  }[]
}

interface AgentUser {
  id: string
  name: string
  email: string
  role: string
}

const STATUSES = [
  'BARU',
  'DITUGASKAN',
  'SEDANG_DIKERJAKAN',
  'MENUNGGU_USER',
  'SELESAI',
  'DITUTUP',
  'SPAM',
  'TRASH',
]

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-sky-50 text-sky-700 border-sky-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()

  // Form states for right action sidebar
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [agentTechNote, setAgentTechNote] = useState('')

  // Attachment upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null)

  // Fetch ticket details
  const { data: ticket, isLoading, isError, error } = useQuery<TicketDetail>({
    queryKey: ['ticket', id],
    queryFn: () => apiFetch(`/tickets/${id}`),
    retry: false,
    refetchInterval: 15000,
  })

  // Fetch agents list for assignment dropdown
  const { data: agents } = useQuery<AgentUser[]>({
    queryKey: ['agents-list'],
    queryFn: () => apiFetch('/users'),
    enabled: user && ['super_admin', 'division_admin', 'agent'].includes(user.role),
  })

  // Mutations
  const updateTicket = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      setStatusNote('')
      setRejectReason('')
    },
  })

  const addComment = useMutation({
    mutationFn: (payload: { content: string; isInternalNote: boolean }) => {
      return apiFetch(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      setComment('')
      setAgentTechNote('')
      qc.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  const uploadAttachment = useMutation({
    mutationFn: (payload: { fileName: string; fileUrl: string }) =>
      apiFetch(`/tickets/${id}/attachments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSelectedFile(null)
      qc.invalidateQueries({ queryKey: ['ticket', id] })
    },
  })

  const createTicketMeeting = useMutation({
    mutationFn: () => apiFetch<{ roomId: string; meetingUrl: string }>(`/tickets/${id}/meeting`, { method: 'POST' }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      navigate(data.meetingUrl || `/room/${data.roomId}`)
    },
    onError: (err: Error) => {
      alert(`Gagal membuat video meeting: ${err.message}`)
    },
  })

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUploadFile = () => {
    if (!selectedFile) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const fileUrl = evt.target?.result as string
      if (fileUrl) {
        uploadAttachment.mutate({
          fileName: selectedFile.name,
          fileUrl,
        })
      }
    }
    reader.readAsDataURL(selectedFile)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-600">Memuat rincian tiket...</p>
      </div>
    )
  }

  if (isError || !ticket) {
    const errorMsg =
      (error as Error)?.message || 'Tiket tidak ditemukan atau Anda tidak memiliki akses ke tiket ini.'
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-white border border-rose-200/80 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Akses Dibatasi / Tiket Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1">{errorMsg}</p>
        </div>
        <Link
          to="/tickets"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Tiket
        </Link>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const isHandlingDivisionStaff =
    user &&
    ['division_admin', 'agent'].includes(user.role) &&
    user.divisionId === ticket.divisionId

  // Only Super Admin or Agents/Admins of the TARGET HANDLING DIVISION can handle/take the ticket!
  const canHandleTicket = isSuperAdmin || isHandlingDivisionStaff
  const isSuperOrDivAdmin = user && ['super_admin', 'division_admin'].includes(user.role) && canHandleTicket
  const overdue = isOverdue(ticket)

  // Find urgency/reason field if present
  const urgencyField = ticket.fieldValues.find(
    (f) =>
      f.formField.label.toLowerCase().includes('urgensi') ||
      f.formField.label.toLowerCase().includes('alasan') ||
      f.formField.label.toLowerCase().includes('deskripsi')
  )

  const isImageFile = (urlOrName: string) => {
    return (
      urlOrName.startsWith('data:image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(urlOrName)
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-12">
      {/* Lightbox Modal for Image Preview */}
      {previewModalImage && (
        <div
          onClick={() => setPreviewModalImage(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2 border border-slate-700 shadow-2xl">
            <img
              src={previewModalImage}
              alt="Lampiran Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            <p className="text-center text-xs text-slate-500 py-2">Klik di mana saja untuk menutup</p>
          </div>
        </div>
      )}

      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200/70 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="hover:underline cursor-pointer">Workspace</span>
              <span>&rsaquo;</span>
              <Link to="/tickets" className="hover:underline text-slate-600">
                Semua Tiket
              </Link>
              <span>&rsaquo;</span>
              <span className="font-mono text-slate-700 font-bold">{ticket.ticketNumber}</span>
            </div>
            <h1 className="font-heading font-bold text-lg md:text-xl text-slate-900 tracking-tight">
              Detail Tiket {ticket.ticketNumber} — {ticket.division.name} {ticket.category.name}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => createTicketMeeting.mutate()}
              disabled={createTicketMeeting.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Mulai Video Call untuk Tiket ini"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{createTicketMeeting.isPending ? 'Membuat Room...' : 'Mulai Video Call'}</span>
            </button>

            <button
              onClick={() => navigate('/tickets')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content (8 cols left | 4 cols right) */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Main Ticket Content (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Details Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-5">
            {/* Header Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="font-mono text-xs font-bold text-slate-400">
                {ticket.ticketNumber}
              </span>
              <div className="flex items-center gap-2">
                <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', PRIORITY_BADGE[ticket.priority])}>
                  {ticket.priority}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  {ticket.status}
                </span>
                {overdue && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Overdue
                  </span>
                )}
              </div>
            </div>

            {/* Subject Title & Description */}
            <div className="space-y-1">
              <h2 className="font-heading font-bold text-xl md:text-2xl text-slate-900">
                {ticket.subject}
              </h2>
            </div>

            {/* Highlighted Urgency/Reason Box if present */}
            {urgencyField && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  {urgencyField.formField.label}
                </p>
                <p className="text-xs font-semibold leading-relaxed">{urgencyField.value}</p>
              </div>
            )}

            {/* 8-Grid Metadata Grid Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs border-t border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  PENGAJU
                </span>
                <strong className="text-slate-800 font-semibold block mt-0.5">
                  {ticket.requester.name}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  DIVISI
                </span>
                <strong className="text-slate-800 font-semibold block mt-0.5">
                  {ticket.division.name} ({ticket.division.code})
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  KATEGORI
                </span>
                <strong className="text-slate-800 font-semibold block mt-0.5">
                  {ticket.category.name}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  DEADLINE (SLA)
                </span>
                <strong className={cn('block mt-0.5 font-semibold', overdue ? 'text-rose-600 font-bold' : 'text-slate-800')}>
                  {ticket.dueDate ? formatDateTime(ticket.dueDate) : '—'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TEKNISI / AGENT
                </span>
                <strong className="text-slate-800 font-semibold block mt-0.5">
                  {ticket.assignee?.name ?? 'Belum diassign'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  DIBUAT
                </span>
                <strong className="text-slate-800 font-semibold block mt-0.5">
                  {formatDateTime(ticket.createdAt)}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  SELESAI
                </span>
                <strong className="text-slate-800 font-semibold block mt-0.5">
                  {ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : '—'}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  STATUS SLA
                </span>
                <strong className={cn('block mt-0.5 font-semibold', overdue ? 'text-rose-600' : 'text-emerald-600')}>
                  {overdue ? 'Terlambat (Overdue)' : 'Dalam SLA'}
                </strong>
              </div>
            </div>
          </div>

          {/* Dynamic Form Attributes Card */}
          {ticket.fieldValues.length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-3">
              <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                Atribut Formulir Tambahan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {ticket.fieldValues.map((fv) => (
                  <div key={fv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                      {fv.formField.label}
                    </span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {fv.value === '[object FileList]' ? 'File terlampir' : fv.value || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Card (Lampiran Real Upload & Gallery) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-slate-600" />
                Lampiran Dokumen / Bukti ({ticket.attachments?.length ?? 0})
              </h3>
            </div>

            {/* List of uploaded attachments */}
            {ticket.attachments && ticket.attachments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ticket.attachments.map((att) => {
                  const isImg = isImageFile(att.fileUrl) || isImageFile(att.fileName)
                  return (
                    <div
                      key={att.id}
                      className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all"
                    >
                      {isImg ? (
                        <div
                          onClick={() => setPreviewModalImage(att.fileUrl)}
                          className="h-28 w-full rounded-lg overflow-hidden cursor-zoom-in bg-slate-100 mb-2 relative"
                        >
                          <img
                            src={att.fileUrl}
                            alt={att.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 w-full rounded-lg bg-slate-200/60 flex items-center justify-center mb-2">
                          <FileText className="w-8 h-8 text-slate-500" />
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-slate-800 truncate" title={att.fileName}>
                          {att.fileName}
                        </p>
                        {att.uploadedBy && (
                          <p className="text-[9px] text-slate-400 truncate">Oleh: {att.uploadedBy.name}</p>
                        )}
                      </div>

                      <a
                        href={att.fileUrl}
                        download={att.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 py-1 px-2 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Unduh File</span>
                      </a>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-400 text-xs text-center">
                Belum ada lampiran file yang diunggah.
              </div>
            )}

            {/* File Upload Input Controls */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">Unggah Lampiran Foto / File Baru</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleUploadFile}
                  disabled={!selectedFile || uploadAttachment.isPending}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadAttachment.isPending ? 'Mengunggah...' : 'Upload Lampiran'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Mendukung Gambar (PNG, JPG, WEBP), PDF, DOCX, XLSX.
              </p>
            </div>
          </div>

          {/* Comments & Activity Timeline */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-4">
            <h3 className="font-heading font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              Diskusi & Riwayat Penanganan Job
            </h3>

            <div className="space-y-3 pt-1">
              {ticket.comments.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'p-4 rounded-xl text-xs space-y-1.5 border',
                    c.isInternalNote
                      ? 'bg-amber-50/60 border-amber-200 text-slate-800'
                      : 'bg-slate-50 border-slate-200/80 text-slate-900'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{c.author.name}</span>
                      {c.isInternalNote && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Catatan Internal Agent
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{c.content}</p>
                </div>
              ))}

              {ticket.activityLogs.map((log) => (
                <div key={log.id} className="text-[11px] text-slate-400 flex items-center gap-2 pl-2">
                  <Activity className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    <strong>{log.actor.name}</strong> — {log.action}
                    {log.fromValue ? ` (${log.fromValue} → ${log.toValue})` : ''} · {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>

            {/* Comment Form Input */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tulis balasan atau tanggapan penanganan..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
              />
              <div className="flex items-center justify-between">
                {canHandleTicket ? (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Catatan Internal (Hanya Terlihat Tim Desk)</span>
                  </label>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={() => addComment.mutate({ content: comment, isInternalNote: isInternal })}
                  disabled={!comment.trim() || addComment.isPending}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{addComment.isPending ? 'Kirim...' : 'Kirim Tanggapan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Action Sidebar ("Aksi & Penanganan Tiket") (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs space-y-5 sticky top-20">
            <h3 className="font-heading font-bold text-slate-900 text-sm tracking-tight border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>{canHandleTicket ? 'Panel Aksi & Penanganan' : 'Status & Informasi Tiket'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Divisi {ticket.division.code}
              </span>
            </h3>

            {/* IF NOT HANDLING STAFF (Viewer / Requester Mode) */}
            {!canHandleTicket && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                  <p className="font-bold text-slate-800">Status Penanganan Tiket</p>
                  <p className="text-slate-500 leading-relaxed">
                    Tiket ini ditangani oleh petugas <strong className="text-slate-800">Divisi {ticket.division.name}</strong>. Anda membuka tiket ini sebagai <strong className="text-slate-800">Pemohon</strong>.
                  </p>
                </div>

                {/* Requester Actions when SELESAI */}
                {ticket.status === 'SELESAI' && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-800">Tindakan Pemohon Tiket:</p>
                    <button
                      onClick={() => updateTicket.mutate({ status: 'DITUTUP' })}
                      disabled={updateTicket.isPending}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Konfirmasi Selesai & Tutup Tiket</span>
                    </button>
                    <button
                      onClick={() => updateTicket.mutate({ status: 'SEDANG_DIKERJAKAN' })}
                      disabled={updateTicket.isPending}
                      className="w-full py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Ajukan Buka Kembali (Re-Open)</span>
                    </button>
                  </div>
                )}

                {ticket.status === 'DITUTUP' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Tiket telah dikonfirmasi selesai dan ditutup.</span>
                  </div>
                )}
              </div>
            )}

            {/* IF HANDLING STAFF / SUPER ADMIN */}
            {canHandleTicket && (
              <>
                {/* ACTION 0: Selesaikan Tiket */}
                {ticket.status !== 'SELESAI' && ticket.status !== 'DITUTUP' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateTicket.mutate({ status: 'SELESAI' })}
                      disabled={updateTicket.isPending}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Selesaikan Tiket (Mark as Resolved)</span>
                    </button>
                  </div>
                )}

                {/* ACTION 0.5: Buka Kembali Tiket jika sudah SELESAI */}
                {(ticket.status === 'SELESAI' || ticket.status === 'DITUTUP') && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateTicket.mutate({ status: 'SEDANG_DIKERJAKAN' })}
                      disabled={updateTicket.isPending}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Buka Kembali Tiket (Re-Open)</span>
                    </button>
                  </div>
                )}

                {/* ACTION 1: Ambil Job (Take) — ONLY SHOW WHEN UNASSIGNED */}
                {!ticket.assignee && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => user && updateTicket.mutate({ assigneeId: user.id, status: 'SEDANG_DIKERJAKAN' })}
                      disabled={updateTicket.isPending}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Ambil Job (Take Ticket)</span>
                    </button>
                  </div>
                )}

                {/* ACTION 2: Assign / Reassign ke Agent Lain */}
                {(isSuperOrDivAdmin || !ticket.assignee) && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700">
                      {ticket.assignee ? 'Alihkan (Re-assign) ke Agent Lain' : 'Tugaskan ke Agent / Teknisi'}
                    </label>
                    <select
                      value={selectedAssignee || ticket.assignee?.id || ''}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 cursor-pointer"
                    >
                      <option value="">— Pilih Agent —</option>
                      {agents?.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => selectedAssignee && updateTicket.mutate({ assigneeId: selectedAssignee, status: 'DITUGASKAN' })}
                      disabled={!selectedAssignee || selectedAssignee === ticket.assignee?.id || updateTicket.isPending}
                      className="w-full py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-600" />
                      <span>{ticket.assignee ? 'Alihkan Teknisi' : 'Tugaskan Agent'}</span>
                    </button>
                  </div>
                )}

                {/* ACTION 3: Ubah Status Tiket */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700">Ubah Status Tiket</label>
                  <select
                    value={selectedStatus || ticket.status}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Catatan status (opsional)..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400"
                  />
                  <button
                    onClick={() => {
                      const statusToSet = selectedStatus || ticket.status
                      updateTicket.mutate({ status: statusToSet })
                      if (statusNote) {
                        addComment.mutate({ content: `[Update Status: ${statusToSet}] ${statusNote}`, isInternalNote: true })
                      }
                    }}
                    disabled={updateTicket.isPending}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Update Status
                  </button>
                </div>

                {/* ACTION 4: Tolak Job */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-rose-700">Alasan Penolakan / Dibatalkan</label>
                  <textarea
                    placeholder="Alasan menolak job..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-rose-200 text-slate-900 text-xs focus:outline-none focus:border-rose-400"
                  />
                  <button
                    onClick={() => {
                      updateTicket.mutate({ status: 'TRASH' })
                      if (rejectReason) {
                        addComment.mutate({ content: `[Penolakan Tiket]: ${rejectReason}`, isInternalNote: true })
                      }
                    }}
                    disabled={!rejectReason.trim() || updateTicket.isPending}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak Job</span>
                  </button>
                </div>

                {/* ACTION 5: Ubah Prioritas */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700">Ubah Prioritas</label>
                  <select
                    value={selectedPriority || ticket.priority}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedPriority(val)
                      updateTicket.mutate({ priority: val })
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="LOW">LOW (SLA 72 Jam)</option>
                    <option value="MEDIUM">MEDIUM (SLA 24 Jam)</option>
                    <option value="HIGH">HIGH (SLA 8 Jam)</option>
                    <option value="CRITICAL">CRITICAL (SLA 4 Jam)</option>
                  </select>
                </div>
              </>
            )}

            {/* ACTION 6: Tambah Catatan IT / Desk */}
            {canHandleTicket && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">Tambah Catatan Agent</label>
                <textarea
                  placeholder="Catatan teknis internal..."
                  value={agentTechNote}
                  onChange={(e) => setAgentTechNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400"
                />
                <button
                  onClick={() => addComment.mutate({ content: agentTechNote, isInternalNote: true })}
                  disabled={!agentTechNote.trim() || addComment.isPending}
                  className="w-full py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Simpan Catatan</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
