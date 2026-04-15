'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Umbrella } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

type ConfType = 'WORKED' | 'EARLY_DEPARTURE' | 'ABSENT'
type Lang = 'pt' | 'de'

interface ShiftInfo { code: string; startTime1: string; endTime1: string; color: string }
interface AssignmentRow { date: string; shiftType: ShiftInfo | null }
interface AbsenceDay { date: string; type: string }
interface CalendarResp {
  published: boolean
  assignments: AssignmentRow[]
  absences: AbsenceDay[]
  hours: null | { workedMinutes: number; targetMinutes: number; workPercentage: number }
}
interface Confirmation {
  id: string; date: string; shiftCode: string; type: string; actualEnd: string | null; reason: string | null
}

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

const CONF_LABELS: Record<ConfType, Record<Lang, string>> = {
  WORKED:          { pt: 'Trabalhei',      de: 'Gearbeitet'    },
  EARLY_DEPARTURE: { pt: 'Saí mais cedo',  de: 'Früh gegangen' },
  ABSENT:          { pt: 'Faltei',         de: 'Abwesend'      },
}

const TYPE_STYLE: Record<ConfType, { color: string; bg: string; icon: typeof Clock }> = {
  WORKED:          { color: '#059669', bg: '#D1FAE5', icon: CheckCircle2  },
  EARLY_DEPARTURE: { color: '#D97706', bg: '#FEF3C7', icon: Clock         },
  ABSENT:          { color: '#DC2626', bg: '#FEE2E2', icon: AlertTriangle },
}

function fmtDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + 'T00:00:00')
  const wd = lang === 'pt' ? WEEKDAYS_PT[d.getDay()] : WEEKDAYS_DE[d.getDay()]
  return `${String(d.getDate()).padStart(2, '0')} ${wd}`
}

