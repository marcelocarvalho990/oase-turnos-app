import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await requireAuth('EMPLOYEE')
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  // Date range for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate().toString().padStart(2, '0')}`

  const assignments = await prisma.assignment.findMany({
    where: {
      employeeId: session.employeeId!,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      shiftType: { select: { id: true, name: true, code: true, color: true, startTime1: true, endTime1: true } },
    },
    orderBy: { date: 'asc' },
  })

  return Response.json(assignments.map(a => ({
    date: a.date,
    shiftType: a.shiftType ?? null,
  })))
}
