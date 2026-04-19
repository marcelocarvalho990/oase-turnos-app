import type { Employee, AssignmentMap, DayInfo, Role } from '@/types'

const HF_ROLES: Role[] = ['TEAMLEITUNG']
const FAGE_ROLES: Role[] = ['FUNKTIONSSTUFE_3', 'FUNKTIONSSTUFE_2']
const SRK_ROLES: Role[] = ['FUNKTIONSSTUFE_1']
// Only real work shifts count towards consecutive-day tracking
const WORK_CODES = new Set(['F', 'F9', 'S', 'M'])
const MAX_CONSECUTIVE = 5

export function computeDayViolations(
  day: DayInfo,
  employees: Employee[],
  assignmentMap: AssignmentMap,
  days: DayInfo[],
): string[] {
  const issues: string[] = []

  const workersOn = (code: string) =>
    employees.filter(e => assignmentMap[e.id]?.[day.date]?.shiftCode === code)

  // ── F shift ──
  const fWorkers = workersOn('F')
  const fHF    = fWorkers.filter(e => HF_ROLES.includes(e.role)).length
  const fFAGE  = fWorkers.filter(e => FAGE_ROLES.includes(e.role)).length
  const fTotal = fWorkers.length

  if (fTotal === 0) {
    issues.push('F: sem cobertura')
  } else {
    if (fTotal < 4) issues.push(`F: ${fTotal}/4 pessoas`)
    if (fHF === 0 && fFAGE === 0) issues.push('F: sem HF nem FAGE')
  }

  // ── S shift ──
  const sWorkers  = workersOn('S')
  const sFAGE     = sWorkers.filter(e => HF_ROLES.includes(e.role) || FAGE_ROLES.includes(e.role)).length
  const sSRK      = sWorkers.filter(e => SRK_ROLES.includes(e.role)).length
  const sLERNENDE = sWorkers.filter(e => e.role === 'LERNENDE').length
  const sTotal    = sWorkers.length

  if (sTotal === 0) {
    issues.push('S: sem cobertura')
  } else {
    if (sFAGE === 0) issues.push('S: sem FAGE')
    if (sSRK === 0)  issues.push('S: sem SRK')
    if (sLERNENDE > 0) issues.push('S: aprendiz no turno S')
  }

  // ── S→F consecutive ──
  const dayIdx = days.findIndex(d => d.date === day.date)
  if (dayIdx > 0) {
    const prevDate = days[dayIdx - 1].date
    const prevSIds = new Set(
      employees
        .filter(e => assignmentMap[e.id]?.[prevDate]?.shiftCode === 'S')
        .map(e => e.id),
    )
    const sfNames = fWorkers
      .filter(e => prevSIds.has(e.id))
      .map(e => e.shortName)
    if (sfNames.length > 0) issues.push(`S→F: ${sfNames.join(', ')}`)
  }

  // ── Consecutive working days (> MAX_CONSECUTIVE) ──
  // Check every employee: count how many consecutive work days end on today
  if (dayIdx >= MAX_CONSECUTIVE) {
    for (const emp of employees) {
      // Only flag on the exact day where streak crosses the limit
      // (i.e., today IS a work day and the streak length equals MAX_CONSECUTIVE+1)
      const todayCode = assignmentMap[emp.id]?.[day.date]?.shiftCode
      if (!todayCode || !WORK_CODES.has(todayCode)) continue

      let streak = 1
      for (let i = dayIdx - 1; i >= 0; i--) {
        const code = assignmentMap[emp.id]?.[days[i].date]?.shiftCode
        if (code && WORK_CODES.has(code)) streak++
        else break
      }
      if (streak === MAX_CONSECUTIVE + 1) {
        // Only flag on the first violation day, not every subsequent day
        issues.push(`${emp.shortName}: ${streak} dias consecutivos`)
      }
    }
  }

  return issues
}

export function countTotalViolations(
  days: DayInfo[],
  employees: Employee[],
  assignmentMap: AssignmentMap,
): number {
  return days.reduce(
    (total, day) => total + computeDayViolations(day, employees, assignmentMap, days).length,
    0,
  )
}
