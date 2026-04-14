'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ShiftType {
  id: string; name: string; code: string; color: string; startTime1: string; endTime1: string
}
interface Assignment { date: string; shiftType: ShiftType | null }
interface Props { employeeId: string; employeeName: string; shiftTypes: ShiftType[] }

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
type Lang = 'pt' | 'de'

export default function EmployeeCalendarClient({ employeeId, shiftTypes }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<Lang>('pt')

  const WEEKDAYS = lang === 'pt' ? WEEKDAYS_PT : WEEKDAYS_DE
  const MONTHS = lang === 'pt' ? MONTHS_PT : MONTHS_DE

  useEffect(() => {
    setLoading(true)
    fetch(`/api/employee/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAssignments(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const assignmentMap = new Map<string, Assignment>()
  assignments.forEach(a => assignmentMap.set(a.date, a))

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const shiftCounts = new Map<string, number>()
  assignments.forEach(a => { if (!a.shiftType) return; shiftCounts.set(a.shiftType.id, (shiftCounts.get(a.shiftType.id) ?? 0) + 1) })

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Page header */}
      <div style={{ background: '#003A5D', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Jost', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {lang === 'pt' ? 'O Meu Calendário' : 'Mein Kalender'}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono', monospace" }}>
            {MONTHS[month - 1].toUpperCase()} {year}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
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

        {/* Stats row */}
        {assignments.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ padding: '4px 12px', background: '#003A5D', color: 'white', fontSize: '0.72rem', letterSpacing: '0.04em', fontFamily: "'IBM Plex Mono', monospace" }}>
              {assignments.length} {lang === 'pt' ? 'TURNOS' : 'SCHICHTEN'}
            </div>
            {Array.from(shiftCounts.entries()).map(([id, count]) => {
              const st = shiftTypes.find(s => s.id === id || s.code === id)
              if (!st) return null
              return (
                <div key={id} style={{ padding: '4px 12px', background: 'white', border: '2px solid #003A5D', fontSize: '0.72rem', color: '#003A5D', fontFamily: "'IBM Plex Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: st.color, display: 'inline-block', flexShrink: 0 }} />
                  {st.code} · {count}
                </div>
              )
            })}
          </div>
        )}

        {/* Calendar grid */}
        <div style={{ background: 'white', border: '1px solid #D8E2E8', overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#001E30' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} style={{ minHeight: 76, borderRight: '1px solid #F0F4F6', borderBottom: '1px solid #F0F4F6', background: '#FAFBFC' }} />

              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const assignment = assignmentMap.get(dateStr)
              const isToday = dateStr === todayStr
              const isWE = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6

              return (
                <div key={day} style={{ minHeight: 76, padding: '8px', borderRight: '1px solid #F0F4F6', borderBottom: '1px solid #F0F4F6', background: isToday ? '#E8EFF3' : isWE && !assignment ? '#F8FAFB' : 'white', position: 'relative' }}>
                  <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: isToday ? 700 : 400, fontFamily: "'IBM Plex Mono', monospace", color: isToday ? 'white' : isWE ? '#7A9BAD' : '#001E30', background: isToday ? '#003A5D' : 'transparent', marginBottom: 5 }}>
                    {day}
                  </div>
                  {assignment?.shiftType && (
                    <div style={{ padding: '2px 6px', background: assignment.shiftType.color + '18', borderLeft: `3px solid ${assignment.shiftType.color}`, fontSize: '0.68rem', color: '#001E30', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                      {assignment.shiftType.code}
                      <div style={{ fontSize: '0.58rem', color: '#7A9BAD', fontWeight: 400 }}>
                        {assignment.shiftType.startTime1}–{assignment.shiftType.endTime1}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 16, color: '#7A9BAD', fontSize: '0.75rem', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
            {lang === 'pt' ? 'A carregar...' : 'Lädt...'}
          </div>
        )}
      </div>
    </div>
  )
}
