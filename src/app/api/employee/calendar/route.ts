import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await requireAuth('EMPLOYEE')
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  // Find the published schedule for this month/team
  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId! },
    select: { team: true },
  })

  if (!employee) {
    return Response.json([], { status: 200 })
  }

  const schedule = await prisma.schedule.findUnique({
    where: { year_month_team: { year, month, team: employee.team } },
    select: { id: true, status: true },
  })

  // Only return assignments if the schedule is published
  if (!schedule || schedule.status !== 'PUBLISHED') {
    return Response.json({ assignments: [], published: false })
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      scheduleId: schedule.id,
      employeeId: session.employeeId!,
    },
    include: {
      shiftType: {
        select: { id: true, name: true, code: true, color: true, startTime1: true, endTime1: true },
      },
    },
    orderBy: { date: 'asc' },
  })

  return Response.json({
    published: true,
    assignments: assignments.map(a => ({
      date: a.date,
      shiftType: a.shiftType ?? null,
    })),
  })
}
