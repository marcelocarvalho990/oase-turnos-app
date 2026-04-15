'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Umbrella, TrendingUp, TrendingDown, Minus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

interface ShiftType {
  id: string; name: string; code: string; color: string; startTime1: string; endTime1: string
}
interface Assignment { date: string; shiftType: ShiftType | null }
interface AbsenceDay { date: string; type: string }
interface HoursData { workedMinutes: number; targetMinutes: number; workPercentage: number }
interface CalendarResponse {
  published: boolean
  assignments: Assignment[]
  absences: AbsenceDay[]
  hours: HoursData | null
}
interface Confirmation { date: string; type: string; actualEnd: string | null }
interface Props { employeeId: string; employeeName: string; shiftTypes: ShiftType[] }

type ViewMode = 'month' | 'week' | 'day'
type Lang = 'pt' | 'de'

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WEEKDAYS_LONG_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const WEEKDAYS_LONG_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

const VIEW_LABELS: Record<ViewMode, Record<Lang, string>> = {
  month: { pt: 'Mensal',  de: 'Monatlich'   },
  week:  { pt: 'Semanal', de: 'Wöchentlich' },
  day:   { pt: 'Diário',  de: 'Täglich'     },
}

const CONF_LABELS: Record<string, Record<Lang, string>> = {
  WORKED:          { pt: 'Confirmado',    de: 'Bestätigt'  },
  EARLY_DEPARTURE: { pt: 'Saída antecip.', de: 'Früh weg' },
  ABSENT:          { pt: 'Falta',          de: 'Abwesend'  },
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

function weekStartOf(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() - ((dow + 6) % 7)) // Monday
  return d
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDays(date: Date): Date[] {
  const ws = weekStartOf(date)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d })
}

const NAV_BTN: React.CSSProperties = {
  padding: '5px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 2, cursor: 'pointer', display: 'flex', color: 'white',
}