export default function RegistoClient() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [lang, toggleLang] = useLang()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [calData, setCalData] = useState<CalendarResp | null>(null)
  const [confirmations, setConfirmations] = useState<Confirmation[]>([])
  const [loading, setLoading] = useState(false)

  // Which row is expanded for editing
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confType, setConfType] = useState<ConfType>('WORKED')
  const [confActualEnd, setConfActualEnd] = useState('')
  const [confReason, setConfReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const MONTHS = lang === 'pt' ? MONTHS_PT : MONTHS_DE

  useEffect(() => {
    setLoading(true)
    setExpanded(null)
    Promise.all([
      fetch(`/api/employee/calendar?year=${year}&month=${month}`).then(r => r.json()),
      fetch('/api/confirmations').then(r => r.json()),
    ]).then(([cal, confs]) => {
      setCalData(Array.isArray(cal) ? { published: true, assignments: cal, absences: [], hours: null } : cal)
      if (Array.isArray(confs)) setConfirmations(confs)
    }).finally(() => setLoading(false))
  }, [year, month])

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const confMap = new Map<string, Confirmation>()
  confirmations.forEach(c => confMap.set(c.date, c))

  const absenceMap = new Map<string, string>()
  ;(calData?.absences ?? []).forEach(a => absenceMap.set(a.date, a.type))

  function openRow(date: string, existingConf?: Confirmation) {
    if (expanded === date) { setExpanded(null); return }
    setConfType((existingConf?.type as ConfType) ?? 'WORKED')
    setConfActualEnd(existingConf?.actualEnd ?? '')
    setConfReason(existingConf?.reason ?? '')
    setSaveError('')
    setExpanded(date)
  }

  async function saveConf(date: string, shiftCode: string) {
    if (confType === 'EARLY_DEPARTURE' && !confActualEnd) {
      setSaveError(lang === 'pt' ? 'Indica a hora de saída' : 'Bitte Abgangszeit angeben')
      return
    }
    if (confType === 'ABSENT' && !confReason.trim()) {
      setSaveError(lang === 'pt' ? 'O motivo é obrigatório' : 'Grund erforderlich')
      return
    }
    setSaving(true); setSaveError('')
    try {
      const r = await fetch('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, shiftCode, type: confType,
          actualEnd: confType === 'EARLY_DEPARTURE' ? confActualEnd : undefined,
          reason: confReason.trim() || undefined,
        }),
      })
      if (!r.ok) {
        const d = await r.json() as { error?: string }
        setSaveError(d.error ?? 'Erro')
        return
      }
      const saved = await r.json() as Confirmation
      setConfirmations(prev => [...prev.filter(c => c.date !== date), saved])
      setExpanded(null)
    } finally {
      setSaving(false)
    }
  }

  // Build rows: assignments + absence days, sorted by date
  type Row = { date: string; type: 'shift'; shift: ShiftInfo } | { date: string; type: 'absence'; absenceType: string }
  const rows: Row[] = []

  ;(calData?.assignments ?? []).forEach(a => {
    if (a.shiftType) rows.push({ date: a.date, type: 'shift', shift: a.shiftType })
  })
  ;(calData?.absences ?? []).forEach(a => {
    if (!rows.find(r => r.date === a.date)) {
      rows.push({ date: a.date, type: 'absence', absenceType: a.type })
    }
  })
  rows.sort((a, b) => a.date.localeCompare(b.date))

  const isPublished = calData?.published ?? false

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#003A5D', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {lang === 'pt' ? 'Registo de Turnos' : 'Schichtprotokoll'}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono', monospace" }}>
            {MONTHS[month - 1].toUpperCase()} {year}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={toggleLang} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {lang === 'pt' ? 'DE' : 'PT'}
          </button>
          <button onClick={prevMonth} style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, cursor: 'pointer', display: 'flex', color: 'white' }}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={nextMonth} style={{ padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, cursor: 'pointer', display: 'flex', color: 'white' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>
        {loading && (
          <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0', fontFamily: "'IBM Plex Mono', monospace" }}>
            {lang === 'pt' ? 'A carregar...' : 'Lädt...'}
          </p>
        )}

        {!loading && !isPublished && (
          <div style={{ padding: '16px 20px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12 }}>
            <div style={{ fontSize: '1.1rem' }}>📋</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#92400E', marginBottom: 2 }}>
                {lang === 'pt' ? 'Escala não publicada' : 'Dienstplan nicht veröffentlicht'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#B45309' }}>
                {lang === 'pt' ? 'O gestor ainda não publicou a escala deste mês.' : 'Der Manager hat den Dienstplan noch nicht veröffentlicht.'}
              </div>
            </div>
          </div>
        )}

        {!loading && isPublished && rows.length === 0 && (
          <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>
            {lang === 'pt' ? 'Sem turnos registados neste mês.' : 'Keine Schichten in diesem Monat.'}
          </p>
        )}

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(row => {
            const isPast = row.date < todayStr
            const isToday = row.date === todayStr
            const conf = confMap.get(row.date)
            const isOpen = expanded === row.date
            const canRegister = isPast && row.type === 'shift'

            if (row.type === 'absence') {
              return (
                <div key={row.date} style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', fontWeight: 600, color: '#4A6878', minWidth: 60 }}>
                    {fmtDate(row.date, lang)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Umbrella size={14} color="#16A34A" />
                    <span style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 500 }}>{row.absenceType}</span>
                  </div>
                </div>
              )
            }

            // Shift row
            const conf_type = conf?.type as ConfType | undefined
            const typeStyle = conf_type ? TYPE_STYLE[conf_type] : null
            const TypeIcon = typeStyle?.icon

            return (
              <div key={row.date} style={{ background: 'white', border: `1px solid ${isOpen ? '#003A5D' : '#D8E2E8'}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                {/* Main row */}
                <div
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: canRegister ? 'pointer' : 'default' }}
                  onClick={() => canRegister ? openRow(row.date, conf) : undefined}
                >
                  {/* Date */}
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', fontWeight: isToday ? 700 : 500, color: isToday ? '#003A5D' : isPast ? '#4A6878' : '#94A3B8', minWidth: 60 }}>
                    {fmtDate(row.date, lang)}
                  </div>

                  {/* Shift badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: row.shift.color + '18', borderLeft: `3px solid ${row.shift.color}`, borderRadius: '0 4px 4px 0', minWidth: 80 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.78rem', fontWeight: 700, color: '#001E30' }}>{row.shift.code}</span>
                    <span style={{ fontSize: '0.68rem', color: '#7A9BAD' }}>{row.shift.startTime1}–{row.shift.endTime1}</span>
                  </div>

                  {/* Confirmation status or action */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    {conf && typeStyle && TypeIcon && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: typeStyle.bg, borderRadius: 20, fontSize: '0.72rem', fontWeight: 500, color: typeStyle.color }}>
                        <TypeIcon size={12} />
                        {CONF_LABELS[conf_type!][lang]}
                        {conf.actualEnd && <span style={{ opacity: 0.75 }}>({conf.actualEnd})</span>}
                      </div>
                    )}
                    {!conf && canRegister && (
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        {lang === 'pt' ? 'Sem registo' : 'Nicht erfasst'}
                      </span>
                    )}
                    {!canRegister && !isToday && (
                      <span style={{ fontSize: '0.7rem', color: '#C8D8E0', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {lang === 'pt' ? 'futuro' : 'Zukunft'}
                      </span>
                    )}
                    {canRegister && (
                      <div style={{ color: '#7A9BAD' }}>
                        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded form */}
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F0F4F6' }}>
                    <div style={{ paddingTop: 14 }}>
                      {/* Type selector */}
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#7A9BAD', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                        {lang === 'pt' ? 'O que aconteceu?' : 'Was ist passiert?'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {(['WORKED', 'EARLY_DEPARTURE', 'ABSENT'] as ConfType[]).map(t => {
                          const ts = TYPE_STYLE[t]
                          const Icon = ts.icon
                          const selected = confType === t
                          return (
                            <button
                              key={t}
                              onClick={() => { setConfType(t); setSaveError('') }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                                border: `1.5px solid ${selected ? ts.color : '#D8E2E8'}`,
                                borderRadius: 20, background: selected ? ts.bg : 'white',
                                color: selected ? ts.color : '#7A9BAD', fontSize: '0.78rem',
                                fontWeight: selected ? 600 : 400, cursor: 'pointer',
                                fontFamily: "'IBM Plex Sans', sans-serif",
                              }}
                            >
                              <Icon size={12} />
                              {CONF_LABELS[t][lang]}
                            </button>
                          )
                        })}
                      </div>

                      {/* Extra fields */}
                      {confType === 'EARLY_DEPARTURE' && (
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#4A6878', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {lang === 'pt' ? 'Hora de saída' : 'Abgangszeit'}
                          </label>
                          <input type="time" value={confActualEnd} onChange={e => setConfActualEnd(e.target.value)}
                            style={{ padding: '7px 10px', border: '1.5px solid #D8E2E8', borderRadius: 6, fontSize: '0.85rem', color: '#001E30', outline: 'none', background: '#F8FAFC', width: 140 }} />
                        </div>
                      )}

                      {(confType === 'EARLY_DEPARTURE' || confType === 'ABSENT') && (
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#4A6878', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {lang === 'pt' ? `Motivo${confType === 'ABSENT' ? ' *' : ' (opcional)'}` : `Grund${confType === 'ABSENT' ? ' *' : ' (optional)'}`}
                          </label>
                          <textarea value={confReason} onChange={e => setConfReason(e.target.value)} rows={2}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', border: '1.5px solid #D8E2E8', borderRadius: 6, fontSize: '0.82rem', color: '#001E30', outline: 'none', resize: 'none', background: '#F8FAFC', fontFamily: "'IBM Plex Sans', sans-serif' " }}
                            placeholder={lang === 'pt' ? 'Descreve brevemente...' : 'Kurze Beschreibung...'} />
                        </div>
                      )}

                      {saveError && (
                        <div style={{ padding: '6px 10px', background: '#FEE2E2', borderRadius: 5, fontSize: '0.74rem', color: '#DC2626', marginBottom: 10 }}>
                          {saveError}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setExpanded(null)} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #D8E2E8', background: 'transparent', color: '#7A9BAD', fontSize: '0.78rem', cursor: 'pointer' }}>
                          {lang === 'pt' ? 'Cancelar' : 'Abbrechen'}
                        </button>
                        <button
                          onClick={() => saveConf(row.date, row.shift.code)}
                          disabled={saving}
                          style={{ padding: '7px 16px', background: saving ? '#7AA8C0' : '#003A5D', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                        >
                          {saving ? (lang === 'pt' ? 'A guardar...' : 'Speichern...') : (lang === 'pt' ? 'Guardar' : 'Speichern')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
