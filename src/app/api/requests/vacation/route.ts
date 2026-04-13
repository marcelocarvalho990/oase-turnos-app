import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()

  if (session.role === 'MANAGER') {
    const requests = await prisma.absenceRequest.findMany({
      include: { employee: { select: { name: true, shortName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json(requests)
  }

  const requests = await prisma.absenceRequest.findMany({
    where: { employeeId: session.employeeId! },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(requests)
}

export async function POST(request: Request) {
  const session = await requireAuth('EMPLOYEE')
  const body = await request.json()
  const { startDate, endDate, notes } = body

  if (!startDate || !endDate) {
    return Response.json({ error: 'startDate e endDate são obrigatórios' }, { status: 400 })
  }

  const created = await prisma.absenceRequest.create({
    data: {
      employeeId: session.employeeId!,
      startDate,
      endDate,
      type: 'Ferien',
      isHardBlock: false,
      status: 'PENDING',
      notes: notes ?? null,
    },
  })
  return Response.json(created, { status: 201 })
}
