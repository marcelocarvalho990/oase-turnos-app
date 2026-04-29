/**
 * Oase — Shift Scheduler (TypeScript fallback)
 *
 * ROLE TIERS
 *   HF   = TEAMLEITUNG
 *   FAGE = FUNKTIONSSTUFE_3, FUNKTIONSSTUFE_2
 *   SRK  = FUNKTIONSSTUFE_1, LERNENDE
 *
 * HARD SHIFT COMPOSITION RULES
 *   Morning F — 3–5 people (target 4):
 *     Option A:  1 HF   + 2–4 SRK
 *     Option B:  1 FAGE + 2–4 SRK
 *     Option C:  1 HF   + 1 FAGE + 1–3 SRK
 *     Rule: at least 1 qualified (HF or FAGE); never SRK-only
 *     F9:  MANDATORY — 1 SRK (or FAGE fallback) designated food/logistics person
 *          assigned as separate shift code alongside F on every morning day
 *
 *   Afternoon S — exactly 2 people:
 *     1 FAGE + 1 SRK (non-LERNENDE)
 *
 *   Middle M — LAST RESORT ONLY:
 *     Maximum 1 M per day.
 *     Only used when workload target cannot be met via F or S placements.
 *     Never used as a standard scheduling option.
 *
 * EXTERNAL STAFF rule: employees with isExternal=true are sorted last in all
 *   assignments and only used when internal staff cannot fill a slot.
 *
 * LERNENDE rule:  only eligible for F and F9 shifts (school days → hardBlocks)
 * No S→F rule:    employee who works S on day D may not work F on day D+1
 *
 * WORKLOAD TARGETS
 *   100% → 21 shifts / 31-day month (scales with month length and %)
 *   formula: round(21 × daysInMonth/31 × workPercentage/100)
 */

