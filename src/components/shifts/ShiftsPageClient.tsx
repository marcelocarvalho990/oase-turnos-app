'use client'

import { useState } from 'react'
import { Clock, Plus, Pencil, X, Timer } from 'lucide-react'
import { ShiftType } from '@/types'
import { useLang } from '@/hooks/useLang'

const TX = {
  pt: {
    title: 'Tipos de Turno', subtitle: (w: number, a: number) => `${w} turnos · ${a} ausências`,
    newShift: 'Novo Turno', workShifts: 'Turnos de Trabalho', absShifts: 'Ausências / Eventos',
    absLabel: 'Ausência / Evento', editShift: 'Editar Turno',
    name: 'Nome', desc: 'Descrição (opcional)', start1: 'Início 1', end1: 'Fim 1',
    start2: 'Início 2 (opcional)', end2: 'Fim 2 (opcional)', duration: 'Duração (minutos)',
    cancel: 'Cancelar', saving: 'A guardar…', save: 'Guardar',
  },
  de: {
    title: 'Schichttypen', subtitle: (w: number, a: number) => `${w} Schichten · ${a} Abwesenheiten`,
    newShift: 'Neue Schicht', workShifts: 'Arbeitsschichten', absShifts: 'Abwesenheiten / Ereignisse',
    absLabel: 'Abwesenheit / Ereignis', editShift: 'Schicht bearbeiten',
    name: 'Name', desc: 'Beschreibung (optional)', start1: 'Beginn 1', end1: 'Ende 1',
    start2: 'Beginn 2 (optional)', end2: 'Ende 2 (optional)', duration: 'Dauer (Minuten)',
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
  startTime2: string
  endTime2: string
  durationMinutes: number
  description: string
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

function ShiftCard({ shift, onEdit, absLabel }: { shift: ShiftType; onEdit: (s: ShiftType) => void; absLabel: string }) {
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
        <button
          onClick={() => onEdit(shift)}
          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: shift.textColor, backgroundColor: shift.borderColor + '44' }}
          title="Editar"
        >
          <Pencil size={13} />
        </button>
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

  const workShifts = shiftTypes.filter((s) => s.isWorkTime)
  const absenceShifts = shiftTypes.filter((s) => !s.isWorkTime)

  function openEdit(shift: ShiftType) {
    setEditingShift(shift)
    setForm({
      name: shift.name,
      startTime1: shift.startTime1,
      endTime1: shift.endTime1,
      startTime2: shift.startTime2 ?? '',
      endTime2: shift.endTime2 ?? '',
      durationMinutes: shift.durationMinutes,
      description: shift.description ?? '',
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
          ...editingShift,
          name: form.name,
          startTime1: form.startTime1,
          endTime1: form.endTime1,
          startTime2: form.startTime2 || null,
          endTime2: form.endTime2 || null,
          durationMinutes: Number(form.durationMinutes),
          description: form.description || null,
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
            className="bg-[#003A5D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#002D47] flex items-center gap-2 opacity-50 cursor-not-allowed"
            title="Em breve"
            disabled
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
              <ShiftCard key={shift.id} shift={shift} onEdit={openEdit} absLabel={t.absLabel} />
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
              <ShiftCard key={shift.id} shift={shift} onEdit={openEdit} absLabel={t.absLabel} />
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
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{t.start2}</label>
                      <input
                        type="time"
                        value={form.startTime2}
                        onChange={(e) => setForm((f) => f ? { ...f, startTime2: e.target.value } : f)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003A5D]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{t.end2}</label>
                      <input
                        type="time"
                        value={form.endTime2}
                        onChange={(e) => setForm((f) => f ? { ...f, endTime2: e.target.value } : f)}
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
    </div>
  )
}
