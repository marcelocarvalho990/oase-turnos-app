import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { computeSummary } from '@/lib/vacationUtils'

export async function GET(request: Request) {
  const session = await requireAuth('EMPLOYEE')
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId! },
    select: { workPercentage: true },
  })
  if (!employee) return Response.json({ error: 'Not found' }, { status: 404 })

  const requests = await prisma.absenceRequest.findMany({
    where: { employeeId: session.employeeId!, type: 'Ferien' },
    select: { startDate: true, endDate: true, status: true },
  })

  const summary = computeSummary(employee.workPercentage, requests, year)
  return Response.json(summary)
}