export interface SchedulerEmployee {
  id: string
  name: string
  role: string
  workPercentage: number
  hardBlocks: string[]
  /** True for staff borrowed from other teams — used last in all assignments */
  isExternal?: boolean
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

export interface SchedulerConstraint {
  type: 'MIN_SHIFT' | 'MAX_SHIFT' | 'BLOCK_SHIFT' | 'MIN_WEEKENDS' | 'MAX_WEEKENDS'
  employeeId: string
  shiftCode?: string
  count?: number
}

export interface SchedulerInput {
  year: number
  month: number
  employees: SchedulerEmployee[]
  shiftTypes: SchedulerShiftType[]
  coverageRules: SchedulerCoverageRule[]
  dates: SchedulerDate[]
  constraints?: SchedulerConstraint[]
}

export interface SchedulerAssignment {
  employeeId: string
  date: string
  shiftCode: string
}

// ── Role classification ───────────────────────────────────────────────────────

type RoleTier = 'HF' | 'FAGE' | 'SRK' | 'UNKNOWN'

function getTier(role: string): RoleTier {
  if (role === 'TEAMLEITUNG') return 'HF'
  if (role === 'FUNKTIONSSTUFE_3' || role === 'FUNKTIONSSTUFE_2') return 'FAGE'
  if (role === 'FUNKTIONSSTUFE_1' || role === 'LERNENDE') return 'SRK'
  return 'UNKNOWN'
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay() // 0=Sun … 6=Sat
}

function isWeekend(dateStr: string): boolean {
  const d = getDayOfWeek(dateStr)
  return d === 0 || d === 6
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── Slot state ────────────────────────────────────────────────────────────────

interface SlotState {
  empIds: string[]
  hfCount: number
  fageCount: number
  srkCount: number
}

function emptySlot(): SlotState {
  return { empIds: [], hfCount: 0, fageCount: 0, srkCount: 0 }
}

// ─────────────────────────────────────────────────────────────────────────────

export function runScheduler(input: SchedulerInput): SchedulerAssignment[] {
  const { employees, shiftTypes, coverageRules, dates, constraints = [] } = input

  const workShifts = shiftTypes.filter(s => !s.isAbsence)
  const daysInMonth = dates.length

  // ── Shift type lookups ────────────────────────────────────────────────────
  const fShift = workShifts.find(s => s.code === 'F')
  const sShift = workShifts.find(s => s.code === 'S')
  const mShift = workShifts.find(s => s.code === 'M')
  const f9Shift = workShifts.find(s => s.code === 'F9') // mandatory when F is scheduled

  // ── Workload targets ──────────────────────────────────────────────────────
  // 100% = 164.8h/month (Swiss standard), flat per month regardless of length
  const TARGET_HOURS_100PCT = 164.8
  const targetMinutes = new Map<string, number>()
  for (const emp of employees) {
    const raw = TARGET_HOURS_100PCT * 60 * (emp.workPercentage / 100)
    targetMinutes.set(emp.id, Math.round(raw))
  }

  // Pre-compute effective worked minutes per shift code.
  // F and S shifts include a mandatory 36-minute break that is not counted as work time.
  const BREAK_MIN = 36
  const shiftEffectiveMin = new Map<string, number>()
  for (const s of workShifts) {
    const mins = (s.code === 'F' || s.code === 'S')
      ? Math.max(0, s.durationMinutes - BREAK_MIN)
      : s.durationMinutes
    shiftEffectiveMin.set(s.code, mins)
  }

  // ── Coverage rules index ──────────────────────────────────────────────────
  const coverageIdx = new Map<string, Map<string, SchedulerCoverageRule>>()
  for (const rule of coverageRules) {
    if (!coverageIdx.has(rule.dayType)) coverageIdx.set(rule.dayType, new Map())
    coverageIdx.get(rule.dayType)!.set(rule.shiftCode, rule)
  }

  // ── Constraint lookups ────────────────────────────────────────────────────
  const blockShifts = new Map<string, Set<string>>()
  const maxShiftCounts = new Map<string, Map<string, number>>()
  const maxWeekendsConstraint = new Map<string, number>()

  for (const c of constraints) {
    if (c.type === 'BLOCK_SHIFT' && c.shiftCode) {
      if (!blockShifts.has(c.employeeId)) blockShifts.set(c.employeeId, new Set())
      blockShifts.get(c.employeeId)!.add(c.shiftCode)
    }
    if (c.type === 'MAX_SHIFT' && c.shiftCode && c.count !== undefined) {
      if (!maxShiftCounts.has(c.employeeId)) maxShiftCounts.set(c.employeeId, new Map())
      maxShiftCounts.get(c.employeeId)!.set(c.shiftCode, c.count)
    }
    if (c.type === 'MAX_WEEKENDS' && c.count !== undefined) {
      maxWeekendsConstraint.set(c.employeeId, c.count)
    }
  }

  // ── Tracking state ────────────────────────────────────────────────────────
  const hardBlockSet = new Map<string, Set<string>>()
  for (const emp of employees) hardBlockSet.set(emp.id, new Set(emp.hardBlocks))

  const empAssignedDates = new Map<string, Set<string>>()
  const empShiftCount = new Map<string, number>()
  const empWeekendCount = new Map<string, number>()
  const empShiftCodeCount = new Map<string, Map<string, number>>()
  const empLastShift = new Map<string, string | null>() // date → shift code for S→F constraint

  for (const emp of employees) {
    empAssignedDates.set(emp.id, new Set())
    empShiftCount.set(emp.id, 0)
    empWeekendCount.set(emp.id, 0)
    empShiftCodeCount.set(emp.id, new Map())
    empLastShift.set(emp.id, null)
  }

  const empAssignedMinutes = new Map<string, number>()
  for (const emp of employees) {
    empAssignedMinutes.set(emp.id, 0)
  }

  // Day-slot state: date → shiftCode → SlotState
  const daySlots = new Map<string, Map<string, SlotState>>()
  for (const d of dates) {
    const m = new Map<string, SlotState>()
    for (const s of workShifts) m.set(s.code, emptySlot())
    daySlots.set(d.date, m)
  }

  // Weekend cap: target ~4 slots per weekend day spread across employees.
  // Using ×4 so that employees aren't blocked on the last weekend of the month
  // just because they worked earlier weekends (old ×2 formula was too restrictive).
  const weekendDays = dates.filter(d => isWeekend(d.date)).length
  const maxWeekendPerEmp = Math.ceil((weekendDays * 4) / Math.max(employees.length, 1)) + 1

  const result: SchedulerAssignment[] = []

  // ── Helpers ───────────────────────────────────────────────────────────────

  function consecutiveDays(empId: string, date: string): number {
    let count = 0
    let cur = date
    while (empAssignedDates.get(empId)?.has(addDays(cur, -1))) {
      count++
      cur = addDays(cur, -1)
    }
    return count
  }

  function canWork(emp: SchedulerEmployee, date: string, shiftCode?: string): boolean {
    // Hard block (vacation, absence, or already-fixed assignment)
    if (hardBlockSet.get(emp.id)?.has(date)) return false
    // Only one shift per day
    if (empAssignedDates.get(emp.id)?.has(date)) return false
    // Max 5 consecutive days
    if (consecutiveDays(emp.id, date) >= 5) return false
    // Min 2 rest days after a 5-day streak:
    // if yesterday was a rest day AND the streak before that was ≥ 5, block today too
    {
      const yesterday = addDays(date, -1)
      if (
        !empAssignedDates.get(emp.id)?.has(yesterday) &&
        consecutiveDays(emp.id, yesterday) >= 5
      ) return false
    }
    // No S shift followed by F shift next day
    if (shiftCode === 'F') {
      const prevDate = addDays(date, -1)
      const prevDateAssignments = [...(empAssignedDates.get(emp.id) ?? [])]
      if (prevDateAssignments.includes(prevDate)) {
        // Check if they worked S the previous day
        const prevSlots = daySlots.get(prevDate)
        if (prevSlots?.get('S')?.empIds.includes(emp.id)) return false
      }
    }
    // Weekend fairness cap
    if (isWeekend(date) && (empWeekendCount.get(emp.id) ?? 0) >= maxWeekendPerEmp) return false
    // Manager MAX_WEEKENDS constraint
    if (isWeekend(date)) {
      const maxWe = maxWeekendsConstraint.get(emp.id)
      if (maxWe !== undefined && (empWeekendCount.get(emp.id) ?? 0) >= maxWe) return false
    }
    // Manager MAX_SHIFT constraint
    if (shiftCode) {
      const maxForShift = maxShiftCounts.get(emp.id)?.get(shiftCode)
      if (maxForShift !== undefined) {
        const cur = empShiftCodeCount.get(emp.id)?.get(shiftCode) ?? 0
        if (cur >= maxForShift) return false
      }
    }
    return true
  }

  function isEligible(emp: SchedulerEmployee, shift: SchedulerShiftType): boolean {
    // Manager BLOCK_SHIFT constraint
    if (blockShifts.get(emp.id)?.has(shift.code)) return false
    // LERNENDE can only work F (and F9 if applicable)
    if (emp.role === 'LERNENDE' && shift.code !== 'F' && shift.code !== 'F9') return false
    // Role eligibility from DB
    if (shift.eligibleRoles.length > 0 && !shift.eligibleRoles.includes(emp.role)) return false
    return true
  }

  function atTarget(empId: string): boolean {
    return (empAssignedMinutes.get(empId) ?? 0) >= (targetMinutes.get(empId) ?? 99999)
  }

  function assign(emp: SchedulerEmployee, date: string, shiftCode: string) {
    const slot = daySlots.get(date)!.get(shiftCode)!
    slot.empIds.push(emp.id)
    const tier = getTier(emp.role)
    if (tier === 'HF') slot.hfCount++
    else if (tier === 'FAGE') slot.fageCount++
    else slot.srkCount++

    empAssignedDates.get(emp.id)!.add(date)
    empShiftCount.set(emp.id, (empShiftCount.get(emp.id) ?? 0) + 1)
    if (isWeekend(date)) empWeekendCount.set(emp.id, (empWeekendCount.get(emp.id) ?? 0) + 1)
    const codeMap = empShiftCodeCount.get(emp.id)!
    codeMap.set(shiftCode, (codeMap.get(shiftCode) ?? 0) + 1)
    result.push({ employeeId: emp.id, date, shiftCode })
    const shiftMins = shiftEffectiveMin.get(shiftCode) ?? 0
    empAssignedMinutes.set(emp.id, (empAssignedMinutes.get(emp.id) ?? 0) + shiftMins)
  }

  /** Sort employees by how far they are from target (most under-assigned first).
   *  External staff are always sorted after internal staff.
   *  On weekends also factor in weekend count for fairness. */
  function sortedByNeed(date: string, excludeAtTarget = false): SchedulerEmployee[] {
    return [...employees]
      .filter(emp => !excludeAtTarget || !atTarget(emp.id))
      .sort((a, b) => {
        // External staff always go last — prefer internal employees first
        const aExt = a.isExternal ? 1 : 0
        const bExt = b.isExternal ? 1 : 0
        if (aExt !== bExt) return aExt - bExt

        const aRatio = (empAssignedMinutes.get(a.id) ?? 0) / (targetMinutes.get(a.id) ?? 1)
        const bRatio = (empAssignedMinutes.get(b.id) ?? 0) / (targetMinutes.get(b.id) ?? 1)
        if (isWeekend(date)) {
          const aWe = empWeekendCount.get(a.id) ?? 0
          const bWe = empWeekendCount.get(b.id) ?? 0
          if (aWe !== bWe) return aWe - bWe
        }
        const ratioDiff = aRatio - bRatio
        // Tiebreaker: when ratios are within 2%, prefer employee with fewer total shifts
        if (Math.abs(ratioDiff) < 0.02) {
          return (empShiftCount.get(a.id) ?? 0) - (empShiftCount.get(b.id) ?? 0)
        }
        return ratioDiff
      })
  }

  // ── S shift fill ──────────────────────────────────────────────────────────
  // Exactly 1 FAGE + 1 SRK (never LERNENDE). Fill S before F on each day.

  function fillSShift(date: string) {
    if (!sShift) return
    const slot = daySlots.get(date)!.get('S')!
    const sorted = sortedByNeed(date)

    // 1. Assign 1 FAGE — distribute S shifts evenly; prefer employees below their hour target
    if (slot.fageCount === 0) {
      const candidates = sorted
        .filter(e => getTier(e.role) === 'FAGE' && canWork(e, date, 'S') && isEligible(e, sShift) && !atTarget(e.id))
        .sort((a, b) => {
          // Primary: fewest S shifts so far (balance S load among FAGE)
          const aSS = empShiftCodeCount.get(a.id)?.get('S') ?? 0
          const bSS = empShiftCodeCount.get(b.id)?.get('S') ?? 0
          if (aSS !== bSS) return aSS - bSS
          // Secondary: overall need ratio
          return ((empAssignedMinutes.get(a.id) ?? 0) / (targetMinutes.get(a.id) ?? 1)) -
                 ((empAssignedMinutes.get(b.id) ?? 0) / (targetMinutes.get(b.id) ?? 1))
        })
      if (candidates[0]) assign(candidates[0], date, 'S')
    }
    if (slot.fageCount === 0) return // can't staff S without FAGE

    // 2. Assign 1 SRK (not LERNENDE) — only employees below their hour target
    if (slot.empIds.length < 2) {
      const candidates = sorted.filter(
        e =>
          getTier(e.role) === 'SRK' &&
          e.role !== 'LERNENDE' &&
          canWork(e, date, 'S') &&
          isEligible(e, sShift) &&
          !slot.empIds.includes(e.id) &&
          !atTarget(e.id)
      )
      if (candidates[0]) assign(candidates[0], date, 'S')
    }
  }

  // ── F shift fill ──────────────────────────────────────────────────────────
  // 3–5 people per morning, targeting 4:
  //   Option A: 1 HF + 2–4 SRK
  //   Option B: 1 FAGE + 2–4 SRK
  //   Option C: 1 HF + 1 FAGE + 1–3 SRK
  // At least 1 qualified required; SRK-only is strictly forbidden.
  // Note: F9 is assigned separately alongside F (adds 1 more to the morning team).

  const F_TARGET = 4  // target headcount in the F slot (F9 adds 1 on top)
  const F_MAX = 5     // absolute maximum in the F slot
  const F_MIN = 3     // minimum acceptable

  function fillFShift(date: string) {
    if (!fShift) return
    const slot = daySlots.get(date)!.get('F')!
    const sorted = sortedByNeed(date)

    // eligible(): only employees below their hour target (hard stop)
    const eligible = (tier: RoleTier, allowLernende = true) =>
      sorted.filter(
        e =>
          getTier(e.role) === tier &&
          (allowLernende || e.role !== 'LERNENDE') &&
          canWork(e, date, 'F') &&
          isEligible(e, fShift) &&
          !slot.empIds.includes(e.id) &&
          !atTarget(e.id)
      )

    // Step 1: try 1 HF (preferred — preserves FAGE for S shift)
    if (slot.hfCount === 0) {
      const hf = eligible('HF')[0]
      if (hf) assign(hf, date, 'F')
    }

    // Step 2: if no HF → FAGE is required (Option B); if HF → FAGE optional (Option C)
    const needFage = slot.hfCount === 0
    if (needFage && slot.fageCount === 0) {
      const fage = eligible('FAGE')[0]
      if (fage) assign(fage, date, 'F')
    }

    // Step 3: abort if still no qualified staff
    if (slot.hfCount + slot.fageCount === 0) return

    // Step 4: fill SRK up to F_TARGET (LERNENDE allowed on F)
    for (const emp of eligible('SRK')) {
      if (slot.empIds.length >= F_TARGET) break
      assign(emp, date, 'F')
    }

    // Step 5: if still < F_TARGET with HF but no FAGE → try Option C (add FAGE)
    if (slot.empIds.length < F_TARGET && slot.hfCount > 0 && slot.fageCount === 0) {
      const fage = eligible('FAGE')[0]
      if (fage) assign(fage, date, 'F')
      for (const emp of eligible('SRK')) {
        if (slot.empIds.length >= F_TARGET) break
        assign(emp, date, 'F')
      }
    }

    // Step 6: if still < F_MIN (staff shortage) — fill with any eligible person, including at-target
    if (slot.hfCount + slot.fageCount > 0 && slot.empIds.length < F_MIN) {
      const extra = sorted.filter(
        e => canWork(e, date, 'F') && isEligible(e, fShift) && !slot.empIds.includes(e.id)
      )
      for (const emp of extra) {
        if (slot.empIds.length >= F_MAX) break
        assign(emp, date, 'F')
      }
    }
  }

  // ── F9 fill (MANDATORY — always required on every morning day) ──────────
  // Assigns exactly 1 SRK-tier employee to the F9 slot (food/logistics role).
  // F9 person works the exact same hours as F — they are part of the morning team.
  // F9 is NEVER the same person as someone already assigned to F that day.
  // Fallback: if no SRK is available, try FAGE before leaving F9 empty.

  function fillF9Shift(date: string) {
    if (!f9Shift) return
    const slot = daySlots.get(date)!.get('F9')!
    if (slot.empIds.length > 0) return // already filled
    const sorted = sortedByNeed(date)
    const fSlotIds = daySlots.get(date)!.get('F')?.empIds ?? []

    const isAvailableForF9 = (e: SchedulerEmployee) =>
      getTier(e.role) === 'SRK' &&
      canWork(e, date, 'F9') &&
      isEligible(e, f9Shift) &&
      !fSlotIds.includes(e.id) &&
      !atTarget(e.id)

    // Priority 1: LERNENDE — they cannot work S shifts, so F9 is their only way
    // to accumulate hours beyond what the F slot provides. Give them first pick.
    const lernendeCandidate = sorted.find(e => e.role === 'LERNENDE' && isAvailableForF9(e))
    if (lernendeCandidate) { assign(lernendeCandidate, date, 'F9'); return }

    // Priority 2: other SRK (FUNKTIONSSTUFE_1) below target
    const srkPick = sorted.find(e => e.role !== 'LERNENDE' && isAvailableForF9(e))
    if (srkPick) { assign(srkPick, date, 'F9'); return }

    // Fallback: FAGE if no SRK available — only below-target, skip eligibleRoles check (emergency)
    const fageCandidates = sorted.filter(
      e =>
        getTier(e.role) === 'FAGE' &&
        canWork(e, date, 'F9') &&
        !blockShifts.get(e.id)?.has('F9') &&
        !fSlotIds.includes(e.id) &&
        !atTarget(e.id)
    )
    if (fageCandidates[0]) assign(fageCandidates[0], date, 'F9')
  }

  // ── M shift fill (LAST RESORT only) ─────────────────────────────────────
  // M is only assigned when there is a genuine coverage gap that F/S cannot fill.
  // MAXIMUM 1 M shift per day — never used as standard scheduling.
  // Only assigns employees who are below their workload target.

  function fillMShift(date: string) {
    if (!mShift) return
    const slot = daySlots.get(date)!.get('M')!
    if (slot.empIds.length >= 1) return // hard cap: max 1 M per day
    const sorted = sortedByNeed(date, /*excludeAtTarget=*/false)

    for (const emp of sorted) {
      if (slot.empIds.length >= 1) break
      if (
        !atTarget(emp.id) &&
        canWork(emp, date, 'M') &&
        isEligible(emp, mShift) &&
        !slot.empIds.includes(emp.id)
      ) {
        assign(emp, date, 'M')
      }
    }
  }

  // ── Generic fill for other shifts ────────────────────────────────────────

  function fillGenericShift(date: string, shift: SchedulerShiftType, idealCount: number) {
    const slot = daySlots.get(date)!.get(shift.code)!
    const sorted = sortedByNeed(date)
    let needed = idealCount - slot.empIds.length

    // Qualified first
    for (const emp of sorted) {
      if (needed <= 0) break
      if (
        getTier(emp.role) !== 'SRK' &&
        canWork(emp, date, shift.code) &&
        isEligible(emp, shift) &&
        !slot.empIds.includes(emp.id)
      ) {
        assign(emp, date, shift.code)
        needed--
      }
    }
    // SRK only if qualified present
    if (slot.hfCount + slot.fageCount > 0) {
      for (const emp of sorted) {
        if (needed <= 0) break
        if (
          getTier(emp.role) === 'SRK' &&
          canWork(emp, date, shift.code) &&
          isEligible(emp, shift) &&
          !slot.empIds.includes(emp.id)
        ) {
          assign(emp, date, shift.code)
          needed--
        }
      }
    }
  }

  // ── Main scheduling loop ──────────────────────────────────────────────────
  // Order: S first (preserves FAGE), then F, then F9 (MANDATORY), then M (last resort).

  for (const dayInfo of dates) {
    const { date } = dayInfo
    const dayType = dayInfo.dayType
    const rules = coverageIdx.get(dayType) ?? new Map()

    const sRule = rules.get('S')
    const fRule = rules.get('F')
    const mRule = rules.get('M')

    // S first — must reserve FAGE before F takes them
    if (sRule && sRule.idealStaff > 0) fillSShift(date)

    // F next — uses remaining qualified staff
    if (fRule && fRule.idealStaff > 0) fillFShift(date)
    else if (!fRule) fillFShift(date) // default: always schedule F if no rule exists

    // F9 MANDATORY — always run when F9 shift type exists, regardless of coverage rules
    if (f9Shift) fillF9Shift(date)

    // M — last resort only. Max 1 per day. Only fills if someone is still below
    // target after F/F9/S and there is a coverage rule or mShift exists.
    // fillMShift already enforces the hard cap and atTarget check internally.
    if (mShift) fillMShift(date)
  }

  // ── Second pass: MIN_SHIFT and MIN_WEEKENDS constraints ───────────────────

  for (const c of constraints) {
    if (c.type === 'MIN_SHIFT' && c.shiftCode && c.count !== undefined) {
      const emp = employees.find(e => e.id === c.employeeId)
      if (!emp) continue
      const currentCount = empShiftCodeCount.get(emp.id)?.get(c.shiftCode) ?? 0
      const needed = c.count - currentCount
      if (needed <= 0) continue
      const shift = workShifts.find(s => s.code === c.shiftCode)
      if (!shift) continue
      let added = 0
      for (const dayInfo of dates) {
        if (added >= needed) break
        const { date } = dayInfo
        if (!canWork(emp, date, shift.code) || !isEligible(emp, shift)) continue
        const slot = daySlots.get(date)?.get(shift.code)
        if (!slot) continue
        assign(emp, date, shift.code)
        added++
      }
    }

    if (c.type === 'MIN_WEEKENDS' && c.count !== undefined) {
      const emp = employees.find(e => e.id === c.employeeId)
      if (!emp) continue
      const currentWe = empWeekendCount.get(emp.id) ?? 0
      const needed = c.count - currentWe
      if (needed <= 0) continue
      let added = 0
      for (const dayInfo of dates) {
        if (added >= needed) break
        const { date } = dayInfo
        if (!isWeekend(date) || !canWork(emp, date)) continue
        for (const shift of workShifts) {
          if (!isEligible(emp, shift) || !canWork(emp, date, shift.code)) continue
          const slot = daySlots.get(date)?.get(shift.code)
          if (!slot) continue
          assign(emp, date, shift.code)
          added++
          break
        }
      }
    }
  }

  // ── Third pass: top-up employees below workload target ───────────────────
  // Tries F first, then S, then F9 — M is the absolute last resort.
  // Respects all existing slot caps and composition rules.

  const topUpOrder = [...employees].sort((a, b) => {
    const aExt = a.isExternal ? 1 : 0
    const bExt = b.isExternal ? 1 : 0
    if (aExt !== bExt) return aExt - bExt
    const aRatio = (empAssignedMinutes.get(a.id) ?? 0) / (targetMinutes.get(a.id) ?? 1)
    const bRatio = (empAssignedMinutes.get(b.id) ?? 0) / (targetMinutes.get(b.id) ?? 1)
    return aRatio - bRatio
  })

  for (const emp of topUpOrder) {
    const targetMin = targetMinutes.get(emp.id) ?? 0
    if ((empAssignedMinutes.get(emp.id) ?? 0) >= targetMin) continue

    const candidateShifts = workShifts.filter(s => ['F', 'S', 'F9', 'M'].includes(s.code))

    for (const dayInfo of dates) {
      if ((empAssignedMinutes.get(emp.id) ?? 0) >= targetMin) break
      const { date } = dayInfo
      if (!canWork(emp, date)) continue

      for (const shift of candidateShifts) {
        if ((empAssignedMinutes.get(emp.id) ?? 0) >= targetMin) break
        if (!isEligible(emp, shift)) continue
        if (!canWork(emp, date, shift.code)) continue

        if (shift.code === 'F') {
          const slot = daySlots.get(date)!.get('F')!
          if (getTier(emp.role) === 'SRK' && slot.hfCount + slot.fageCount === 0) continue
          if (slot.empIds.length >= F_MAX) continue
        }
        if (shift.code === 'S') {
          const slot = daySlots.get(date)!.get('S')!
          if (slot.empIds.length >= 2) continue
          if (getTier(emp.role) === 'FAGE' && slot.fageCount >= 1) continue
          if (getTier(emp.role) === 'SRK' && slot.srkCount >= 1) continue
        }
        if (shift.code === 'F9') {
          const fSlot = daySlots.get(date)!.get('F')
          if (fSlot?.empIds.includes(emp.id)) continue
          const f9Slot = daySlots.get(date)!.get('F9')!
          if (f9Slot.empIds.length >= 1) continue
        }
        if (shift.code === 'M') {
          const mSlot = daySlots.get(date)!.get('M')!
          if (mSlot.empIds.length >= 1) continue // hard cap: max 1 M per day
        }

        assign(emp, date, shift.code)
        break
      }
    }
  }

  return result
}
