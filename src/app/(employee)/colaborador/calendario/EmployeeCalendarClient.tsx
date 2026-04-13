'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ShiftType {
  id: string
  name: string
  code: string
  color: string
  startTime1: string
  endTime1: string
}

interface Assignment {
  date: string
  shiftType: ShiftType | null
}

interface Props {
  employeeId: string
  employeeName: string
  shiftTypes: ShiftType[]
}

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
      .then(data => {
        if (Array.isArray(data)) setAssignments(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const assignmentMap = new Map<string, Assignment>()
  assignments.forEach(a => assignmentMap.set(a.date, a))

  // Calendar cells (pad start)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Shift stats
  const shiftCounts = new Map<string, number>()
  assignments.forEach(a => {
    if (!a.shiftType) return
    const key = a.shiftType.id
    shiftCounts.set(key, (shiftCounts.get(key) ?? 0) + 1)
  })

  return (
    <div
      style={{
        padding: '32px 36px',
        height: '100%',
        overflowY: 'auto',
        background: '#FAF8F4',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: '1.75rem',
              color: '#1A1816',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              margin: 0,
            }}
          >
            {lang === 'pt' ? 'O Meu Calendário' : 'Mein Kalender'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#9A8F80' }}>
            {MONTHS[month - 1]} {year}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Lang toggle */}
          <button
            onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #D8D0C4',
              borderRadius: 6,
              color: '#6B6056',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {lang === 'pt' ? 'DE' : 'PT'}
          </button>

          {/* Month nav */}
          <button
            onClick={prevMonth}
            style={{ padding: 8, background: 'white', border: '1px solid #E8E0D0', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B6056' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            style={{ padding: 8, background: 'white', border: '1px solid #E8E0D0', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6B6056' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      {assignments.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 14px',
              background: 'white',
              border: '1px solid #E8E0D0',
              borderRadius: 20,
              fontSize: '0.75rem',
              color: '#6B6056',
            }}
          >
            {lang === 'pt' ? 'Total:' : 'Gesamt:'} <strong style={{ color: '#1A1816' }}>{assignments.length}</strong> {lang === 'pt' ? 'turnos' : 'Schichten'}
          </div>
          {Array.from(shiftCounts.entries()).map(([id, count]) => {
            const st = shiftTypes.find(s => s.id === id || s.code === id)
            if (!st) return null
            return (
              <div
                key={id}
                style={{
                  padding: '6px 14px',
                  background: 'white',
                  border: '1px solid #E8E0D0',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  color: '#6B6056',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, display: 'inline-block', flexShrink: 0 }} />
                {st.code}: <strong style={{ color: '#1A1816' }}>{count}</strong>
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar grid */}
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #E8E0D0',
          overflow: 'hidden',
        }}
      >
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #F0E8DC' }}>
          {WEEKDAYS.map(d => (
            <div
              key={d}
              style={{
                padding: '10px 0',
                textAlign: 'center',
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#B0A090',
                fontWeight: 500,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} style={{ minHeight: 80, borderRight: '1px solid #F5F0E8', borderBottom: '1px solid #F5F0E8', background: '#FDFAF7' }} />
            }

            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const assignment = assignmentMap.get(dateStr)
            const isToday = dateStr === todayStr
            const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6

            return (
              <div
                key={day}
                style={{
                  minHeight: 80,
                  padding: '8px',
                  borderRight: '1px solid #F5F0E8',
                  borderBottom: '1px solid #F5F0E8',
                  background: isWeekend && !assignment ? '#FDFCFA' : 'white',
                  position: 'relative',
                }}
              >
                {/* Day number */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: isToday ? 600 : 400,
                    color: isToday ? 'white' : isWeekend ? '#B0A090' : '#3A3530',
                    background: isToday ? '#C1440E' : 'transparent',
                    marginBottom: 6,
                  }}
                >
                  {day}
                </div>

                {/* Shift badge */}
                {assignment?.shiftType ? (
                  <div
                    style={{
                      padding: '3px 7px',
                      borderRadius: 4,
                      background: assignment.shiftType.color + '22',
                      borderLeft: `3px solid ${assignment.shiftType.color}`,
                      fontSize: '0.7rem',
                      color: '#1A1816',
                      fontWeight: 500,
                    }}
                  >
                    {assignment.shiftType.code}
                    <div style={{ fontSize: '0.62rem', color: '#9A8F80', fontWeight: 400 }}>
                      {assignment.shiftType.startTime1}–{assignment.shiftType.endTime1}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9A8F80', fontSize: '0.8rem' }}>
          {lang === 'pt' ? 'A carregar...' : 'Lädt...'}
        </div>
      )}
    </div>
  )
}
