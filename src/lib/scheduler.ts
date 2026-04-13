/**
 * Pure TypeScript shift scheduler — greedy + balancing.
 * Replaces the Python OR-Tools solver for environments without Python.
 */

export interface SchedulerEmployee {
  id: string
  name: string
  role: string
  workPercentage: number
  hardBlocks: string[] // dates to skip
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

function getDayType(dateStr: string): 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  if (dow === 6) return 'SATURDAY'
  if (dow === 0) return 'SUNDAY'
  return 'WEEKDAY'
}

export function runScheduler(input: SchedulerInput): SchedulerAssignment[] {
  const { employees, shiftTypes, coverageRules, dates } = input

  // Work shifts only (no absence types)
  const workShifts = shiftTypes.filter(s => !s.isAbsence)

  // Build sets for fast lookup
  const hardBlockSet = new Map<string, Set<string>>() // employeeId -> Set<date>
  for (const emp of employees) {
    hardBlockSet.set(emp.id, new Set(emp.hardBlocks))
  }

  // Track assignments: { date -> { shiftCode -> employeeId[] } }
  const dayAssignments = new Map<string, Map<string, string[]>>()
  for (const d of dates) {
    const m = new Map<string, string[]>()
    for (const s of workShifts) m.set(s.code, [])
    dayAssignments.set(d.date, m)
  }

  // Track hours assigned per employee (in minutes)
  const empMinutes = new Map<string, number>()
  for (const emp of employees) empMinutes.set(emp.id, 0)

  // Track last assigned date per employee for rest-day enforcement
  const lastWorked = new Map<string, string | null>()
  for (const emp of employees) lastWorked.set(emp.id, null)

  // Track consecutive work days per employee
  const consecutiveDays = new Map<string, number>()
  for (const emp of employees) consecutiveDays.set(emp.id, 0)

  // Track assigned dates per employee (to check prev day)
  const empAssignedDates = new Map<string, Set<string>>()
  for (const emp of employees) empAssignedDates.set(emp.id, new Set())

  const result: SchedulerAssignment[] = []

  // Target minutes per employee for the month
  // Standard full-time = 168h/month (21 working days × 8h), scaled by workPercentage
  const daysInMonth = dates.length
  const fullTimeMinutes = daysInMonth * 8 * 60 * (5 / 7) // approx working days
  const targetMinutes = new Map<string, number>()
  for (const emp of employees) {
    targetMinutes.set(emp.id, fullTimeMinutes * (emp.workPercentage / 100))
  }

  // Group coverage rules by date type and shift
  const coverageMap = new Map<string, Map<string, SchedulerCoverageRule>>()
  for (const rule of coverageRules) {
    if (!coverageMap.has(rule.dayType)) coverageMap.set(rule.dayType, new Map())
    coverageMap.get(rule.dayType)!.set(rule.shiftCode, rule)
  }

  function canWork(emp: SchedulerEmployee, date: string): boolean {
    if (hardBlockSet.get(emp.id)?.has(date)) return false
    // No more than 6 consecutive days
    if ((consecutiveDays.get(emp.id) ?? 0) >= 6) return false
    return true
  }

  function isEligible(emp: SchedulerEmployee, shift: SchedulerShiftType): boolean {
    if (shift.eligibleRoles.length === 0) return true
    return shift.eligibleRoles.includes(emp.role)
  }

  function getAssignedThisDay(date: string, shiftCode: string): string[] {
    return dayAssignments.get(date)?.get(shiftCode) ?? []
  }

  function alreadyAssignedToday(empId: string, date: string): boolean {
    for (const [code] of dayAssignments.get(date) ?? []) {
      if (dayAssignments.get(date)?.get(code)?.includes(empId)) return true
    }
    return false
  }

  // Process each date in order
  for (const dayInfo of dates) {
    const { date } = dayInfo
    const dayType = getDayType(date)

    // Get required shifts for this day type
    const rulesForDay = coverageMap.get(dayType) ?? new Map()

    // Determine shift demand: use coverageRules if available, otherwise use common work shifts
    const shiftsNeeded: Array<{ shift: SchedulerShiftType; ideal: number; min: number }> = []

    for (const shift of workShifts) {
      const rule = rulesForDay.get(shift.code)
      if (rule) {
        if (rule.idealStaff > 0) {
          shiftsNeeded.push({ shift, ideal: rule.idealStaff, min: rule.minStaff })
        }
      }
    }

    // If no coverage rules defined, use all work shifts with 1 person each
    if (shiftsNeeded.length === 0) {
      for (const shift of workShifts) {
        shiftsNeeded.push({ shift, ideal: 1, min: 1 })
      }
    }

    // Sort employees by: least hours assigned first (balancing)
    const sortedEmployees = [...employees].sort((a, b) => {
      const aMin = empMinutes.get(a.id) ?? 0
      const bMin = empMinutes.get(b.id) ?? 0
      const aTarget = targetMinutes.get(a.id) ?? 1
      const bTarget = targetMinutes.get(b.id) ?? 1
      // Sort by ratio of assigned/target (ascending = needs more hours first)
      return (aMin / aTarget) - (bMin / bTarget)
    })

    // Fill each shift
    for (const { shift, ideal } of shiftsNeeded) {
      let assigned = getAssignedThisDay(date, shift.code).length

      for (const emp of sortedEmployees) {
        if (assigned >= ideal) break
        if (!canWork(emp, date)) continue
        if (!isEligible(emp, shift)) continue
        if (alreadyAssignedToday(emp.id, date)) continue

        // Assign
        dayAssignments.get(date)!.get(shift.code)!.push(emp.id)
        empMinutes.set(emp.id, (empMinutes.get(emp.id) ?? 0) + shift.durationMinutes)
        empAssignedDates.get(emp.id)!.add(date)

        // Update consecutive days counter
        const prev = new Date(date + 'T00:00:00')
        prev.setDate(prev.getDate() - 1)
        const prevStr = prev.toISOString().split('T')[0]
        if (empAssignedDates.get(emp.id)?.has(prevStr)) {
          consecutiveDays.set(emp.id, (consecutiveDays.get(emp.id) ?? 0) + 1)
        } else {
          consecutiveDays.set(emp.id, 1)
        }

        result.push({ employeeId: emp.id, date, shiftCode: shift.code })
        assigned++
      }
    }
  }

  return result
}