export default function EmployeeCalendarClient({ shiftTypes }: Props) {
  const today = new Date()
  const todayStr = toDateStr(today)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [data, setData] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [lang, toggleLang] = useLang()
  const [confirmations, setConfirmations] = useState<Confirmation[]>([])
  const [view, setView] = useState<ViewMode>('month')
  const [focusDate, setFocusDate] = useState<Date>(today)

  const WEEKDAYS = lang === 'pt' ? WEEKDAYS_PT : WEEKDAYS_DE
  const WEEKDAYS_LONG = lang === 'pt' ? WEEKDAYS_LONG_PT : WEEKDAYS_LONG_DE
  const MONTHS = lang === 'pt' ? MONTHS_PT : MONTHS_DE

  useEffect(() => {
    setLoading(true)
    fetch(`/api/employee/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then((d: CalendarResponse | Assignment[]) => {
        setData(Array.isArray(d) ? { published: true, assignments: d, absences: [], hours: null } : d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year, month])

  useEffect(() => {
    fetch('/api/confirmations')
      .then(r => r.json())
      .then((d: Confirmation[]) => { if (Array.isArray(d)) setConfirmations(d) })
      .catch(() => {})
  }, [year, month])

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  function prevWeek() {
    setFocusDate(d => {
      const nd = new Date(d); nd.setDate(d.getDate() - 7)
      if (nd.getFullYear() !== year || nd.getMonth() + 1 !== month) {
        setYear(nd.getFullYear()); setMonth(nd.getMonth() + 1)
      }
      return nd
    })
  }
  function nextWeek() {
    setFocusDate(d => {
      const nd = new Date(d); nd.setDate(d.getDate() + 7)
      if (nd.getFullYear() !== year || nd.getMonth() + 1 !== month) {
        setYear(nd.getFullYear()); setMonth(nd.getMonth() + 1)
      }
      return nd
    })
  }
  function prevDay() {
    setFocusDate(d => {
      const nd = new Date(d); nd.setDate(d.getDate() - 1)
      if (nd.getFullYear() !== year || nd.getMonth() + 1 !== month) {
        setYear(nd.getFullYear()); setMonth(nd.getMonth() + 1)
      }
      return nd
    })
  }
  function nextDay() {
    setFocusDate(d => {
      const nd = new Date(d); nd.setDate(d.getDate() + 1)
      if (nd.getFullYear() !== year || nd.getMonth() + 1 !== month) {
        setYear(nd.getFullYear()); setMonth(nd.getMonth() + 1)
      }
      return nd
    })
  }

  const assignments = data?.assignments ?? []
  const absences = data?.absences ?? []
  const published = data?.published ?? null
  const hours = data?.hours ?? null

  const assignmentMap = useMemo(() => {
    const m = new Map<string, Assignment>()
    assignments.forEach(a => m.set(a.date, a))
    return m
  }, [assignments])

  const absenceMap = useMemo(() => {
    const m = new Map<string, string>()
    absences.forEach(a => m.set(a.date, a.type))
    return m
  }, [absences])

  const confMap = useMemo(() => {
    const m = new Map<string, Confirmation>()
    confirmations.forEach(c => m.set(c.date, c))
    return m
  }, [confirmations])

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const shiftCounts = new Map<string, number>()
  assignments.forEach(a => {
    if (!a.shiftType) return
    shiftCounts.set(a.shiftType.code, (shiftCounts.get(a.shiftType.code) ?? 0) + 1)
  })

  const deltaMinutes = hours ? hours.workedMinutes - hours.targetMinutes : 0
  const pct = hours && hours.targetMinutes > 0 ? Math.min(100, Math.round((hours.workedMinutes / hours.targetMinutes) * 100)) : 0

  // Header label for week/day views
  const weekDays = getWeekDays(focusDate)
  const weekLabel = `${weekDays[0].getDate()} – ${weekDays[6].toLocaleString(lang === 'de' ? 'de-DE' : 'pt-PT', { day: 'numeric', month: 'short' })}`
  const dayLabelLong = `${WEEKDAYS_LONG[focusDate.getDay()]}, ${focusDate.getDate()} ${MONTHS[focusDate.getMonth()]}`

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#003A5D', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {lang === 'pt' ? 'O Meu Calendário' : 'Mein Kalender'}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono', monospace" }}>
            {MONTHS[month - 1].toUpperCase()} {year}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: 5, padding: 2, gap: 1 }}>
            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '3px 10px', borderRadius: 3, border: 'none',
                  background: view === v ? 'rgba(255,255,255,0.9)' : 'transparent',
                  color: view === v ? '#003A5D' : 'rgba(255,255,255,0.65)',
                  fontSize: '0.68rem', fontWeight: view === v ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {VIEW_LABELS[v][lang]}
              </button>
            ))}
          </div>
          <button onClick={toggleLang} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {lang === 'pt' ? 'DE' : 'PT'}
          </button>
          {/* Month / week / day navigation */}
          {view === 'month' ? (
            <>
              <button onClick={prevMonth} style={NAV_BTN}><ChevronLeft size={14} /></button>
              <button onClick={nextMonth} style={NAV_BTN}><ChevronRight size={14} /></button>
            </>
          ) : view === 'week' ? (
            <>
              <button onClick={prevWeek} style={NAV_BTN}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', minWidth: 100, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>{weekLabel}</span>
              <button onClick={nextWeek} style={NAV_BTN}><ChevronRight size={14} /></button>
            </>
          ) : (
            <>
              <button onClick={prevDay} style={NAV_BTN}><ChevronLeft size={14} /></button>
              <button onClick={nextDay} style={NAV_BTN}><ChevronRight size={14} /></button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>

        {/* Banco de horas */}
        {hours && published && (
          <div style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#7A9BAD', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              {lang === 'pt' ? 'Banco de Horas' : 'Stundenkonto'}
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              <div style={{ flex: 1, padding: '0 16px 0 0', borderRight: '1px solid #F0F4F6' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#001E30', lineHeight: 1 }}>{fmtHours(hours.workedMinutes)}</div>
                <div style={{ fontSize: '0.7rem', color: '#7A9BAD', marginTop: 4 }}>{lang === 'pt' ? 'Trabalhadas' : 'Gearbeitet'}</div>
              </div>
              <div style={{ flex: 1, padding: '0 16px', borderRight: '1px solid #F0F4F6' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#7A9BAD', lineHeight: 1 }}>{fmtHours(hours.targetMinutes)}</div>
                <div style={{ fontSize: '0.7rem', color: '#7A9BAD', marginTop: 4 }}>{lang === 'pt' ? `Alvo (${hours.workPercentage}%)` : `Ziel (${hours.workPercentage}%)`}</div>
              </div>
              <div style={{ flex: 1, padding: '0 0 0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {deltaMinutes === 0 ? <Minus size={14} color="#7A9BAD" /> : deltaMinutes > 0 ? <TrendingUp size={14} color="#059669" /> : <TrendingDown size={14} color="#DC2626" />}
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: deltaMinutes === 0 ? '#7A9BAD' : deltaMinutes > 0 ? '#059669' : '#DC2626', lineHeight: 1 }}>
                    {deltaMinutes > 0 ? '+' : ''}{fmtHours(Math.abs(deltaMinutes))}
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#7A9BAD', marginTop: 4 }}>{lang === 'pt' ? 'Diferença' : 'Differenz'}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 5, background: '#F0F4F6', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#059669' : pct >= 80 ? '#003A5D' : '#D97706', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: '0.62rem', color: '#7A9BAD', marginTop: 3, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>{pct}%</div>
            </div>
          </div>
        )}

        {/* Shift stats (month view only) */}
        {view === 'month' && (assignments.length > 0 || absences.length > 0) && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {assignments.length > 0 && (
              <div style={{ padding: '4px 12px', background: '#003A5D', color: 'white', fontSize: '0.72rem', letterSpacing: '0.04em', fontFamily: "'IBM Plex Mono', monospace" }}>
                {assignments.length} {lang === 'pt' ? 'TURNOS' : 'SCHICHTEN'}
              </div>
            )}
            {Array.from(shiftCounts.entries()).map(([code, count]) => {
              const st = shiftTypes.find(s => s.code === code)
              if (!st) return null
              return (
                <div key={code} style={{ padding: '4px 12px', background: 'white', border: '2px solid #003A5D', fontSize: '0.72rem', color: '#003A5D', fontFamily: "'IBM Plex Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: st.color, display: 'inline-block', flexShrink: 0 }} />
                  {code} · {count}
                </div>
              )
            })}
            {absences.length > 0 && (
              <div style={{ padding: '4px 12px', background: 'white', border: '2px solid #059669', fontSize: '0.72rem', color: '#059669', fontFamily: "'IBM Plex Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                <Umbrella size={11} /> {absences.length} {lang === 'pt' ? 'DIA(S) FÉRIAS' : 'URLAUBSTAG(E)'}
              </div>
            )}
          </div>
        )}

        {/* Not published notice */}
        {!loading && published === false && (
          <div style={{ padding: '16px 20px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12 }}>
            <div style={{ fontSize: '1.1rem' }}>📋</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#92400E', marginBottom: 2 }}>
                {lang === 'pt' ? 'Escala ainda não publicada' : 'Dienstplan noch nicht veröffentlicht'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#B45309' }}>
                {lang === 'pt' ? 'O gestor ainda não publicou a escala para este mês.' : 'Der Manager hat den Dienstplan noch nicht veröffentlicht.'}
              </div>
            </div>
          </div>
        )}

        {/* ── MONTHLY VIEW ── */}
        {view === 'month' && (
          <div style={{ background: 'white', border: '1px solid #D8E2E8', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#001E30' }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} style={{ minHeight: 82, borderRight: '1px solid #F0F4F6', borderBottom: '1px solid #F0F4F6', background: '#FAFBFC' }} />
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const assignment = assignmentMap.get(dateStr)
                const absenceType = absenceMap.get(dateStr)
                const conf = confMap.get(dateStr)
                const isToday = dateStr === todayStr
                const isWE = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6
                return (
                  <div key={day} style={{ minHeight: 82, padding: '7px', borderRight: '1px solid #F0F4F6', borderBottom: '1px solid #F0F4F6', background: absenceType ? '#F0FDF4' : isToday ? '#E8EFF3' : isWE && !assignment ? '#F8FAFB' : 'white' }}>
                    <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: isToday ? 700 : 400, fontFamily: "'IBM Plex Mono', monospace", color: isToday ? 'white' : isWE ? '#7A9BAD' : '#001E30', background: isToday ? '#003A5D' : 'transparent', marginBottom: 4 }}>
                      {day}
                    </div>
                    {absenceType && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 5px', background: '#DCFCE7', borderLeft: '3px solid #16A34A', fontSize: '0.6rem', color: '#15803D', fontWeight: 600 }}>
                        <Umbrella size={8} />
                        {absenceType.slice(0, 7)}
                      </div>
                    )}
                    {assignment?.shiftType && !absenceType && (
                      <div style={{ padding: '3px 6px', background: assignment.shiftType.color + '18', borderLeft: `3px solid ${assignment.shiftType.color}`, marginBottom: 3 }}>
                        <div style={{ fontSize: '0.68rem', color: '#001E30', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{assignment.shiftType.code}</div>
                        <div style={{ fontSize: '0.6rem', color: '#4A6878', fontWeight: 500, lineHeight: 1.2 }}>{assignment.shiftType.name}</div>
                        <div style={{ fontSize: '0.55rem', color: '#7A9BAD', fontFamily: "'IBM Plex Mono', monospace" }}>{assignment.shiftType.startTime1}–{assignment.shiftType.endTime1}</div>
                      </div>
                    )}
                    {conf && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                        {conf.type === 'WORKED'          && <CheckCircle2  size={9} color="#059669" />}
                        {conf.type === 'EARLY_DEPARTURE' && <Clock          size={9} color="#D97706" />}
                        {conf.type === 'ABSENT'          && <AlertTriangle  size={9} color="#DC2626" />}
                        <span style={{ fontSize: '0.54rem', color: conf.type === 'WORKED' ? '#059669' : conf.type === 'ABSENT' ? '#DC2626' : '#D97706', fontWeight: 600 }}>
                          {CONF_LABELS[conf.type]?.[lang]}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── WEEKLY VIEW ── */}
        {view === 'week' && (
          <div style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, overflow: 'hidden' }}>
            {/* Week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#001E30' }}>
              {weekDays.map((d, i) => {
                const isWE = d.getDay() === 0 || d.getDay() === 6
                const isToday = toDateStr(d) === todayStr
                return (
                  <div
                    key={i}
                    onClick={() => { setFocusDate(d); setView('day') }}
                    style={{ padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: isToday ? 'rgba(255,255,255,0.12)' : 'transparent', transition: 'background 0.15s' }}
                  >
                    <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: isWE ? '#7BBFE0' : 'rgba(255,255,255,0.5)', fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
                      {WEEKDAYS[d.getDay()]}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isToday ? 'white' : isWE ? '#7BBFE0' : 'rgba(255,255,255,0.85)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                      {d.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Week cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 160 }}>
              {weekDays.map((d, i) => {
                const ds = toDateStr(d)
                const inMonth = d.getMonth() + 1 === month && d.getFullYear() === year
                const assignment = assignmentMap.get(ds)
                const absenceType = absenceMap.get(ds)
                const conf = confMap.get(ds)
                const isToday = ds === todayStr
                const isWE = d.getDay() === 0 || d.getDay() === 6

                return (
                  <div
                    key={i}
                    onClick={() => { setFocusDate(d); setView('day') }}
                    style={{
                      padding: 10, borderRight: i < 6 ? '1px solid #F0F4F6' : 'none',
                      background: !inMonth ? '#FAFBFC' : isToday ? '#E8EFF3' : isWE ? '#F8FAFB' : 'white',
                      cursor: 'pointer', transition: 'background 0.15s', minHeight: 160,
                      opacity: !inMonth ? 0.4 : 1,
                    }}
                  >
                    {absenceType && inMonth && (
                      <div style={{ padding: '6px 8px', background: '#DCFCE7', borderLeft: '3px solid #16A34A', borderRadius: 4, marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <Umbrella size={11} color="#15803D" />
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803D' }}>
                            {lang === 'pt' ? 'Férias' : 'Urlaub'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#166534' }}>{absenceType}</div>
                      </div>
                    )}

                    {assignment?.shiftType && !absenceType && inMonth && (
                      <div style={{ padding: '8px 10px', background: assignment.shiftType.color + '15', borderLeft: `3px solid ${assignment.shiftType.color}`, borderRadius: 4 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#001E30', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 3 }}>
                          {assignment.shiftType.code}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#4A6878', fontWeight: 500, marginBottom: 4, lineHeight: 1.2 }}>
                          {assignment.shiftType.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#7A9BAD', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {assignment.shiftType.startTime1}–{assignment.shiftType.endTime1}
                        </div>
                      </div>
                    )}

                    {!assignment && !absenceType && inMonth && (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#D4CFC9' }}>—</span>
                      </div>
                    )}

                    {conf && inMonth && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                        {conf.type === 'WORKED'          && <CheckCircle2  size={11} color="#059669" />}
                        {conf.type === 'EARLY_DEPARTURE' && <Clock          size={11} color="#D97706" />}
                        {conf.type === 'ABSENT'          && <AlertTriangle  size={11} color="#DC2626" />}
                        <span style={{ fontSize: '0.6rem', color: conf.type === 'WORKED' ? '#059669' : conf.type === 'ABSENT' ? '#DC2626' : '#D97706', fontWeight: 600 }}>
                          {CONF_LABELS[conf.type]?.[lang]}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── DAILY VIEW ── */}
        {view === 'day' && (() => {
          const ds = toDateStr(focusDate)
          const assignment = assignmentMap.get(ds)
          const absenceType = absenceMap.get(ds)
          const conf = confMap.get(ds)
          const isToday = ds === todayStr
          const isWE = focusDate.getDay() === 0 || focusDate.getDay() === 6

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Day title */}
              <div style={{ textAlign: 'center', padding: '12px 0 4px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: isWE ? '#3B82F6' : '#7A9BAD', fontWeight: 600, marginBottom: 4 }}>
                  {dayLabelLong}
                </div>
                {isToday && (
                  <span style={{ display: 'inline-block', padding: '2px 12px', background: '#003A5D', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em' }}>
                    {lang === 'pt' ? 'HOJE' : 'HEUTE'}
                  </span>
                )}
              </div>

              {/* Shift card */}
              {absenceType ? (
                <div style={{ background: 'white', border: '1px solid #DCFCE7', borderLeft: '4px solid #16A34A', borderRadius: 10, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Umbrella size={22} color="#16A34A" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#166534', marginBottom: 4 }}>
                      {lang === 'pt' ? 'Dia de Férias' : 'Urlaubstag'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#4D7C0F' }}>{absenceType}</div>
                  </div>
                </div>
              ) : assignment?.shiftType ? (
                <div style={{ background: 'white', border: '1px solid #D8E2E8', borderLeft: `4px solid ${assignment.shiftType.color}`, borderRadius: 10, padding: '24px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ width: 56, height: 56, background: assignment.shiftType.color + '20', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: assignment.shiftType.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {assignment.shiftType.code}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#001E30', marginBottom: 6 }}>
                        {assignment.shiftType.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#4A6878', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>
                        {assignment.shiftType.startTime1} → {assignment.shiftType.endTime1}
                      </div>
                    </div>
                  </div>
                  {conf && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {conf.type === 'WORKED'          && <CheckCircle2  size={15} color="#059669" />}
                      {conf.type === 'EARLY_DEPARTURE' && <Clock          size={15} color="#D97706" />}
                      {conf.type === 'ABSENT'          && <AlertTriangle  size={15} color="#DC2626" />}
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: conf.type === 'WORKED' ? '#059669' : conf.type === 'ABSENT' ? '#DC2626' : '#D97706' }}>
                        {CONF_LABELS[conf.type]?.[lang]}
                        {conf.actualEnd && conf.type === 'EARLY_DEPARTURE' && (
                          <span style={{ fontWeight: 400, marginLeft: 6, fontFamily: "'IBM Plex Mono', monospace" }}>({lang === 'pt' ? 'saiu às' : 'ging um'} {conf.actualEnd})</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '32px 28px', textAlign: 'center', color: '#B0C4CE', fontSize: '0.9rem' }}>
                  {lang === 'pt' ? 'Dia livre' : 'Freier Tag'}
                </div>
              )}
            </div>
          )
        })()}

        {loading && (
          <div style={{ textAlign: 'center', padding: 16, color: '#7A9BAD', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace" }}>
            {lang === 'pt' ? 'A carregar...' : 'Lädt...'}
          </div>
        )}
      </div>
    </div>
  )
}
