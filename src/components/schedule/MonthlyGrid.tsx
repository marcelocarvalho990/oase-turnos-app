'use client'

import { useState, memo, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Employee, ShiftType, CoverageRule, AssignmentMap, DayInfo } from '@/types'
import { ROLE_ORDER, ROLE_LABELS } from '@/types'
import ShiftBadge from './ShiftBadge'
import CellEditor from './CellEditor'
import { computeDayViolations } from '@/lib/schedule-violations'

interface Props {
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  coverageRules: CoverageRule[]
  days: DayInfo[]
  onCellChange: (employeeId: string, date: string, shiftCode: string | null) => void
  compact?: boolean
}

const DAY_COL_WIDTH = 44
const NAME_COL_WIDTH = 172
const PCT_COL_WIDTH = 44
const SUMMARY_COL_WIDTH = 64

export default function MonthlyGrid({ employees, assignmentMap, shiftTypes, coverageRules, days, onCellChange, compact = false }: Props) {
  const [openCell, setOpenCell] = useState<{ employeeId: string; date: string } | null>(null)
  const [hoveredWarning, setHoveredWarning] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (todayRef.current && containerRef.current) {
      const container = containerRef.current
      const today = todayRef.current
      const todayLeft = today.offsetLeft
      const todayWidth = today.offsetWidth
      const containerWidth = container.clientWidth
      container.scrollLeft = todayLeft - containerWidth / 2 + todayWidth / 2
    }
  }, [])

  // Group employees by role
  const grouped = ROLE_ORDER.map(role => ({
    role,
    label: ROLE_LABELS[role],
    employees: employees.filter(e => e.role === role),
  })).filter(g => g.employees.length > 0)

  // Coverage stats per day (for footer)
  const workShifts = shiftTypes.filter(s => !s.isAbsence)
  const coverageMap: Record<string, Record<string, number>> = {}
  for (const day of days) {
    coverageMap[day.date] = {}
    for (const shift of workShifts) {
      coverageMap[day.date][shift.code] = 0
    }
    for (const emp of employees) {
      const a = assignmentMap[emp.id]?.[day.date]
      if (a?.shiftCode && !shiftTypes.find(s => s.code === a.shiftCode)?.isAbsence) {
        coverageMap[day.date][a.shiftCode] = (coverageMap[day.date][a.shiftCode] ?? 0) + 1
      }
    }
  }

  // Pre-compute violations for all days (used in both header and footer)
  const violationsPerDay: Record<string, string[]> = {}
  for (const day of days) {
    violationsPerDay[day.date] = computeDayViolations(day, employees, assignmentMap, days)
  }

  const gridCols = `${NAME_COL_WIDTH}px ${PCT_COL_WIDTH}px ${days.map(() => `${DAY_COL_WIDTH}px`).join(' ')} ${SUMMARY_COL_WIDTH}px`

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          minWidth: NAME_COL_WIDTH + PCT_COL_WIDTH + days.length * DAY_COL_WIDTH + SUMMARY_COL_WIDTH,
        }}
      >
        {/* HEADER ROW */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 flex items-end">
          Nome
        </div>
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-1 py-2 text-xs font-semibold text-slate-600 flex items-end justify-center">
          %
        </div>
        {days.map(day => {
          const isWeekend = day.dayType === 'SATURDAY' || day.dayType === 'SUNDAY'
          const hasViol = violationsPerDay[day.date]?.length > 0
          return (
            <div
              key={day.date}
              ref={day.isToday ? todayRef : undefined}
              className={`sticky top-0 z-20 border-b border-slate-200 flex flex-col items-center justify-end pb-1 text-center overflow-hidden
                ${isWeekend ? 'bg-[#F0F5F8]' : 'bg-white'}
                ${day.isToday ? 'bg-[#E6EEF3] border-b-2 border-b-[#003A5D]' : ''}
              `}
            >
              {/* Red stripe at top for problem days */}
              {hasViol && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#EF4444' }} />
              )}
              <span className={`text-[10px] font-medium mt-1 ${hasViol ? 'text-red-600' : isWeekend ? 'text-[#003A5D]' : 'text-slate-500'}`}>
                {day.weekdayLabel}
              </span>
              <span className={`text-xs font-bold ${hasViol ? 'text-red-600' : day.isToday ? 'text-[#003A5D]' : isWeekend ? 'text-[#003A5D]' : 'text-slate-800'}`}>
                {day.day}
              </span>
            </div>
          )
        })}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-2 py-2 text-[10px] font-semibold text-slate-500 flex items-end justify-center">
          Hrs
        </div>

        {/* EMPLOYEE ROWS grouped by role */}
        {grouped.map(({ role, label, employees: groupEmps }) => (
          <RoleGroup
            key={role}
            label={label}
            employees={groupEmps}
            days={days}
            assignmentMap={assignmentMap}
            shiftTypes={shiftTypes}
            openCell={openCell}
            onCellClick={(employeeId, date) => setOpenCell({ employeeId, date })}
            onCellClose={() => setOpenCell(null)}
            onCellChange={onCellChange}
            colCount={days.length + 3}
            compact={compact}
          />
        ))}

        {/* COVERAGE FOOTER */}
        <div className="sticky bottom-0 left-0 bg-slate-50 border-t-2 border-slate-300 px-3 py-2 text-[10px] font-bold text-slate-700 flex items-center" style={{ zIndex: 20 }}>
          Cobertura
        </div>
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300" style={{ zIndex: 20 }} />
        {days.map(day => {
          const fCount = coverageMap[day.date]?.['F'] ?? 0
          const sCount = coverageMap[day.date]?.['S'] ?? 0
          const violations = violationsPerDay[day.date] ?? []
          const hasViolation = violations.length > 0
          const cellId = `warn-${day.date}`
          const isHovered = hoveredWarning === cellId

          return (
            <div
              key={day.date}
              className="sticky bottom-0 border-t-2 flex flex-col items-center justify-center gap-0.5 py-1 relative cursor-default"
              style={{
                background: hasViolation ? '#FEE2E2' : '#f8fafc',
                borderTopColor: hasViolation ? '#EF4444' : '#CBD5E1',
                zIndex: 20,
              }}
              onMouseEnter={() => hasViolation && setHoveredWarning(cellId)}
              onMouseLeave={() => setHoveredWarning(null)}
            >
              <span className={`text-[9px] font-bold ${fCount >= 4 ? 'text-green-700' : fCount > 0 ? 'text-amber-600' : 'text-red-700'}`}>
                F{fCount}
              </span>
              <span className={`text-[9px] font-bold ${sCount >= 2 ? 'text-green-700' : sCount > 0 ? 'text-amber-600' : 'text-red-700'}`}>
                S{sCount}
              </span>

              {/* Violation badge */}
              {hasViolation && (
                <div style={{
                  background: '#EF4444',
                  color: '#fff',
                  borderRadius: 9,
                  fontSize: 8,
                  fontWeight: 800,
                  lineHeight: 1,
                  padding: '2px 4px',
                  minWidth: 14,
                  textAlign: 'center',
                }}>
                  {violations.length}
                </div>
              )}

              {/* Tooltip */}
              {isHovered && (
                <div
                  className="absolute bottom-full mb-2 z-50 pointer-events-none"
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                >
                  <div style={{
                    background: '#1E293B',
                    color: '#F8FAFC',
                    borderRadius: 8,
                    padding: '10px 12px',
                    fontSize: 11,
                    lineHeight: 1.6,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    minWidth: 180,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: '#FCA5A5', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
                      Dia {day.day} — {violations.length} {violations.length === 1 ? 'problema' : 'problemas'}
                    </div>
                    {violations.map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: i < violations.length - 1 ? 3 : 0 }}>
                        <span style={{ color: '#F87171', flexShrink: 0, fontSize: 13, lineHeight: 1.3 }}>▸</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid #1E293B',
                    margin: '0 auto',
                  }} />
                </div>
              )}
            </div>
          )
        })}
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300" style={{ zIndex: 20 }} />
      </div>

      {/* Cell editor overlay */}
      {openCell && (
        <CellEditor
          employeeId={openCell.employeeId}
          date={openCell.date}
          currentCode={assignmentMap[openCell.employeeId]?.[openCell.date]?.shiftCode ?? null}
          shiftTypes={shiftTypes}
          onSelect={(code) => {
            onCellChange(openCell.employeeId, openCell.date, code)
            setOpenCell(null)
          }}
          onClose={() => setOpenCell(null)}
        />
      )}
    </div>
  )
}

