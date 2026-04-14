/**
 * Role-aware TypeScript shift scheduler.
 * Implements qualification rules from the Tertianum operational spec:
 *   - HF (TEAMLEITUNG) = head nurse
 *   - FAGE (FUNKTIONSSTUFE_2/3) = qualified care worker
 *   - SRK (FUNKTIONSSTUFE_1/LERNENDE) = basic care worker
 *
 * Rules:
 *   - SRK must always be accompanied by at least 1 FAGE or HF
 *   - Work target = totalWorkShifts * (workPercentage / 100)
 *   - Max 6 consecutive days
 *   - Weekends balanced across employees
 */

export interface SchedulerEmployee {
  id: string
  name: string
  role: string
  workPercentage: number
  hardBlocks: string[]
}

export interface SchedulerShiftType {
  code: string
  name: string
  durationMinutes: number
  isAbsence: boolean
  eligibleRoles: string[]
}

export interface SchedulerCoverageRule {
  shiftCode: string
  dayType: 'WEEKDAY' | 'SATURDAY' | 'SUNDAY'
  minStaff: number
  idealStaff: number
}

export interface SchedulerDate {
  date: string
  dayType: 'WEEKDAY' | 'SATURDAY' | 'SUNDAY'
}

export interface SchedulerInput {
  year: number
  month: number
  employees: SchedulerEmployee[]
  shiftTypes: SchedulerShiftType[]
  coverageRules: SchedulerCoverageRule[]
  dates: SchedulerDate[]
}

export interface SchedulerAssignment {
  employeeId: string
  date: string
  shiftCode: string
}

// Role classification
const HF_ROLES = ['TEAMLEITUNG']
const FAGE_ROLES = ['FUNKTIONSSTUFE_3', 'FUNKTIONSSTUFE_2']
const SRK_ROLES = ['FUNKTIONSSTUFE_1', 'LERNENDE']

function isQualified(role: string): boolean {
  return HF_ROLES.includes(role) || FAGE_ROLES.includes(role)
}

function getDayType(dateStr: string): 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  if (dow === 6) return 'SATURDAY'
  if (dow === 0) return 'SUNDAY'
  return 'WEEKDAY'
}

