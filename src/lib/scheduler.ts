/**
 * Role-aware TypeScript shift scheduler.
 * Implements qualification rules from the Tertianum operational spec:
 *   - HF (TEAMLEITUNG) = head nurse
 *   - FAGE (FUNKTIONSSTUFE_2/3) = qualified care worker
 *   - SRK (FUNKTIONSSTUFE_1/LERNENDE) = basic care worker
 *
 * Per-shift structure (correcoes_sistema_turnos.docx):
 *   Morning F: 1 HF + 1-2 FAGE + 2-4 SRK  → max 5 total
 *   Afternoon S: 1 FAGE + 1 SRK            → max 2 total
 *
 * Rules:
 *   - SRK must always be accompanied by at least 1 FAGE or HF
 *   - Work target = totalWorkShifts * (workPercentage / 100)
 *   - Max 6 consecutive days
 *   - Weekends balanced across employees (diff ≤ 1)
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

type RoleTier = 'HF' | 'FAGE' | 'SRK' | 'UNKNOWN'

function getTier(role: string): RoleTier {
  if (HF_ROLES.includes(role)) return 'HF'
  if (FAGE_ROLES.includes(role)) return 'FAGE'
  if (SRK_ROLES.includes(role)) return 'SRK'
  return 'UNKNOWN'
}

function isQualified(role: string): boolean {
  return HF_ROLES.includes(role) || FAGE_ROLES.includes(role)
}

// Per-shift slot targets: how many of each tier to fill
interface ShiftSlotSpec {
  hf: number      // exactly this many HF
  fageMin: number // minimum FAGE
  fageMax: number // maximum FAGE
  srkMin: number  // minimum SRK
  srkMax: number  // maximum SRK
  maxTotal: number
}

const SHIFT_SPECS: Record<string, ShiftSlotSpec> = {
  F:   { hf: 1, fageMin: 1, fageMax: 2, srkMin: 2, srkMax: 4, maxTotal: 5 },
  S:   { hf: 0, fageMin: 1, fageMax: 1, srkMin: 1, srkMax: 1, maxTotal: 2 },
  // Other shifts: generic qualified-first, no SRK alone
  DEFAULT: { hf: 0, fageMin: 1, fageMax: 99, srkMin: 0, srkMax: 99, maxTotal: 99 },
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

  const empAssignedDates = new Map<string, Set<string>>()
  for (const emp of employees) empAssignedDates.set(emp.id, new Set())

  const empShiftCount = new Map<string, number>()
  for (const emp of employees) empShiftCount.set(emp.id, 0)

  const empWeekendCount = new Map<string, number>()
  for (const emp of employees) empWeekendCount.set(emp.id, 0)

  // Target shifts per employee based on work percentage
  const workingDayCount = dates.filter(d => d.dayType === 'WEEKDAY').length
  const weekendDays = dates.filter(d => d.dayType !== 'WEEKDAY').length
  const targetShifts = new Map<string, number>()
  for (const emp of employees) {
    const base = Math.round((workingDayCount * 0.85 + weekendDays * 0.4) * (emp.workPercentage / 100))
    targetShifts.set(emp.id, Math.max(1, base))
  }

  // Max weekend shifts — aim for equal distribution ±1
  const totalWeekendDays = weekendDays
  const avgWeekendPerEmp = employees.length > 0 ? (totalWeekendDays * 2) / employees.length : 2
  // Allow at most ceil(avg) + 1 weekend shifts per employee
  const maxWeekendPerEmp = Math.ceil(avgWeekendPerEmp) + 1

  // Coverage rules indexed by dayType → shiftCode
  const coverageIdx = new Map<string, Map<string, SchedulerCoverageRule>>()
  for (const rule of coverageRules) {
    if (!coverageIdx.has(rule.dayType)) coverageIdx.set(rule.dayType, new Map())
    coverageIdx.get(rule.dayType)!.set(rule.shiftCode, rule)
  }

  const result: SchedulerAssignment[] = []

  // Per-day slot tracking: date → shiftCode → { empIds, hfCount, fageCount, srkCount }
  interface SlotState { empIds: string[]; hfCount: number; fageCount: number; srkCount: number }
  const daySlots = new Map<string, Map<string, SlotState>>()
  for (const d of dates) {
    const m = new Map<string, SlotState>()
    for (const s of workShifts) m.set(s.code, { empIds: [], hfCount: 0, fageCount: 0, srkCount: 0 })
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
    // Weekend fairness hard cap
    if (isWeekend(date) && (empWeekendCount.get(emp.id) ?? 0) >= maxWeekendPerEmp) return false
    // Don't overschedule beyond 110% of target
    const target = targetShifts.get(emp.id) ?? 20
    if ((empShiftCount.get(emp.id) ?? 0) >= Math.ceil(target * 1.1)) return false
    return true
  }

  function isEligible(emp: SchedulerEmployee, shift: SchedulerShiftType): boolean {
    if (shift.eligibleRoles.length === 0) return true
    return shift.eligibleRoles.includes(emp.role)
  }

  function assign(emp: SchedulerEmployee, date: string, shiftCode: string) {
    const slot = daySlots.get(date)!.get(shiftCode)!
    slot.empIds.push(emp.id)
    const tier = getTier(emp.role)
    if (tier === 'HF') slot.hfCount++
    else if (tier === 'FAGE') slot.fageCount++
    else if (tier === 'SRK') slot.srkCount++

    empAssignedDates.get(emp.id)!.add(date)
    empShiftCount.set(emp.id, (empShiftCount.get(emp.id) ?? 0) + 1)
    if (isWeekend(date)) empWeekendCount.set(emp.id, (empWeekendCount.get(emp.id) ?? 0) + 1)
    result.push({ employeeId: emp.id, date, shiftCode })
  }

  // Sort employees by need (fewest shifts relative to target), with weekend balance
  function sortedByNeed(date: string): SchedulerEmployee[] {
    return [...employees].sort((a, b) => {
      const aRatio = (empShiftCount.get(a.id) ?? 0) / (targetShifts.get(a.id) ?? 1)
      const bRatio = (empShiftCount.get(b.id) ?? 0) / (targetShifts.get(b.id) ?? 1)
      if (isWeekend(date)) {
        const aWe = empWeekendCount.get(a.id) ?? 0
        const bWe = empWeekendCount.get(b.id) ?? 0
        if (aWe !== bWe) return aWe - bWe
      }
      return aRatio - bRatio
    })
  }

  function fillSlotWithSpec(date: string, shift: SchedulerShiftType, spec: ShiftSlotSpec) {
    const slot = daySlots.get(date)!.get(shift.code)!
    const sorted = sortedByNeed(date)
    const eligible = sorted.filter(emp => canWork(emp, date) && isEligible(emp, shift))

    // Step 1: Fill HF slots
    let hfNeeded = spec.hf - slot.hfCount
    for (const emp of eligible) {
      if (hfNeeded <= 0) break
      if (slot.empIds.length >= spec.maxTotal) break
      if (getTier(emp.role) === 'HF') {
        assign(emp, date, shift.code)
        hfNeeded--
      }
    }

    // Step 2: Fill FAGE slots
    let fageNeeded = spec.fageMin - slot.fageCount
    const fageMax = spec.fageMax - slot.fageCount
    let fageAssigned = 0
    for (const emp of eligible) {
      if (fageAssigned >= fageMax) break
      if (slot.empIds.length >= spec.maxTotal) break
      if (getTier(emp.role) === 'FAGE' && !slot.empIds.includes(emp.id)) {
        assign(emp, date, shift.code)
        fageAssigned++
        fageNeeded = Math.max(0, fageNeeded - 1)
      }
    }

    // Step 3: Fill SRK slots (only if at least 1 qualified already assigned)
    const qualifiedCount = slot.hfCount + slot.fageCount
    if (qualifiedCount > 0) {
      let srkNeeded = spec.srkMin - slot.srkCount
      const srkMax = spec.srkMax - slot.srkCount
      let srkAssigned = 0
      for (const emp of eligible) {
        if (srkAssigned >= srkMax) break
        if (slot.empIds.length >= spec.maxTotal) break
        if (getTier(emp.role) === 'SRK' && !slot.empIds.includes(emp.id)) {
          assign(emp, date, shift.code)
          srkAssigned++
          srkNeeded = Math.max(0, srkNeeded - 1)
        }
      }
    }
  }

  function fillSlotGeneric(date: string, shift: SchedulerShiftType, idealCount: number) {
    const slot = daySlots.get(date)!.get(shift.code)!
    const sorted = sortedByNeed(date)
    const eligible = sorted.filter(emp => canWork(emp, date) && isEligible(emp, shift))
    let needed = idealCount - slot.empIds.length

    // Pass 1: qualified first
    for (const emp of eligible) {
      if (needed <= 0) break
      if (isQualified(emp.role) && !slot.empIds.includes(emp.id)) {
        assign(emp, date, shift.code)
        needed--
      }
    }
    // Pass 2: SRK only if at least 1 qualified present
    const qualifiedCount = slot.hfCount + slot.fageCount
    if (qualifiedCount > 0) {
      for (const emp of eligible) {
        if (needed <= 0) break
        if (getTier(emp.role) === 'SRK' && !slot.empIds.includes(emp.id)) {
          assign(emp, date, shift.code)
          needed--
        }
      }
    }
  }

  // Main loop
  for (const dayInfo of dates) {
    const { date } = dayInfo
    const dayType = getDayType(date)
    const rulesForDay = coverageIdx.get(dayType) ?? new Map()

    const shiftsToFill: Array<{ shift: SchedulerShiftType; ideal: number }> = []

    for (const shift of workShifts) {
      const rule = rulesForDay.get(shift.code)
      if (rule && rule.idealStaff > 0) {
        shiftsToFill.push({ shift, ideal: rule.idealStaff })
      }
    }

    // Fallback defaults
    if (shiftsToFill.length === 0) {
      const fShift = workShifts.find(s => s.code === 'F')
      const sShift = workShifts.find(s => s.code === 'S')
      if (fShift) shiftsToFill.push({ shift: fShift, ideal: 5 })
      if (sShift) shiftsToFill.push({ shift: sShift, ideal: 2 })
    }

    for (const { shift, ideal } of shiftsToFill) {
      const spec = SHIFT_SPECS[shift.code] ?? SHIFT_SPECS.DEFAULT
      if (spec !== SHIFT_SPECS.DEFAULT) {
        fillSlotWithSpec(date, shift, spec)
      } else {
        fillSlotGeneric(date, shift, ideal)
      }
    }
  }

  return result
}
