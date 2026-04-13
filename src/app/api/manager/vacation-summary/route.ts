import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { computeSummary } from '@/lib/vacationUtils'

export async function GET(request: Request) {
  await requireAuth('MANAGER')
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, shortName: true, workPercentage: true },
    orderBy: { name: 'asc' },
  })

  const allRequests = await prisma.absenceRequest.findMany({
    where: { type: 'Ferien' },
    select: { employeeId: true, startDate: true, endDate: true, status: true },
  })

  const result = employees.map(emp => {
    const empRequests = allRequests.filter(r => r.employeeId === emp.id)
    const summary = computeSummary(emp.workPercentage, empRequests, year)
    return {
      id: emp.id,
      name: emp.name,
      shortName: emp.shortName,
      workPercentage: emp.workPercentage,
      ...summary,
    }
  })

  return Response.json(result)
}