function isWeekend(dateStr: string): boolean {
  const dow = new Date(dateStr + 'T00:00:00').getDay()
  return dow === 0 || dow === 6
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export function runScheduler(input: SchedulerInput): SchedulerAssignment[] {
  const { employees, shiftTypes, coverageRules, dates } = input

  const workShifts = shiftTypes.filter(s => !s.isAbsence)

  // Pre-build sets
  const hardBlockSet = new Map<string, Set<string>>()
  for (const emp of employees) hardBlockSet.set(emp.id, new Set(emp.hardBlocks))

  // Track assignments per employee
  const empAssignedDates = new Map<string, Set<string>>()
  for (const emp of employees) empAssignedDates.set(emp.id, new Set())

  // Track shift count per employee
  const empShiftCount = new Map<string, number>()
  for (const emp of employees) empShiftCount.set(emp.id, 0)

  // Track weekend shifts per employee (for fairness)
  const empWeekendCount = new Map<string, number>()
  for (const emp of employees) empWeekendCount.set(emp.id, 0)

  // Total working days in month (for target calculation)
  const totalDays = dates.length
  const totalShiftsInMonth = totalDays // 1 shift slot per day per person max

  // Target shifts per employee based on work percentage
  // 100% ≈ 20 shifts/month (5 days/week × ~4 weeks, adjusted)
  const workingDayCount = dates.filter(d => d.dayType === 'WEEKDAY').length
  const targetShifts = new Map<string, number>()
  for (const emp of employees) {
    // Scale: full-time = workingDayCount + (weekends * 0.3 probability)
    const weekendDays = dates.filter(d => d.dayType !== 'WEEKDAY').length
    const baseTarget = Math.round((workingDayCount * 0.85 + weekendDays * 0.4) * (emp.workPercentage / 100))
    targetShifts.set(emp.id, Math.max(1, baseTarget))
  }

  // Coverage rules indexed by dayType → shiftCode
  const coverageIdx = new Map<string, Map<string, SchedulerCoverageRule>>()
  for (const rule of coverageRules) {
    if (!coverageIdx.has(rule.dayType)) coverageIdx.set(rule.dayType, new Map())
    coverageIdx.get(rule.dayType)!.set(rule.shiftCode, rule)
  }

  const result: SchedulerAssignment[] = []

  // Per-day assignment tracking: date → shiftCode → [employeeIds]
  const daySlots = new Map<string, Map<string, string[]>>()
  for (const d of dates) {
    const m = new Map<string, string[]>()
    for (const s of workShifts) m.set(s.code, [])
    daySlots.set(d.date, m)
  }

  function alreadyWorking(empId: string, date: string): boolean {
    return empAssignedDates.get(empId)?.has(date) ?? false
  }

  function consecutiveDays(empId: string, date: string): number {
    let count = 0
    let cur = date
    while (empAssignedDates.get(empId)?.has(addDays(cur, -1))) {
      count++
      cur = addDays(cur, -1)
    }
    return count
  }

  function canWork(emp: SchedulerEmployee, date: string): boolean {
    if (hardBlockSet.get(emp.id)?.has(date)) return false
    if (alreadyWorking(emp.id, date)) return false
    if (consecutiveDays(emp.id, date) >= 6) return false
    // Don't overschedule beyond target
    const target = targetShifts.get(emp.id) ?? 20
    if ((empShiftCount.get(emp.id) ?? 0) >= Math.ceil(target * 1.1)) return false
    return true
  }

  function isEligible(emp: SchedulerEmployee, shift: SchedulerShiftType): boolean {
    if (shift.eligibleRoles.length === 0) return true
    return shift.eligibleRoles.includes(emp.role)
  }

  function assign(emp: SchedulerEmployee, date: string, shiftCode: string) {
    daySlots.get(date)!.get(shiftCode)!.push(emp.id)
    empAssignedDates.get(emp.id)!.add(date)
    empShiftCount.set(emp.id, (empShiftCount.get(emp.id) ?? 0) + 1)
    if (isWeekend(date)) empWeekendCount.set(emp.id, (empWeekendCount.get(emp.id) ?? 0) + 1)
    result.push({ employeeId: emp.id, date, shiftCode })
  }

  // Sort employees for filling: prioritize by least assigned / target ratio
  function sortedByNeed(date: string, preferQualified = false): SchedulerEmployee[] {
    return [...employees].sort((a, b) => {
      // Prefer employees who need more shifts (below target)
      const aRatio = (empShiftCount.get(a.id) ?? 0) / (targetShifts.get(a.id) ?? 1)
      const bRatio = (empShiftCount.get(b.id) ?? 0) / (targetShifts.get(b.id) ?? 1)
      // On weekends, also balance weekend count
      const aWe = isWeekend(date) ? (empWeekendCount.get(a.id) ?? 0) : 0
      const bWe = isWeekend(date) ? (empWeekendCount.get(b.id) ?? 0) : 0
      if (preferQualified) {
        const aQ = isQualified(a.role) ? 0 : 1
        const bQ = isQualified(b.role) ? 0 : 1
        if (aQ !== bQ) return aQ - bQ
      }
      if (aWe !== bWe) return aWe - bWe
      return aRatio - bRatio
    })
  }

  // Main loop: process each day
  for (const dayInfo of dates) {
    const { date } = dayInfo
    const dayType = getDayType(date)
    const rulesForDay = coverageIdx.get(dayType) ?? new Map()

    // Determine what shifts need coverage today
    const shiftsToFill: Array<{ shift: SchedulerShiftType; ideal: number; min: number }> = []

    for (const shift of workShifts) {
      const rule = rulesForDay.get(shift.code)
      if (rule && rule.idealStaff > 0) {
        shiftsToFill.push({ shift, ideal: rule.idealStaff, min: rule.minStaff })
      }
    }

    // Fallback: if no rules, use F and S with 1 person each
    if (shiftsToFill.length === 0) {
      const fShift = workShifts.find(s => s.code === 'F')
      const sShift = workShifts.find(s => s.code === 'S')
      if (fShift) shiftsToFill.push({ shift: fShift, ideal: 3, min: 2 })
      if (sShift) shiftsToFill.push({ shift: sShift, ideal: 2, min: 1 })
    }

    // Fill each shift — qualified-first to ensure supervision rules
    for (const { shift, ideal } of shiftsToFill) {
      const slot = daySlots.get(date)!.get(shift.code)!
      let needed = ideal - slot.length
      if (needed <= 0) continue

      // Pass 1: fill with qualified staff first (HF and FAGE)
      const qualifiedCandidates = sortedByNeed(date, true).filter(emp =>
        canWork(emp, date) && isEligible(emp, shift) && isQualified(emp.role)
      )
      for (const emp of qualifiedCandidates) {
        if (needed <= 0) break
        assign(emp, date, shift.code)
        needed--
      }

      // Pass 2: fill remaining slots with SRK (only if at least 1 qualified was assigned)
      const qualifiedAssigned = daySlots.get(date)!.get(shift.code)!.filter(id => {
        const emp = employees.find(e => e.id === id)
        return emp ? isQualified(emp.role) : false
      }).length

      if (qualifiedAssigned > 0) {
        const srkCandidates = sortedByNeed(date, false).filter(emp =>
          canWork(emp, date) && isEligible(emp, shift) && SRK_ROLES.includes(emp.role)
        )
        for (const emp of srkCandidates) {
          if (needed <= 0) break
          assign(emp, date, shift.code)
          needed--
        }
      }
    }
  }

  return result
}
