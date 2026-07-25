import { useState, useEffect } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Type,
  AlignLeft,
  ListFilter,
  Radio,
  CheckSquare,
  Calendar,
  Hash,
  Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FIELD_TYPES = [
  { id: 'SHORT_TEXT', label: 'Teks Pendek', icon: Type },
  { id: 'PARAGRAPH', label: 'Paragraf', icon: AlignLeft },
  { id: 'DROPDOWN', label: 'Dropdown Select', icon: ListFilter },
  { id: 'RADIO', label: 'Radio Choice', icon: Radio },
  { id: 'CHECKBOXES', label: 'Checkboxes', icon: CheckSquare },
  { id: 'DATE', label: 'Tanggal', icon: Calendar },
  { id: 'NUMBER', label: 'Angka', icon: Hash },
  { id: 'FILE_UPLOAD', label: 'Upload Lampiran', icon: Paperclip },
] as const

type FieldType = (typeof FIELD_TYPES)[number]['id']

interface Field {
  tempId: string
  label: string
  fieldType: FieldType
  isRequired: boolean
  options: string[]
}

function SortableField({
  field,
  onChange,
  onRemove,
}: {
  field: Field
  onChange: (f: Field) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.tempId,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const hasOptions = ['DROPDOWN', 'RADIO', 'CHECKBOXES'].includes(field.fieldType)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 transition-all',
        isDragging && 'opacity-50 border-slate-400 scale-[1.01] shadow-lg z-50 bg-white'
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Label Input */}
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Nama / Label Field (Contoh: Deskripsi Masalah)..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-slate-400 transition-colors"
        />

        {/* Field Type Select */}
        <select
          value={field.fieldType}
          onChange={(e) => onChange({ ...field, fieldType: e.target.value as FieldType })}
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-slate-400 transition-colors"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} ({t.id})
            </option>
          ))}
        </select>

        {/* Required Toggle */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={field.isRequired}
            onChange={(e) => onChange({ ...field, isRequired: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span>Wajib</span>
        </label>

        {/* Delete */}
        <button
          onClick={onRemove}
          type="button"
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Hapus Field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Options Builder */}
      {hasOptions && (
        <div className="pl-8 pt-2 border-t border-slate-200/80 space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Opsi Pilihan ({field.options.length}):
          </p>
          <div className="space-y-2">
            {field.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const opts = [...field.options]
                    opts[i] = e.target.value
                    onChange({ ...field, options: opts })
                  }}
                  placeholder={`Opsi ${i + 1}`}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...field, options: field.options.filter((_, j) => j !== i) })
                  }
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...field, options: [...field.options, ''] })}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Opsi</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function FormBuilder({ categoryId, onSaved }: { categoryId: string; onSaved?: () => void }) {
  const { data: initial } = useQuery({
    queryKey: ['form-schema', categoryId],
    queryFn: () =>
      apiFetch<
        {
          id: string
          label: string
          fieldType: string
          options: string[] | null
          isRequired: boolean
          order: number
        }[]
      >(`/categories/${categoryId}/form-schema`),
  })

  const [fields, setFields] = useState<Field[]>([])

  useEffect(() => {
    if (initial) {
      setFields(
        initial.map((f) => ({
          tempId: f.id || crypto.randomUUID(),
          label: f.label,
          fieldType: f.fieldType as FieldType,
          isRequired: f.isRequired,
          options: (f.options as string[]) ?? [],
        }))
      )
    }
  }, [initial])

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/categories/${categoryId}/form-schema`, {
        method: 'PUT',
        body: JSON.stringify(
          fields.map((f, i) => ({
            label: f.label,
            fieldType: f.fieldType,
            options: f.options.length ? f.options : null,
            isRequired: f.isRequired,
            order: i + 1,
          }))
        ),
      }),
    onSuccess: onSaved,
  })

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      setFields((fs) => {
        const from = fs.findIndex((x) => x.tempId === active.id)
        const to = fs.findIndex((x) => x.tempId === over.id)
        return arrayMove(fs, from, to)
      })
    }
  }

  return (
    <div className="space-y-4">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.tempId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {fields.map((f) => (
              <SortableField
                key={f.tempId}
                field={f}
                onChange={(updated) =>
                  setFields((fs) => fs.map((x) => (x.tempId === f.tempId ? updated : x)))
                }
                onRemove={() => setFields((fs) => fs.filter((x) => x.tempId !== f.tempId))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-1">
          <p className="text-sm font-semibold text-slate-700">
            Belum ada field kustom untuk kategori ini.
          </p>
          <p className="text-xs text-slate-400">
            Klik "Tambah Field Baru" di bawah untuk mengatur atribut form.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() =>
            setFields((f) => [
              ...f,
              {
                tempId: crypto.randomUUID(),
                label: '',
                fieldType: 'SHORT_TEXT',
                isRequired: false,
                options: [],
              },
            ])
          }
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4 text-slate-600" />
          <span>Tambah Field Baru</span>
        </button>

        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 ml-auto"
        >
          {save.isPending ? (
            <span>Menyimpan...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Skema Form</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
