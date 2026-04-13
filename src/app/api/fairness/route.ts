import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

function getWorkingDays(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const dow = date.getDay()
  return dow === 0 || dow === 6
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

    // Load employees and assignments with shiftType info
    const [employees, assignments, shiftTypes] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true, team },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      prisma.assignment.findMany({
        where: { scheduleId: schedule.id },
      }),
      prisma.shiftType.findMany(),
    ])

    // Build a lookup map for shift types
    const shiftTypeMap = new Map(shiftTypes.map((st) => [st.code, st]))

    const workingDays = getWorkingDays(year, month)

    const metrics: FairnessMetric[] = employees.map((employee) => {
      const empAssignments = assignments.filter((a) => a.employeeId === employee.id)

      let weekendsWorked = 0
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
          weekendsWorked++
        }

        if (assignment.shiftCode === 'S' || assignment.shiftCode === 'G') {
          hardShiftsCount++
        }
      }

      const workedHours = workedMinutes / 60
      const targetHours = (employee.workPercentage / 100) * workingDays * 8.4

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
