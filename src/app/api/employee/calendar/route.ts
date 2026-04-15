import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await requireAuth('EMPLOYEE')
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId! },
    select: { team: true, workPercentage: true },
  })

  if (!employee) {
    return Response.json({ assignments: [], absences: [], published: false, hours: null })
  }

  // Month date range
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const schedule = await prisma.schedule.findUnique({
    where: { year_month_team: { year, month, team: employee.team } },
    select: { id: true, status: true },
  })

  // Always return APPROVED absence requests so they show in the calendar
  const absenceRequests = await prisma.absenceRequest.findMany({
    where: {
      employeeId: session.employeeId!,
      status: 'APPROVED',
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    select: { startDate: true, endDate: true, type: true },
  })

  // Expand date ranges into individual dates within this month
  const absenceDates: { date: string; type: string }[] = []
  for (const abs of absenceRequests) {
    const start = new Date(abs.startDate + 'T00:00:00')
    const end = new Date(abs.endDate + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      if (dateStr >= monthStart && dateStr <= monthEnd) {
        absenceDates.push({ date: dateStr, type: abs.type })
      }
    }
  }

  if (!schedule || schedule.status !== 'PUBLISHED') {
    return Response.json({ assignments: [], absences: absenceDates, published: false, hours: null })
  }

  const assignments = await prisma.assignment.findMany({
    where: { scheduleId: schedule.id, employeeId: session.employeeId! },
    include: {
      shiftType: {
        select: { id: true, name: true, code: true, color: true, startTime1: true, endTime1: true, durationMinutes: true, isAbsence: true },
      },
    },
    orderBy: { date: 'asc' },
  })

  // Compute worked minutes (non-absence shifts only)
  const teamSettings = await prisma.teamSettings.findFirst({ where: { team: employee.team } })
  const baseMonthlyHours = teamSettings?.baseMonthlyHours ?? 160
  const targetMinutes = Math.round(baseMonthlyHours * (employee.workPercentage / 100) * 60)

  let workedMinutes = 0
  for (const a of assignments) {
    if (a.shiftType && !a.shiftType.isAbsence) {
      workedMinutes += a.shiftType.durationMinutes
    }
  }

  return Response.json({
    published: true,
    absences: absenceDates,
    assignments: assignments.map(a => ({
      date: a.date,
      shiftType: a.shiftType
        ? { id: a.shiftType.id, name: a.shiftType.name, code: a.shiftType.code, color: a.shiftType.color, startTime1: a.shiftType.startTime1, endTime1: a.shiftType.endTime1 }
        : null,
    })),
    hours: { workedMinutes, targetMinutes, workPercentage: employee.workPercentage },
  })
}
