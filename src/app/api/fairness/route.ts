import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const dow = date.getDay()
  return dow === 0 || dow === 6
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const date = new Date(d.valueOf())
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((date.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7)
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

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
  await requireAuth('MANAGER')
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

    const schedule = await prisma.schedule.findUnique({
      where: { year_month_team: { year, month, team } },
    })

    if (!schedule) {
      return Response.json(
        { error: 'Schedule not found for this year/month/team' },
        { status: 404 }
      )
    }

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
    const shiftTypeMap = new Map(shiftTypes.map((st) => [st.code, st]))

    const metrics: FairnessMetric[] = employees.map((employee) => {
      const empAssignments = assignments.filter((a) => a.employeeId === employee.id)

      const weekendShiftDates: string[] = []
      let hardShiftsCount = 0
      let totalShifts = 0
      let workedMinutes = 0

      for (const assignment of empAssignments) {
        const shiftType = shiftTypeMap.get(assignment.shiftCode)

        if (shiftType && shiftType.isAbsence) {
          continue
        }

        totalShifts++

        if (shiftType) {
          workedMinutes += shiftType.durationMinutes - 36
        }

        if (isWeekend(assignment.date)) {
          weekendShiftDates.push(assignment.date)
        }

        if (assignment.shiftCode === 'S' || assignment.shiftCode === 'G') {
          hardShiftsCount++
        }
      }

      const weekendsWorked = countWeekendPairs(weekendShiftDates)
      const workedHours = workedMinutes / 60
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
    console.error('[GET /api/fairness]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to compute fairness metrics' }, { status: 500 })
  }
}
