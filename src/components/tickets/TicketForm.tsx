import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { apiFetch } from '@/lib/api'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FormField {
  id: string
  label: string
  fieldType:
    | 'SHORT_TEXT'
    | 'PARAGRAPH'
    | 'DROPDOWN'
    | 'RADIO'
    | 'CHECKBOXES'
    | 'DATE'
    | 'NUMBER'
    | 'FILE_UPLOAD'
  options: string[] | null
  isRequired: boolean
  order: number
}

export function TicketForm({
  categoryId,
  onSubmit,
}: {
  categoryId: string
  onSubmit: (data: {
    subject: string
    priority: string
    fieldValues: { formFieldId: string; value: string }[]
  }) => void
}) {
  const { data: fields, isLoading } = useQuery<FormField[]>({
    queryKey: ['form-schema', categoryId],
    queryFn: () => apiFetch(`/categories/${categoryId}/form-schema`),
    enabled: !!categoryId,
  })
  const { register, handleSubmit, watch, setValue } = useForm()
  const currentPriority = watch('__priority', 'MEDIUM')

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Memuat formulir...</div>
  }

  const submit = (values: Record<string, unknown>) => {
    const fieldValues = (fields ?? []).map((f) => {
      const rawVal = values[f.id]
      let valStr = ''
      if (f.fieldType === 'FILE_UPLOAD' && rawVal instanceof FileList) {
        valStr = rawVal.length > 0 ? rawVal[0].name : ''
      } else if (Array.isArray(rawVal)) {
        valStr = (rawVal as string[]).join(', ')
      } else {
        valStr = String(rawVal ?? '')
      }

      return {
        formFieldId: f.id,
        value: valStr,
      }
    })

    onSubmit({
      subject: String(values.__subject ?? ''),
      priority: String(values.__priority ?? 'MEDIUM'),
      fieldValues,
    })
  }

  const priorityOptions = [
    { id: 'LOW', label: 'Low', desc: 'Rendah (SLA 72 Jam)' },
    { id: 'MEDIUM', label: 'Medium', desc: 'Normal (SLA 24 Jam)' },
    { id: 'HIGH', label: 'High', desc: 'Mendesak (SLA 8 Jam)' },
    { id: 'CRITICAL', label: 'Critical', desc: 'Kritis (SLA 4 Jam)' },
  ]

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Subjek Utama */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Subjek Permohonan / Ringkasan Masalah <span className="text-rose-500">*</span>
        </label>
        <input
          {...register('__subject', { required: true })}
          placeholder="Contoh: Laptop mati total / Permintaan lisensi Microsoft 365..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
        />
      </div>

      {/* Prioritas Selection Pills */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">Tingkat Urgensi / Prioritas</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {priorityOptions.map((p) => {
            const isSelected = currentPriority === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setValue('__priority', p.id)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                <p className="font-bold text-xs">{p.label}</p>
                <p className={cn('text-[10px] mt-0.5', isSelected ? 'text-slate-300' : 'text-slate-500')}>
                  {p.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dynamic Fields */}
      {(fields ?? []).map((f) => (
        <div key={f.id} className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700">
            {f.label} {f.isRequired && <span className="text-rose-500">*</span>}
          </label>

          {f.fieldType === 'SHORT_TEXT' && (
            <input
              {...register(f.id, { required: f.isRequired })}
              placeholder={`Isikan ${f.label.toLowerCase()}...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
            />
          )}

          {f.fieldType === 'PARAGRAPH' && (
            <textarea
              {...register(f.id, { required: f.isRequired })}
              rows={3}
              placeholder={`Jelaskan secara rinci ${f.label.toLowerCase()}...`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
            />
          )}

          {f.fieldType === 'NUMBER' && (
            <input
              type="number"
              {...register(f.id, { required: f.isRequired })}
              placeholder="0"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
            />
          )}

          {f.fieldType === 'DATE' && (
            <input
              type="date"
              {...register(f.id, { required: f.isRequired })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
            />
          )}

          {f.fieldType === 'FILE_UPLOAD' && (
            <input type="file" {...register(f.id)} className="w-full text-xs text-slate-600" />
          )}

          {f.fieldType === 'DROPDOWN' && (
            <select
              {...register(f.id, { required: f.isRequired })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-slate-400 transition-colors"
            >
              <option value="">— Pilih Opsi —</option>
              {(f.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}

          {f.fieldType === 'RADIO' && (
            <div className="space-y-1.5 pt-1">
              {(f.options ?? []).map((o) => (
                <label key={o} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    value={o}
                    {...register(f.id, { required: f.isRequired })}
                    className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-900"
                  />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          )}

          {f.fieldType === 'CHECKBOXES' && (
            <div className="space-y-1.5 pt-1">
              {(f.options ?? []).map((o) => (
                <label key={o} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    value={o}
                    {...register(f.id)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        <Send className="w-4 h-4" />
        <span>Kirim Tiket Permohonan</span>
      </button>
    </form>
  )
}
