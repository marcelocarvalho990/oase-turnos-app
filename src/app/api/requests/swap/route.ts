import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const session = await requireAuth()

  if (session.role === 'MANAGER') {
    const swaps = await prisma.shiftSwapRequest.findMany({
      include: {
        requester: { select: { name: true, shortName: true } },
        targetEmployee: { select: { name: true, shortName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json(swaps)
  }

  const swaps = await prisma.shiftSwapRequest.findMany({
    where: {
      OR: [
        { requesterId: session.employeeId! },
        { targetEmployeeId: session.employeeId! },
      ],
    },
    include: {
      requester: { select: { name: true, shortName: true } },
      targetEmployee: { select: { name: true, shortName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json(swaps)
}

export async function POST(request: Request) {
  const session = await requireAuth('EMPLOYEE')
  const body = await request.json()
  const { targetEmployeeId, requesterDate, targetDate, requesterMessage } = body

  if (!targetEmployeeId || !requesterDate || !targetDate) {
    return Response.json({ error: 'Campos obrigatórios em falta' }, { status: 400 })
  }

  if (targetEmployeeId === session.employeeId) {
    return Response.json({ error: 'Não podes trocar turno contigo mesmo' }, { status: 400 })
  }

  const created = await prisma.shiftSwapRequest.create({
    data: {
      requesterId: session.employeeId!,
      targetEmployeeId,
      requesterDate,
      targetDate,
      status: 'PENDING',
      requesterMessage: requesterMessage ?? null,
    },
  })
  return Response.json(created, { status: 201 })
}
