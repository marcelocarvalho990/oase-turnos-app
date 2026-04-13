/**
 * Count working days (Mon–Sat) between two date strings inclusive.
 * Swiss convention: 6-day working week, vacations counted in working days.
 * Adjust to 5-day (Mon–Fri) if preferred.
 */
export function countWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  if (end < start) return 0

  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay() // 0=Sun, 6=Sat
    if (dow !== 0) count++ // Mon–Sat count, only Sunday excluded
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/**
 * Annual vacation entitlement in working days based on work percentage.
 * Full-time (100%) = 25 days. Proportional for part-time.
 */
export function annualEntitlement(workPercentage: number): number {
  return Math.round((workPercentage / 100) * 25)
}

export interface VacationSummary {
  entitlement: number
  approved: number   // days with APPROVED status in current year
  pending: number    // days with PENDING status in current year
  remaining: number  // entitlement - approved
}

export function computeSummary(
  workPercentage: number,
  requests: { startDate: string; endDate: string; status: string }[],
  year: number,
): VacationSummary {
  const entitled = annualEntitlement(workPercentage)

  let approved = 0
  let pending = 0

  for (const req of requests) {
    // Only count requests that overlap with the given year
    const reqYear = new Date(req.startDate + 'T00:00:00').getFullYear()
    if (reqYear !== year) continue
    if (req.status === 'APPROVED') approved += countWorkingDays(req.startDate, req.endDate)
    if (req.status === 'PENDING') pending += countWorkingDays(req.startDate, req.endDate)
  }

  return {
    entitlement: entitled,
    approved,
    pending,
    remaining: Math.max(0, entitled - approved),
  }
}
