import type { Employee, AssignmentMap, DayInfo, Role } from '@/types'

const HF_ROLES: Role[] = ['TEAMLEITUNG']
const FAGE_ROLES: Role[] = ['FUNKTIONSSTUFE_3', 'FUNKTIONSSTUFE_2']
const SRK_ROLES: Role[] = ['FUNKTIONSSTUFE_1']

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
