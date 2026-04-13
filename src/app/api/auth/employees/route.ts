import { prisma } from '@/lib/prisma'

// Public endpoint — used by login form to list employees
export async function GET() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, shortName: true, team: true },
    orderBy: { name: 'asc' },
  })
  return Response.json(employees)
}
