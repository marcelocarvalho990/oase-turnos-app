'use client'

import { useState, useCallback, useTransition, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Download, AlignJustify, List } from 'lucide-react'
import { downloadSchedulePDF, downloadHoursPDF } from '@/lib/pdf-reports'
import { countTotalViolations } from '@/lib/schedule-violations'
// gridRef no longer needed for PDF — kept for potential future use
import MonthlyGrid from './MonthlyGrid'
import CellEditor from './CellEditor'
import TopBar from '../layout/TopBar'
import { useLang } from '@/hooks/useLang'
import { formatMonthYear, addMonths } from '@/lib/date-utils'
import type { Employee, ShiftType, Schedule, CoverageRule, AssignmentMap, DayInfo, Assignment } from '@/types'
import { ROLE_ORDER, ROLE_LABELS } from '@/types'

interface Props {
  schedule: Schedule
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  coverageRules: CoverageRule[]
  days: DayInfo[]
  year: number
  month: number
  team: string
}

type ViewMode = 'month' | 'week' | 'day'

const VIEW_LABELS: Record<ViewMode, { pt: string; de: string }> = {
  month: { pt: 'Mensal',  de: 'Monatlich'   },
  week:  { pt: 'Semanal', de: 'Wöchentlich' },
  day:   { pt: 'Diário',  de: 'Täglich'     },
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

const NAV_BTN: React.CSSProperties = {
  padding: '3px 7px', borderRadius: 5, border: '1px solid #D8E2E8',
  background: 'transparent', cursor: 'pointer', color: '#7A9BAD',
  display: 'flex', alignItems: 'center',
}

export default function MonthlyGridWrapper({
  schedule, employees, assignmentMap: initialMap, shiftTypes,
  coverageRules, days, year, month, team,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [lang] = useLang()
  const [assignmentMap, setAssignmentMap] = useState<AssignmentMap>(initialMap)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ status: string; count?: number; parsedConstraints?: number } | null>(null)
  const [view, setView] = useState<ViewMode>('month')
  const [compact, setCompact] = useState(true)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [isPdfBusy, setIsPdfBusy] = useState(false)
  const pdfMenuRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [focusDate, setFocusDate] = useState<Date>(() => {
    const t = new Date()
    return (t.getFullYear() === year && t.getMonth() + 1 === month) ? t : new Date(year, month - 1, 1)
  })

  useEffect(() => { setAssignmentMap(initialMap) }, [initialMap])

  // Keep focusDate in sync when month changes via TopBar navigation
  useEffect(() => {
    setFocusDate(d => {
      if (d.getFullYear() === year && d.getMonth() + 1 === month) return d
      return new Date(year, month - 1, 1)
    })
  }, [year, month])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    router.push(`/schedule?year=${newYear}&month=${newMonth}&team=${team}`)
  }, [team, router])

  // Navigate to a date, crossing month boundaries when needed
  function navigateTo(newDate: Date) {
    setFocusDate(newDate)
    if (newDate.getFullYear() !== year || newDate.getMonth() + 1 !== month) {
      handleMonthChange(newDate.getFullYear(), newDate.getMonth() + 1)
    }
  }

  function prevWeek() { const n = new Date(focusDate); n.setDate(focusDate.getDate() - 7); navigateTo(n) }
  function nextWeek() { const n = new Date(focusDate); n.setDate(focusDate.getDate() + 7); navigateTo(n) }
  function prevDay()  { const n = new Date(focusDate); n.setDate(focusDate.getDate() - 1); navigateTo(n) }
  function nextDay()  { const n = new Date(focusDate); n.setDate(focusDate.getDate() + 1); navigateTo(n) }

  // Days shown depend on view
  const displayDays = useMemo(() => {
    if (view === 'month') return days
    if (view === 'week') {
      const ws = weekStartOf(focusDate)
      const weekSet = new Set(
        Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return toDateStr(d) })
      )
      return days.filter(d => weekSet.has(d.date))
    }
    return days.filter(d => d.date === toDateStr(focusDate))
  }, [view, focusDate, days])

  // Nav labels
  const locale = lang === 'de' ? 'de-DE' : 'pt-PT'
  const weekLabel = useMemo(() => {
    const ws = weekStartOf(focusDate)
    const we = new Date(ws); we.setDate(ws.getDate() + 6)
    return `${ws.getDate()} – ${we.toLocaleString(locale, { day: 'numeric', month: 'short' })}`
  }, [focusDate, locale])
  const dayLabel = useMemo(() => focusDate.toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long' }), [focusDate, locale])

  const handleCellChange = useCallback(async (employeeId: string, date: string, shiftCode: string | null) => {
    setAssignmentMap(prev => {
      const next = { ...prev, [employeeId]: { ...prev[employeeId] } }
      if (!shiftCode) { delete next[employeeId][date] }
      else { next[employeeId][date] = { id: '', scheduleId: schedule.id, employeeId, date, shiftCode, isExternal: false, origin: 'MANUAL' } as Assignment }
      return next
    })
    try {
      const res = await fetch('/api/schedules/assignments', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id, employeeId, date, shiftCode: shiftCode ?? '' }),
      })
      if (!res.ok) setAssignmentMap(initialMap)
    } catch { setAssignmentMap(initialMap) }
  }, [schedule.id, initialMap])

  const handleGenerate = useCallback(async (instructions?: string) => {
    setIsGenerating(true); setGenerateResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id, year, month, team, instructions }),
      })
      const data = await res.json()
      setGenerateResult({ status: data.status, count: data.count, parsedConstraints: data.parsedConstraints })
      startTransition(() => router.refresh())
    } catch { setGenerateResult({ status: 'ERROR' }) }
    finally { setIsGenerating(false) }
  }, [schedule.id, year, month, team, router])

  const handleClear = useCallback(async () => {
    await fetch(`/api/schedules/clear?scheduleId=${schedule.id}`, { method: 'DELETE' })
    setGenerateResult(null)
    startTransition(() => router.refresh())
  }, [schedule.id, router])

  const handlePublish = useCallback(async () => {
    await fetch('/api/schedules/publish', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduleId: schedule.id }) })
    startTransition(() => router.refresh())
  }, [schedule.id, router])

  // Close PDF menu on outside click
  useEffect(() => {
    if (!showPdfMenu) return
    function onDoc(e: MouseEvent) {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) setShowPdfMenu(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [showPdfMenu])

  async function handleDownloadSchedule() {
    setShowPdfMenu(false)
    if (isPdfBusy) return
    setIsPdfBusy(true)
    try {
      await downloadSchedulePDF({ employees, assignmentMap, shiftTypes, days: displayDays, year, month, team, lang: lang as 'pt' | 'de', view })
    } finally {
      setIsPdfBusy(false)
    }
  }
  async function handleDownloadHours() {
    setShowPdfMenu(false)
    if (isPdfBusy) return
    setIsPdfBusy(true)
    try {
      await downloadHoursPDF({ employees, assignmentMap, shiftTypes, days: displayDays, year, month, team, lang: lang as 'pt' | 'de' })
    } finally {
      setIsPdfBusy(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        year={year} month={month} team={team}
        scheduleStatus={schedule.status} scheduleId={schedule.id}
        onMonthChange={handleMonthChange} onGenerate={handleGenerate}
        onClear={handleClear} onPublish={handlePublish}
        isGenerating={isGenerating} generateResult={generateResult}
        hideMonthNav={true}
        violationCount={countTotalViolations(days, employees, assignmentMap)}
      />

      {/* View switcher bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #D8E2E8', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, position: 'relative' }}>
        {/* View toggle */}
        <div style={{ display: 'flex', background: '#F0F4F7', borderRadius: 6, padding: 2, gap: 1 }}>
          {(['month', 'week', 'day'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '4px 14px', borderRadius: 4, border: 'none',
                background: view === v ? 'white' : 'transparent',
                color: view === v ? '#003A5D' : '#7A9BAD',
                fontSize: '0.75rem', fontWeight: view === v ? 600 : 400,
                cursor: 'pointer', transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {VIEW_LABELS[v][lang]}
            </button>
          ))}
        </div>

        {/* Navigation — always in this bar, content changes with view */}
        <div style={{ width: 1, height: 18, background: '#D8E2E8', flexShrink: 0 }} />
        {view === 'month' && (() => {
          const prevM = addMonths(year, month, -1)
          const nextM = addMonths(year, month, 1)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => handleMonthChange(prevM.year, prevM.month)} style={NAV_BTN}><ChevronLeft size={13} /></button>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#001E30', minWidth: 110, textAlign: 'center', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {formatMonthYear(year, month, lang === 'de' ? 'de-DE' : 'pt-PT')}
              </span>
              <button onClick={() => handleMonthChange(nextM.year, nextM.month)} style={NAV_BTN}><ChevronRight size={13} /></button>
            </div>
          )
        })()}
        {view === 'week' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={prevWeek} style={NAV_BTN}><ChevronLeft size={13} /></button>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#001E30', minWidth: 110, textAlign: 'center', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {weekLabel}
            </span>
            <button onClick={nextWeek} style={NAV_BTN}><ChevronRight size={13} /></button>
          </div>
        )}
        {view === 'day' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={prevDay} style={NAV_BTN}><ChevronLeft size={13} /></button>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#001E30', minWidth: 180, textAlign: 'center', textTransform: 'capitalize', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {dayLabel}
            </span>
            <button onClick={nextDay} style={NAV_BTN}><ChevronRight size={13} /></button>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Compact / Comfortable toggle */}
        <div style={{ display: 'flex', background: '#F0F4F7', borderRadius: 6, padding: 2, gap: 1 }}>
          <button
            onClick={() => setCompact(true)}
            title={lang === 'de' ? 'Kompakt' : 'Compacto'}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none',
              background: compact ? 'white' : 'transparent',
              color: compact ? '#003A5D' : '#7A9BAD',
              cursor: 'pointer', transition: 'background 0.15s',
              boxShadow: compact ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              display: 'flex', alignItems: 'center',
            }}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setCompact(false)}
            title={lang === 'de' ? 'Komfortabel' : 'Confortável'}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none',
              background: !compact ? 'white' : 'transparent',
              color: !compact ? '#003A5D' : '#7A9BAD',
              cursor: 'pointer', transition: 'background 0.15s',
              boxShadow: !compact ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              display: 'flex', alignItems: 'center',
            }}
          >
            <AlignJustify size={14} />
          </button>
        </div>

        <div style={{ width: 1, height: 18, background: '#D8E2E8', flexShrink: 0 }} />

        {/* PDF download dropdown */}
        <div ref={pdfMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => !isPdfBusy && setShowPdfMenu(v => !v)}
            title={lang === 'de' ? 'PDF herunterladen' : 'Exportar PDF'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6,
              border: '1px solid #D8E2E8',
              background: isPdfBusy ? '#F0F4F7' : showPdfMenu ? '#F0F4F7' : 'white',
              color: isPdfBusy ? '#7A9BAD' : '#003A5D',
              cursor: isPdfBusy ? 'default' : 'pointer',
              fontSize: '0.72rem', fontWeight: 600,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {isPdfBusy
              ? <span style={{ width: 13, height: 13, border: '2px solid #7A9BAD', borderTopColor: '#003A5D', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              : <Download size={13} />}
            PDF
          </button>
          {showPdfMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'white', border: '1px solid #D8E2E8', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,58,93,0.12)', zIndex: 50,
              overflow: 'hidden', minWidth: 200,
            }}>
              <button
                onClick={handleDownloadSchedule}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '0.78rem', color: '#001E30', fontFamily: "'IBM Plex Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0F5F8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {lang === 'de'
                      ? ({ month: 'Dienstplan', week: 'Wochenplan', day: 'Tagesplan' } as Record<ViewMode, string>)[view]
                      : ({ month: 'Escala Mensal', week: 'Escala Semanal', day: 'Escala Diária' } as Record<ViewMode, string>)[view]}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#7A9BAD' }}>{lang === 'de' ? 'Dienstplan als PDF exportieren' : 'Exportar calendário como PDF'}</div>
                </div>
              </button>
              <div style={{ height: 1, background: '#EEF2F5', margin: '0 10px' }} />
              <button
                onClick={handleDownloadHours}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: '0.78rem', color: '#001E30', fontFamily: "'IBM Plex Sans', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0F5F8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{lang === 'de' ? 'Stundenbericht' : 'Relatório de Horas'}</div>
                  <div style={{ fontSize: '0.68rem', color: '#7A9BAD' }}>{lang === 'de' ? 'Stunden pro Mitarbeiter exportieren' : 'Exportar horas por colaborador'}</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={gridRef} className="flex-1 overflow-hidden">
        <div key={view} className="view-fade h-full">
          {view === 'day' && displayDays.length > 0 && (
            <DayView
              employees={employees}
              assignmentMap={assignmentMap}
              shiftTypes={shiftTypes}
              day={displayDays[0]}
              onCellChange={handleCellChange}
              lang={lang}
            />
          )}
          {view === 'week' && (
            <WeeklyView
              employees={employees}
              assignmentMap={assignmentMap}
              shiftTypes={shiftTypes}
              coverageRules={coverageRules}
              days={displayDays}
              onCellChange={handleCellChange}
            />
          )}
          {view === 'month' && (
            <MonthlyGrid
              employees={employees}
              assignmentMap={assignmentMap}
              shiftTypes={shiftTypes}
              coverageRules={coverageRules}
              days={displayDays}
              onCellChange={handleCellChange}
              compact={compact}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Weekly view — fills full width with 1fr day columns ──────────────────────

function WeeklyView({ employees, assignmentMap, shiftTypes, coverageRules, days, onCellChange }: {
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  coverageRules: CoverageRule[]
  days: DayInfo[]
  onCellChange: (employeeId: string, date: string, shiftCode: string | null) => void
}) {
  const [openCell, setOpenCell] = useState<{ employeeId: string; date: string } | null>(null)

  const grouped = ROLE_ORDER
    .map(role => ({ role, label: ROLE_LABELS[role], employees: employees.filter(e => e.role === role) }))
    .filter(g => g.employees.length > 0)

  const workShifts = shiftTypes.filter(s => !s.isAbsence)

  // Coverage per day per shift
  const coverageMap: Record<string, Record<string, number>> = {}
  for (const day of days) {
    coverageMap[day.date] = {}
    for (const shift of workShifts) coverageMap[day.date][shift.code] = 0
    for (const emp of employees) {
      const a = assignmentMap[emp.id]?.[day.date]
      if (a?.shiftCode && !shiftTypes.find(s => s.code === a.shiftCode)?.isAbsence) {
        coverageMap[day.date][a.shiftCode] = (coverageMap[day.date][a.shiftCode] ?? 0) + 1
      }
    }
  }

  const nDays = days.length || 7
  // Name col + % col + N day cols + hrs col
  const gridCols = `180px 40px repeat(${nDays}, 1fr) 52px`

  const ROW_H = 72

  return (
    <div className="relative h-full overflow-auto">
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, minHeight: '100%' }}>

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 flex items-end">
          Nome
        </div>
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-1 py-2 text-xs font-semibold text-slate-600 flex items-end justify-center">
          %
        </div>
        {days.map(day => {
          const isWeekend = day.dayType === 'SATURDAY' || day.dayType === 'SUNDAY'
          return (
            <div
              key={day.date}
              className={`sticky top-0 z-20 border-b border-l border-slate-200 flex flex-col items-center justify-end pb-2 pt-2 text-center
                ${isWeekend ? 'bg-[#F0F5F8]' : 'bg-white'}
                ${day.isToday ? 'bg-[#E6EEF3] border-b-2 border-b-[#003A5D]' : ''}
              `}
            >
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${isWeekend ? 'text-[#003A5D]' : 'text-slate-400'}`}>
                {day.weekdayLabel}
              </span>
              <span className={`text-xl font-bold leading-none mt-1 ${day.isToday ? 'text-[#003A5D]' : isWeekend ? 'text-[#003A5D]' : 'text-slate-800'}`}>
                {day.day}
              </span>
            </div>
          )
        })}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-2 py-2 text-[10px] font-semibold text-slate-500 flex items-end justify-center">
          Hrs
        </div>

        {/* ── EMPLOYEE ROWS ── */}
        {grouped.map(({ role, label, employees: grpEmps }) => (
          <>
            {/* Group header */}
            <div
              key={`hdr-${role}`}
              className="bg-slate-100 border-y border-slate-200 px-3 py-1.5"
              style={{ gridColumn: `1 / span ${nDays + 3}` }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            </div>

            {/* Rows */}
            {grpEmps.map(emp => {
              let hoursWorked = 0
              const empAssignments = assignmentMap[emp.id] ?? {}
              // Only count hours for the displayed days (this week's assignments)
              for (const day of days) {
                const a = empAssignments[day.date]
                const st = shiftTypes.find(s => s.code === a?.shiftCode)
                if (st && !st.isAbsence && st.durationMinutes) {
                  const breakMin = (a?.shiftCode === 'F' || a?.shiftCode === 'S') ? 36 : 0
                  hoursWorked += (st.durationMinutes - breakMin) / 60
                }
              }

              return (
                <>
                  {/* Name */}
                  <div key={`n-${emp.id}`} className="sticky left-0 z-10 bg-white border-b border-slate-100 flex items-center px-3 py-1.5" style={{ minHeight: ROW_H }}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{emp.shortName}</div>
                      <div className="text-[11px] text-slate-400 truncate">{emp.name}</div>
                    </div>
                  </div>
                  {/* % */}
                  <div key={`p-${emp.id}`} className="bg-white border-b border-slate-100 flex items-center justify-center" style={{ minHeight: ROW_H }}>
                    <span className="text-[11px] text-slate-400">{emp.workPercentage}</span>
                  </div>
                  {/* Day cells */}
                  {days.map(day => {
                    const assignment = empAssignments[day.date]
                    const st = shiftTypes.find(s => s.code === assignment?.shiftCode)
                    const isOpen = openCell?.employeeId === emp.id && openCell?.date === day.date
                    const isWeekend = day.dayType === 'SATURDAY' || day.dayType === 'SUNDAY'

                    return (
                      <div
                        key={`${emp.id}-${day.date}`}
                        className={`border-b border-l border-slate-100 flex flex-col items-center justify-center cursor-pointer transition-colors px-1
                          ${isWeekend ? 'bg-[#F8FAFB]' : 'bg-white'}
                          ${isOpen ? 'bg-[#E6EEF3] ring-1 ring-inset ring-[#003A5D]' : 'hover:bg-slate-50'}
                          ${assignment?.isExternal ? 'ring-1 ring-inset ring-red-400' : ''}
                        `}
                        style={{ minHeight: ROW_H }}
                        onClick={() => isOpen ? setOpenCell(null) : setOpenCell({ employeeId: emp.id, date: day.date })}
                      >
                        {assignment?.shiftCode && st ? (
                          <div style={{ width: '100%', padding: '6px 8px', background: st.bgColor + 'CC', borderLeft: `3px solid ${st.borderColor}`, borderRadius: 4 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: st.textColor, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                              {assignment.shiftCode}
                            </div>
                            {!st.isAbsence && (
                              <>
                                <div style={{ fontSize: '0.65rem', color: '#4A6878', fontWeight: 500, marginTop: 3, lineHeight: 1.2 }}>
                                  {st.name}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: '#7A9BAD', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                                  {st.startTime1}–{st.endTime1}
                                </div>
                              </>
                            )}
                            {st.isAbsence && (
                              <div style={{ fontSize: '0.6rem', color: '#4A6878', fontWeight: 500, marginTop: 3 }}>
                                {st.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-200 text-sm select-none">—</span>
                        )}
                      </div>
                    )
                  })}
                  {/* Hours */}
                  <div key={`h-${emp.id}`} className="bg-white border-b border-slate-100 flex items-center justify-center" style={{ minHeight: ROW_H }}>
                    <span className="text-[11px] text-slate-500 font-medium">{hoursWorked.toFixed(0)}h</span>
                  </div>
                </>
              )
            })}
          </>
        ))}

        {/* ── COVERAGE FOOTER ── */}
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300 px-3 py-2 text-[10px] font-bold text-slate-700 flex items-center">
          Cobertura
        </div>
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300" />
        {days.map(day => {
          const fCount = coverageMap[day.date]?.['F'] ?? 0
          const sCount = coverageMap[day.date]?.['S'] ?? 0
          const fRule = coverageRules.find(r => r.shiftCode === 'F' && r.dayType === day.dayType)
          const sRule = coverageRules.find(r => r.shiftCode === 'S' && r.dayType === day.dayType)
          const fOk = fRule ? fCount >= fRule.minStaff : true
          const sOk = sRule ? sCount >= sRule.minStaff : true
          return (
            <div key={day.date} className="sticky bottom-0 bg-slate-50 border-t-2 border-l border-slate-300 flex flex-col items-center justify-center gap-1 py-1.5">
              <span className={`text-[11px] font-bold ${fOk ? 'text-green-700' : 'text-red-600'}`}>F{fCount}</span>
              <span className={`text-[11px] font-bold ${sOk ? 'text-amber-700' : 'text-red-600'}`}>S{sCount}</span>
            </div>
          )
        })}
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300" />
      </div>

      {/* Cell editor */}
      {openCell && (
        <CellEditor
          employeeId={openCell.employeeId}
          date={openCell.date}
          currentCode={assignmentMap[openCell.employeeId]?.[openCell.date]?.shiftCode ?? null}
          shiftTypes={shiftTypes}
          onSelect={(code) => { onCellChange(openCell.employeeId, openCell.date, code); setOpenCell(null) }}
          onClose={() => setOpenCell(null)}
        />
      )}
    </div>
  )
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({ employees, assignmentMap, shiftTypes, day, onCellChange, lang }: {
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  day: DayInfo
  onCellChange: (employeeId: string, date: string, shiftCode: string | null) => void
  lang: 'pt' | 'de'
}) {
  const grouped = ROLE_ORDER
    .map(role => ({ role, label: ROLE_LABELS[role], employees: employees.filter(e => e.role === role) }))
    .filter(g => g.employees.length > 0)

  const workShifts = shiftTypes.filter(s => !s.isAbsence)
  const coverageByShift: Record<string, number> = {}
  for (const emp of employees) {
    const a = assignmentMap[emp.id]?.[day.date]
    if (a?.shiftCode && workShifts.some(s => s.code === a.shiftCode)) {
      coverageByShift[a.shiftCode] = (coverageByShift[a.shiftCode] ?? 0) + 1
    }
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '20px 24px', background: '#F4F6F8' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Coverage summary */}
        {workShifts.some(s => (coverageByShift[s.code] ?? 0) > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {workShifts.map(s => {
              const count = coverageByShift[s.code] ?? 0
              if (count === 0) return null
              return (
                <div key={s.code} style={{ padding: '4px 12px', background: s.bgColor, color: s.textColor, borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.code} <span style={{ opacity: 0.6 }}>·</span> {count} {lang === 'de' ? 'Pers.' : 'pess.'}
                </div>
              )
            })}
          </div>
        )}

        {/* Employee groups */}
        {grouped.map(({ role, label, employees: grpEmps }) => (
          <div key={role}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A9BAD', marginBottom: 6, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {grpEmps.map(emp => {
                const a = assignmentMap[emp.id]?.[day.date]
                const st = shiftTypes.find(s => s.code === a?.shiftCode)
                return (
                  <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid #D8E2E8', borderRadius: 8, padding: '10px 16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#001E30', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#7A9BAD', fontFamily: "'IBM Plex Mono', monospace" }}>{emp.workPercentage}%</div>
                    </div>
                    {a?.shiftCode && st ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ padding: '3px 10px', background: st.bgColor, color: st.textColor, border: `1px solid ${st.borderColor}`, borderRadius: 5, fontSize: '0.78rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {a.shiftCode}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#4A6878' }}>{st.name}</span>
                        {!st.isAbsence && st.startTime1 && (
                          <span style={{ fontSize: '0.72rem', color: '#7A9BAD', fontFamily: "'IBM Plex Mono', monospace" }}>
                            {st.startTime1}–{st.endTime1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#C8C0B4', fontFamily: "'IBM Plex Mono', monospace" }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
