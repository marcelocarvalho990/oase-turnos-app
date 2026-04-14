'use client'

import { useState, memo } from 'react'
import type { Employee, ShiftType, CoverageRule, AssignmentMap, DayInfo } from '@/types'
import { ROLE_ORDER, ROLE_LABELS } from '@/types'
import ShiftBadge from './ShiftBadge'
import CellEditor from './CellEditor'

interface Props {
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  coverageRules: CoverageRule[]
  days: DayInfo[]
  onCellChange: (employeeId: string, date: string, shiftCode: string | null) => void
}

const DAY_COL_WIDTH = 44
const NAME_COL_WIDTH = 172
const PCT_COL_WIDTH = 44
const SUMMARY_COL_WIDTH = 64

export default function MonthlyGrid({ employees, assignmentMap, shiftTypes, coverageRules, days, onCellChange }: Props) {
  const [openCell, setOpenCell] = useState<{ employeeId: string; date: string } | null>(null)

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

  const gridCols = `${NAME_COL_WIDTH}px ${PCT_COL_WIDTH}px ${days.map(() => `${DAY_COL_WIDTH}px`).join(' ')} ${SUMMARY_COL_WIDTH}px`

  return (
    <div className="relative h-full overflow-auto">
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
          return (
            <div
              key={day.date}
              className={`sticky top-0 z-20 border-b border-slate-200 flex flex-col items-center justify-end pb-1 pt-1 text-center
                ${isWeekend ? 'bg-[#F0F5F8]' : 'bg-white'}
                ${day.isToday ? 'bg-[#E6EEF3] border-b-2 border-b-[#003A5D]' : ''}
              `}
            >
              <span className={`text-[10px] font-medium ${isWeekend ? 'text-[#003A5D]' : 'text-slate-500'}`}>
                {day.weekdayLabel}
              </span>
              <span className={`text-xs font-bold ${day.isToday ? 'text-[#003A5D]' : isWeekend ? 'text-[#003A5D]' : 'text-slate-800'}`}>
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
          />
        ))}

        {/* COVERAGE FOOTER */}
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300 px-3 py-2 text-[10px] font-bold text-slate-700 flex items-center">
          Cobertura
        </div>
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300" />
        {days.map(day => {
          // Show F and S counts as key metrics
          const fCount = coverageMap[day.date]?.['F'] ?? 0
          const sCount = coverageMap[day.date]?.['S'] ?? 0
          const fRule = coverageRules.find(r => r.shiftCode === 'F' && r.dayType === day.dayType)
          const sRule = coverageRules.find(r => r.shiftCode === 'S' && r.dayType === day.dayType)
          const fOk = fRule ? fCount >= fRule.minStaff : true
          const sOk = sRule ? sCount >= sRule.minStaff : true
          return (
            <div
              key={day.date}
              className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300 flex flex-col items-center justify-center gap-0.5 py-1"
            >
              <span className={`text-[9px] font-bold ${fOk ? 'text-green-700' : 'text-red-600'}`}>F{fCount}</span>
              <span className={`text-[9px] font-bold ${sOk ? 'text-amber-700' : 'text-red-600'}`}>S{sCount}</span>
            </div>
          )
        })}
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300" />
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
  label, employees, days, assignmentMap, shiftTypes, openCell, onCellClick, onCellClose, onCellChange, colCount
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
}) {
  return (
    <>
      {/* Group header */}
      <div
        className="bg-slate-100 border-y border-slate-200 px-3 py-1"
        style={{ gridColumn: `1 / span ${colCount}` }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      {/* Employee rows */}
      {employees.map(emp => (
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
        />
      ))}
    </>
  )
}

// Employee row
const EmployeeRow = memo(function EmployeeRow({
  employee, days, assignmentMap, shiftTypes, openCell, onCellClick, onCellClose, onCellChange
}: {
  employee: Employee
  days: DayInfo[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  openCell: { employeeId: string; date: string } | null
  onCellClick: (employeeId: string, date: string) => void
  onCellClose: () => void
  onCellChange: (employeeId: string, date: string, shiftCode: string | null) => void
}) {
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

        return (
          <div
            key={day.date}
            className={`border-b border-slate-100 flex items-center justify-center cursor-pointer transition-colors
              ${isWeekend ? 'bg-[#F0F5F8]/50' : 'bg-white'}
              ${isOpen ? 'bg-[#E6EEF3] ring-1 ring-inset ring-[#003A5D]' : 'hover:bg-slate-50'}
              ${assignment?.isExternal ? 'ring-1 ring-inset ring-red-400' : ''}
            `}
            style={{ height: 34 }}
            onClick={() => isOpen ? onCellClose() : onCellClick(employee.id, day.date)}
          >
            {assignment?.shiftCode ? (
              <ShiftBadge code={assignment.shiftCode} shiftTypes={shiftTypes} />
            ) : (
              <span className="text-slate-200 text-xs select-none">—</span>
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
