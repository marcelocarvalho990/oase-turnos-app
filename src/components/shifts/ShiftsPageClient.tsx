'use client'

import { useState, useEffect } from 'react'
import { Clock, Plus, Pencil, X, Timer, Trash2 } from 'lucide-react'
import { ShiftType } from '@/types'
import { useLang } from '@/hooks/useLang'

const TX = {
  pt: {
    title: 'Tipos de Turno', subtitle: (w: number, a: number) => `${w} turnos · ${a} ausências`,
    newShift: 'Novo Turno', workShifts: 'Turnos de Trabalho', absShifts: 'Ausências / Eventos',
    absLabel: 'Ausência / Evento', editShift: 'Editar Turno',
    name: 'Nome', desc: 'Descrição (opcional)', start1: 'Início 1', end1: 'Fim 1',
    duration: 'Duração (minutos)',
    cancel: 'Cancelar', saving: 'A guardar…', save: 'Guardar',
  },
  de: {
    title: 'Schichttypen', subtitle: (w: number, a: number) => `${w} Schichten · ${a} Abwesenheiten`,
    newShift: 'Neue Schicht', workShifts: 'Arbeitsschichten', absShifts: 'Abwesenheiten / Ereignisse',
    absLabel: 'Abwesenheit / Ereignis', editShift: 'Schicht bearbeiten',
    name: 'Name', desc: 'Beschreibung (optional)', start1: 'Beginn 1', end1: 'Ende 1',
    duration: 'Dauer (Minuten)',
    cancel: 'Abbrechen', saving: 'Wird gespeichert…', save: 'Speichern',
  },
}

interface Props {
  shiftTypes: ShiftType[]
}

interface EditForm {
  name: string
  startTime1: string
  endTime1: string
  durationMinutes: number
  description: string
  breakTime: string
}

interface CreateForm {
  code: string
  name: string
  description: string
  startTime1: string
  endTime1: string
  durationMinutes: number
  breakTime: string
  isAbsence: boolean
  colorPreset: number
}

