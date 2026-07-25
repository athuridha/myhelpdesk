import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { TicketForm } from '@/components/tickets/TicketForm'
import { TopBar } from '@/components/layout/TopBar'
import { PlusCircle, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Division {
  id: string
  name: string
  code: string
  accountMode: string
}

interface Category {
  id: string
  name: string
  divisionId: string
  division: { name: string; code: string }
}

export function NewTicketPage() {
  const navigate = useNavigate()
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  // Fetch all Divisions
  const { data: divisions } = useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: () => apiFetch('/divisions'),
  })

  // Fetch Categories filtered by selected Division
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories', selectedDivisionId],
    queryFn: () => apiFetch(`/categories?divisionId=${selectedDivisionId}`),
    enabled: !!selectedDivisionId,
  })

  const create = useMutation({
    mutationFn: (payload: {
      subject: string
      priority: string
      fieldValues: { formFieldId: string; value: string }[]
    }) =>
      apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({ ...payload, categoryId: selectedCategoryId }),
      }),
    onSuccess: () => navigate('/tickets'),
  })

  const selectedDivision = divisions?.find((d) => d.id === selectedDivisionId)
  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <TopBar title="Buat Tiket Baru" />

      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6 md:space-y-8">
        {/* Header Title */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
            <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>Pengajuan Bantuan</span>
          </div>
          <h1 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Buat Permohonan Tiket Baru
          </h1>
          <p className="text-slate-500 text-xs md:text-sm">
            Pilih divisi tujuan dan kategori layanan untuk membuka tiket bantuan baru.
          </p>
        </div>

        {/* STEP 1: Pilih Divisi Tujuan */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono shrink-0">
                1
              </span>
              <span>Pilih Divisi Tujuan</span>
            </h2>
            {selectedDivisionId && (
              <button
                onClick={() => {
                  setSelectedDivisionId('')
                  setSelectedCategoryId('')
                }}
                className="text-xs text-slate-500 hover:text-slate-900 font-semibold"
              >
                Ganti Divisi
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {divisions?.map((d) => {
              const isSelected = selectedDivisionId === d.id
              return (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedDivisionId(d.id)
                    setSelectedCategoryId('')
                  }}
                  className={cn(
                    'p-4 rounded-2xl bg-white border text-left cursor-pointer transition-all space-y-2',
                    isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
                      : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 text-xs flex items-center justify-center">
                      {d.code}
                    </span>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-slate-900" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{d.name}</h3>
                    <p className="text-[11px] text-slate-500">Divisi Penanganan Tiket</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 2: Pilih Kategori Layanan per Divisi */}
        {selectedDivisionId && (
          <div className="space-y-3 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono shrink-0">
                  2
                </span>
                <span>Pilih Kategori Layanan ({selectedDivision?.name})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories?.map((c) => {
                const isSelected = selectedCategoryId === c.id
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCategoryId(c.id)}
                    className={cn(
                      'p-4 rounded-2xl bg-white border text-left cursor-pointer transition-all space-y-1',
                      isSelected
                        ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
                        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-slate-900" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                )
              })}
              {categories?.length === 0 && (
                <div className="col-span-2 p-6 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                  Belum ada kategori untuk divisi ini.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Isi Form Tiket Dinamis */}
        {selectedCategoryId && (
          <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-mono shrink-0">
                  3
                </span>
                <span>Isi Rincian Tiket ({selectedCategory?.name})</span>
              </h2>
            </div>

            <div className="p-4 sm:p-6 md:p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              {create.isError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium mb-4">
                  {(create.error as Error).message}
                </div>
              )}

              <TicketForm
                categoryId={selectedCategoryId}
                onSubmit={(d) => create.mutate(d)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