// Role group component
function RoleGroup({
  label, employees, days, assignmentMap, shiftTypes, openCell, onCellClick, onCellClose, onCellChange, colCount, compact
}: {
  label: string
  employees: Employee[]
  days: DayInfo[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  openCell: { employeeId: string; date: string } | null
  onCellClick: (employeeId: string, date: string) => void
  onCellClose: () => void
  onCellChange: (employeeId: string, date: string, shiftCode: string | null) => void
  colCount: number
  compact: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <>
      {/* Group header — clickable to collapse */}
      <div
        className="bg-slate-100 border-y border-slate-200 px-3 py-1 cursor-pointer select-none"
        style={{ gridColumn: `1 / span ${colCount}`, display: 'flex', alignItems: 'center', gap: 6 }}
        onClick={() => setCollapsed(v => !v)}
      >
        {collapsed
          ? <ChevronRight size={11} className="text-slate-400 shrink-0" />
          : <ChevronDown  size={11} className="text-slate-400 shrink-0" />
        }
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-[10px] text-slate-400 ml-1">({employees.length})</span>
      </div>
      {/* Employee rows */}
      {!collapsed && employees.map(emp => (
        <EmployeeRow
          key={emp.id}
          employee={emp}
          days={days}
          assignmentMap={assignmentMap}
          shiftTypes={shiftTypes}
          openCell={openCell}
          onCellClick={onCellClick}
          onCellClose={onCellClose}
          onCellChange={onCellChange}
          compact={compact}
        />
      ))}
    </>
  )
}

// Employee row
const EmployeeRow = memo(function EmployeeRow({
  employee, days, assignmentMap, shiftTypes, openCell, onCellClick, onCellClose, onCellChange, compact
}: {
  employee: Employee
  days: DayInfo[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  openCell: { employeeId: string; date: string } | null
  onCellClick: (employeeId: string, date: string) => void
  onCellClose: () => void
  onCellChange: (employeeId: string, date: string, shiftCode: string | null) => void
  compact: boolean
}) {
  const [tooltipDate, setTooltipDate] = useState<string | null>(null)
  const empAssignments = assignmentMap[employee.id] ?? {}

  // Calculate hours worked
  let hoursWorked = 0
  for (const a of Object.values(empAssignments)) {
    const st = shiftTypes.find(s => s.code === a?.shiftCode)
    if (st && !st.isAbsence && st.durationMinutes) {
      hoursWorked += st.durationMinutes / 60
    }
  }

  return (
    <>
      {/* Name cell */}
      <div className="sticky left-0 z-10 bg-white border-b border-slate-100 flex items-center px-3 py-1.5 min-w-0">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-800 truncate">{employee.shortName}</div>
        </div>
      </div>
      {/* Work% cell */}
      <div className="sticky bg-white border-b border-slate-100 flex items-center justify-center">
        <span className="text-[10px] text-slate-500">{employee.workPercentage}</span>
      </div>
      {/* Day cells */}
      {days.map(day => {
        const assignment = empAssignments[day.date]
        const isOpen = openCell?.employeeId === employee.id && openCell?.date === day.date
        const isWeekend = day.dayType === 'SATURDAY' || day.dayType === 'SUNDAY'

        const shiftType = assignment?.shiftCode ? shiftTypes.find(s => s.code === assignment.shiftCode) : null
        const isTooltipVisible = tooltipDate === day.date && shiftType != null

        return (
          <div
            key={day.date}
            className={`border-b border-slate-100 flex items-center justify-center cursor-pointer transition-colors relative
              ${isWeekend ? 'bg-[#F0F5F8]/50' : 'bg-white'}
              ${isOpen ? 'bg-[#E6EEF3] ring-1 ring-inset ring-[#003A5D]' : 'hover:bg-slate-50'}
              ${assignment?.isExternal ? 'ring-1 ring-inset ring-red-400' : ''}
            `}
            style={{ height: compact ? 30 : 42 }}
            onClick={() => isOpen ? onCellClose() : onCellClick(employee.id, day.date)}
            onMouseEnter={() => setTooltipDate(day.date)}
            onMouseLeave={() => setTooltipDate(null)}
          >
            {assignment?.shiftCode ? (
              <ShiftBadge code={assignment.shiftCode} shiftTypes={shiftTypes} />
            ) : (
              <span className="text-slate-200 text-xs select-none">—</span>
            )}

            {isTooltipVisible && (
              <div
                className="absolute bottom-full mb-1.5 z-50 pointer-events-none"
                style={{ left: '50%', transform: 'translateX(-50%)' }}
              >
                <div style={{
                  background: '#1E293B',
                  color: '#F8FAFC',
                  borderRadius: 7,
                  padding: '6px 10px',
                  fontSize: 11,
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ fontWeight: 700, color: '#CBD5E1' }}>{shiftType!.code} — {shiftType!.name}</div>
                  {shiftType!.durationMinutes && (
                    <div style={{ color: '#94A3B8', fontSize: 10 }}>
                      {(shiftType!.durationMinutes / 60).toFixed(1)}h
                      {shiftType!.startTime1 && shiftType!.endTime1 ? ` · ${shiftType!.startTime1}–${shiftType!.endTime1}` : ''}
                    </div>
                  )}
                </div>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid #1E293B',
                  margin: '0 auto',
                }} />
              </div>
            )}
          </div>
        )
      })}
      {/* Summary cell */}
      <div className="bg-white border-b border-slate-100 flex items-center justify-center">
        <span className="text-[10px] text-slate-500 font-medium">{hoursWorked.toFixed(0)}h</span>
      </div>
    </>
  )
})
