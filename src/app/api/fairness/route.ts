import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const dow = date.getDay()
  return dow === 0 || dow === 6
}

/**
 * Returns the ISO week number for a given date string.
 * ISO week: Monday is first day. A week belongs to the year containing its Thursday.
 */
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  // Copy date so don't modify original
  const date = new Date(d.valueOf())
  // ISO week: set to nearest Thursday
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  // Get first day of year
  const yearStart = new Date(date.getFullYear(), 0, 1)
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((date.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7)
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Count the number of calendar week-pairs in which the employee worked at least
 * one weekend shift (Saturday OR Sunday). This is what "fins de semana" means.
 */
function countWeekendPairs(weekendDates: string[]): number {
  const weekKeys = new Set<string>()
  for (const dateStr of weekendDates) {
    weekKeys.add(isoWeekKey(dateStr))
  }
  return weekKeys.size
}

interface FairnessMetric {
  employeeId: string
  employeeName: string
  workPercentage: number
  targetHours: number
  workedHours: number
  weekendsWorked: number
  hardShiftsCount: number
  totalShifts: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const year = Number(searchParams.get('year'))
    const month = Number(searchParams.get('month'))
    const team = searchParams.get('team')

    if (!year || !month || !team) {
      return Response.json(
        { error: 'year, month, and team query params are required' },
        { status: 400 }
      )
    }

    // Find the schedule
    const schedule = await prisma.schedule.findUnique({
      where: { year_month_team: { year, month, team } },
    })

    if (!schedule) {
      return Response.json(
        { error: 'Schedule not found for this year/month/team' },
        { status: 404 }
      )
    }

    // Load employees, assignments, shiftTypes, and team settings
    const [employees, assignments, shiftTypes, teamSettings] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true, team },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      prisma.assignment.findMany({
        where: { scheduleId: schedule.id },
      }),
      prisma.shiftType.findMany(),
      prisma.teamSettings.findFirst({ where: { team } }),
    ])

    const baseMonthlyHours = teamSettings?.baseMonthlyHours ?? 160

    // Build a lookup map for shift types
    const shiftTypeMap = new Map(shiftTypes.map((st) => [st.code, st]))

    const metrics: FairnessMetric[] = employees.map((employee) => {
      const empAssignments = assignments.filter((a) => a.employeeId === employee.id)

      const weekendShiftDates: string[] = []
      let hardShiftsCount = 0
      let totalShifts = 0
      let workedMinutes = 0

      for (const assignment of empAssignments) {
        const shiftType = shiftTypeMap.get(assignment.shiftCode)

        // Skip absence shifts for totalShifts and workedHours
        if (shiftType && shiftType.isAbsence) {
          continue
        }

        totalShifts++

        if (shiftType) {
          workedMinutes += shiftType.durationMinutes
        }

        if (isWeekend(assignment.date)) {
          weekendShiftDates.push(assignment.date)
        }

        if (assignment.shiftCode === 'S' || assignment.shiftCode === 'G') {
          hardShiftsCount++
        }
      }

      // Count weekend PAIRS (ISO weeks where at least 1 weekend day was worked)
      const weekendsWorked = countWeekendPairs(weekendShiftDates)

      const workedHours = workedMinutes / 60
      // targetHours uses global baseMonthlyHours (default 160h = 100%)
      const targetHours = (employee.workPercentage / 100) * baseMonthlyHours

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        workPercentage: employee.workPercentage,
        targetHours: Math.round(targetHours * 100) / 100,
        workedHours: Math.round(workedHours * 100) / 100,
        weekendsWorked,
        hardShiftsCount,
        totalShifts,
      }
    })

    return Response.json(metrics)
  } catch (error) {
    console.error('[GET /api/fairness]', error)
    return Response.json({ error: 'Failed to compute fairness metrics' }, { status: 500 })
  }
}