function formatTime(t: string | null | undefined) {
  if (!t) return null
  return t.slice(0, 5)
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const COLOR_PRESETS = [
  { label: 'Azul', color: '#1d4ed8', bgColor: '#dbeafe', textColor: '#1e3a8a', borderColor: '#93c5fd' },
  { label: 'Verde', color: '#15803d', bgColor: '#dcfce7', textColor: '#14532d', borderColor: '#86efac' },
  { label: 'Roxo', color: '#7c3aed', bgColor: '#ede9fe', textColor: '#4c1d95', borderColor: '#c4b5fd' },
  { label: 'Laranja', color: '#c2410c', bgColor: '#ffedd5', textColor: '#7c2d12', borderColor: '#fdba74' },
  { label: 'Rosa', color: '#be185d', bgColor: '#fce7f3', textColor: '#831843', borderColor: '#f9a8d4' },
  { label: 'Cinza', color: '#374151', bgColor: '#f3f4f6', textColor: '#111827', borderColor: '#d1d5db' },
]

function ShiftCard({ shift, onEdit, onDelete, absLabel, deleting }: { shift: ShiftType; onEdit: (s: ShiftType) => void; onDelete: (s: ShiftType) => void; absLabel: string; deleting?: boolean }) {
  const t1Start = formatTime(shift.startTime1)
  const t1End = formatTime(shift.endTime1)
  const t2Start = formatTime(shift.startTime2)
  const t2End = formatTime(shift.endTime2)

  const hasTime = shift.isWorkTime && t1Start && t1End

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
      style={{
        boxShadow: '0 1px 3px rgba(0,58,93,0.07)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,58,93,0.13)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,58,93,0.07)'
      }}
    >
      {/* Colored header */}
      <div
        className="px-4 py-5 flex items-center justify-between"
        style={{ backgroundColor: shift.bgColor, borderBottom: `2px solid ${shift.borderColor}` }}
      >
        <span
          className="text-3xl font-black tracking-tight leading-none"
          style={{ color: shift.textColor }}
        >
          {shift.code}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(shift)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: shift.textColor, backgroundColor: shift.borderColor + '44' }}
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(shift)}
            disabled={deleting}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
            style={{ color: shift.textColor, backgroundColor: shift.borderColor + '44' }}
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 flex-1 flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{shift.name}</p>
        {shift.description && (
          <p className="text-xs text-slate-400">{shift.description}</p>
        )}

        {hasTime ? (
          <div className="mt-auto pt-2 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 font-mono">
                {t1Start} – {t1End}
                {t2Start && t2End ? ` | ${t2Start} – ${t2End}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer size={11} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500">{formatDuration(shift.durationMinutes)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-2 flex items-center gap-1.5">
            <span className="text-xs text-slate-400 italic">{absLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ShiftsPageClient({ shiftTypes: initial }: Props) {
  const [lang] = useLang()
  const t = TX[lang]
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(initial)
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm | null>(null)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Auto-calculate duration whenever start/end times change
  useEffect(() => {
    if (!form?.startTime1 || !form?.endTime1) return
    const [sh, sm] = form.startTime1.split(':').map(Number)
    const [eh, em] = form.endTime1.split(':').map(Number)
    let start = sh * 60 + sm
    let end = eh * 60 + em
    if (end <= start) end += 24 * 60 // overnight shift
    setForm(f => f ? { ...f, durationMinutes: end - start } : f)
  }, [form?.startTime1, form?.endTime1])

  const workShifts = shiftTypes.filter((s) => s.isWorkTime)
  const absenceShifts = shiftTypes.filter((s) => !s.isWorkTime)

  function openEdit(shift: ShiftType) {
    setEditingShift(shift)
    setForm({
      name: shift.name,
      startTime1: shift.startTime1,
      endTime1: shift.endTime1,
      durationMinutes: shift.durationMinutes,
      description: shift.description ?? '',
      breakTime: shift.breakTime ?? '',
    })
    setError(null)
  }

  function closeEdit() {
    setEditingShift(null)
    setForm(null)
    setError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingShift || !form) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/shift-types/${editingShift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          startTime1: form.startTime1,
          endTime1: form.endTime1,
          durationMinutes: Number(form.durationMinutes),
          description: form.description || null,
          breakTime: form.breakTime || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao guardar')
      }
      const saved: ShiftType = await res.json()
      setShiftTypes((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))
      closeEdit()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }


  function openCreate() {
    setCreateForm({
      code: '',
      name: '',
      description: '',
      startTime1: '',
      endTime1: '',
      durationMinutes: 480,
      breakTime: '',
      isAbsence: false,
      colorPreset: 0,
    })
    setCreateError(null)
    setCreating(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm) return
    setCreateSaving(true)
    setCreateError(null)
    try {
      const preset = COLOR_PRESETS[createForm.colorPreset]
      const res = await fetch('/api/shift-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createForm.code.toUpperCase(),
          name: createForm.name,
          description: createForm.description || null,
          startTime1: createForm.isAbsence ? '00:00' : createForm.startTime1,
          endTime1: createForm.isAbsence ? '00:00' : createForm.endTime1,
          durationMinutes: createForm.isAbsence ? 0 : Number(createForm.durationMinutes),
          breakTime: createForm.breakTime || null,
          color: preset.color,
          bgColor: preset.bgColor,
          textColor: preset.textColor,
          borderColor: preset.borderColor,
          isAbsence: createForm.isAbsence,
          isWorkTime: !createForm.isAbsence,
          sortOrder: shiftTypes.length,
          eligibleRoles: '[]',
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao criar turno')
      }
      const created: ShiftType = await res.json()
      setShiftTypes((prev) => [...prev, created])
      setCreating(false)
      setCreateForm(null)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setCreateSaving(false)
    }
  }

  async function handleDelete(shift: ShiftType) {
    if (!confirm(`Eliminar o turno "${shift.code} – ${shift.name}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(shift.id)
    try {
      const res = await fetch(`/api/shift-types/${shift.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Erro ao eliminar')
      setShiftTypes((prev) => prev.filter((s) => s.id !== shift.id))
    } catch {
      alert('Erro ao eliminar turno')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Clock size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{t.subtitle(workShifts.length, absenceShifts.length)}</p>
            </div>
          </div>
          <button
            className="bg-[#003A5D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#002D47] flex items-center gap-2"
            onClick={openCreate}
          >
            <Plus size={16} />
            {t.newShift}
          </button>
        </div>

        {/* Work shifts */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{t.workShifts}</h2>
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">{workShifts.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {workShifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} onEdit={openEdit} onDelete={handleDelete} deleting={deleting === shift.id} absLabel={t.absLabel} />
            ))}
          </div>
        </section>

        {/* Absence shifts */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{t.absShifts}</h2>
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">{absenceShifts.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {absenceShifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} onEdit={openEdit} onDelete={handleDelete} deleting={deleting === shift.id} absLabel={t.absLabel} />
            ))}
          </div>
        </section>
      </div>

      {/* Edit modal */}
      {editingShift && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span
                  className="text-xl font-black px-2 py-1 rounded-lg"
                  style={{ backgroundColor: editingShift.bgColor, color: editingShift.textColor }}
                >
                  {editingShift.code}
                </span>
                <h2 className="text-base font-semibold text-slate-900">{t.editShift}</h2>
              </div>
              <button
                onClick={closeEdit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.name}</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.desc}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => f ? { ...f, description: e.target.value } : f)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]"
                />
              </div>
              {editingShift.isWorkTime && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{t.start1}</label>
                      <input
                        type="time"
                        required
                        value={form.startTime1}
                        onChange={(e) => setForm((f) => f ? { ...f, startTime1: e.target.value } : f)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{t.end1}</label>
                      <input
                        type="time"
                        required
                        value={form.endTime1}
                        onChange={(e) => setForm((f) => f ? { ...f, endTime1: e.target.value } : f)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">{t.duration}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={1440}
                      value={form.durationMinutes}
                      onChange={(e) => setForm((f) => f ? { ...f, durationMinutes: Number(e.target.value) } : f)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Hora de refeição</label>
                    <input
                      type="time"
                      value={form.breakTime}
                      onChange={(e) => setForm((f) => f ? { ...f, breakTime: e.target.value } : f)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]"
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#003A5D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#002D47] disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.saving}
                    </>
                  ) : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {creating && createForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Novo turno</h2>
              <button onClick={() => setCreating(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{createError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Código *</label>
                  <input type="text" required maxLength={4} value={createForm.code}
                    onChange={(e) => setCreateForm((f) => f ? { ...f, code: e.target.value } : f)}
                    placeholder="ex: F2"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#003A5D]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nome *</label>
                  <input type="text" required value={createForm.name}
                    onChange={(e) => setCreateForm((f) => f ? { ...f, name: e.target.value } : f)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descrição</label>
                <input type="text" value={createForm.description}
                  onChange={(e) => setCreateForm((f) => f ? { ...f, description: e.target.value } : f)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isAbsence" checked={createForm.isAbsence}
                  onChange={(e) => setCreateForm((f) => f ? { ...f, isAbsence: e.target.checked } : f)}
                  className="rounded" />
                <label htmlFor="isAbsence" className="text-xs font-medium text-slate-700">Ausência (férias, doença, etc.)</label>
              </div>
              {!createForm.isAbsence && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Início *</label>
                      <input type="time" required value={createForm.startTime1}
                        onChange={(e) => setCreateForm((f) => f ? { ...f, startTime1: e.target.value } : f)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Fim *</label>
                      <input type="time" required value={createForm.endTime1}
                        onChange={(e) => setCreateForm((f) => f ? { ...f, endTime1: e.target.value } : f)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Duração (minutos)</label>
                    <input type="number" min={1} max={1440} value={createForm.durationMinutes}
                      onChange={(e) => setCreateForm((f) => f ? { ...f, durationMinutes: Number(e.target.value) } : f)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Hora de refeição</label>
                    <input type="time" value={createForm.breakTime}
                      onChange={(e) => setCreateForm((f) => f ? { ...f, breakTime: e.target.value } : f)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map((preset, i) => (
                    <button key={i} type="button"
                      onClick={() => setCreateForm((f) => f ? { ...f, colorPreset: i } : f)}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${createForm.colorPreset === i ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: preset.bgColor, borderColor: createForm.colorPreset === i ? preset.color : 'transparent' }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <div className="mt-2 px-2 py-1 rounded-lg text-sm font-black inline-block"
                  style={{ backgroundColor: COLOR_PRESETS[createForm.colorPreset].bgColor, color: COLOR_PRESETS[createForm.colorPreset].textColor }}>
                  {createForm.code || 'XX'}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setCreating(false)}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={createSaving}
                  className="bg-[#003A5D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#002D47] disabled:opacity-60 flex items-center gap-2">
                  {createSaving ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />A criar...</>
                  ) : 'Criar turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}