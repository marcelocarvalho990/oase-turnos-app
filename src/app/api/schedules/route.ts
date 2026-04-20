import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

function validYearMonth(year: number, month: number): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= 2100 &&
    Number.isInteger(month) && month >= 1 && month <= 12
}

export async function GET(request: NextRequest) {
  await requireAuth('MANAGER')
  try {
    const { searchParams } = request.nextUrl
    const year = Number(searchParams.get('year'))
    const month = Number(searchParams.get('month'))
    const team = searchParams.get('team')

    if (!year || !month || !team || !validYearMonth(year, month)) {
      return Response.json(
        { error: 'year, month, and team query params are required' },
        { status: 400 }
      )
    }

    // Get or create the schedule for this month/team
    let schedule = await prisma.schedule.findUnique({
      where: { year_month_team: { year, month, team } },
    })

    if (!schedule) {
      schedule = await prisma.schedule.create({
        data: { year, month, team },
      })
    }

    // Fetch all related data in parallel
    const [employees, assignments, shiftTypes, coverageRules] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true, team },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      prisma.assignment.findMany({
        where: { scheduleId: schedule.id },
        orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
      }),
      prisma.shiftType.findMany({
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.coverageRule.findMany({
        where: { team },
      }),
    ])

    return Response.json({ schedule, employees, assignments, shiftTypes, coverageRules })
  } catch (error) {
    console.error('[GET /api/schedules]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  await requireAuth('MANAGER')
  try {
    const body = await request.json()
    const { year, month, team } = body

    if (!year || !month || !team || !validYearMonth(Number(year), Number(month))) {
      return Response.json(
        { error: 'year, month, and team are required' },
        { status: 400 }
      )
    }

    const schedule = await prisma.schedule.create({
      data: {
        year: Number(year),
        month: Number(month),
        team,
      },
    })

    return Response.json(schedule, { status: 201 })
  } catch (error) {
    console.error('[POST /api/schedules]', error instanceof Error ? error.message : 'unknown')
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return Response.json(
        { error: 'A schedule for this year/month/team already exists' },
        { status: 409 }
      )
    }
    return Response.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}
