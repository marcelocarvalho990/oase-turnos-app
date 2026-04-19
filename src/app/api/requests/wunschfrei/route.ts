import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await requireAuth()

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined

  const where: Record<string, unknown> = { employeeId: session.employeeId! }
  if (year !== undefined) where.year = year
  if (month !== undefined) where.month = month

  const requests = await prisma.wunschfreiRequest.findMany({
    where,
    orderBy: { date: 'asc' },
  })

  return Response.json(requests)
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()

  if (!session.employeeId) {
    return Response.json({ error: 'Apenas colaboradores podem criar pedidos Wunschfrei' }, { status: 403 })
  }

  const body = await request.json() as { date?: string; year?: number; month?: number }
  const { date, year, month } = body

  if (!date || !year || !month) {
    return Response.json({ error: 'date, year e month são obrigatórios' }, { status: 400 })
  }

  // Check for duplicate
  const existing = await prisma.wunschfreiRequest.findUnique({
    where: { employeeId_date: { employeeId: session.employeeId, date } },
  })
  if (existing) {
    return Response.json({ error: 'Já existe um pedido para esta data' }, { status: 409 })
  }

  // Count active (PENDING + APPROVED) for this month
  const activeCount = await prisma.wunschfreiRequest.count({
    where: {
      employeeId: session.employeeId,
      year,
      month,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  })

  if (activeCount >= 4) {
    return Response.json({ error: 'Limite de 4 dias Wunschfrei por mês atingido' }, { status: 422 })
  }

  const created = await prisma.wunschfreiRequest.create({
    data: {
      employeeId: session.employeeId,
      year,
      month,
      date,
      status: 'PENDING',
    },
  })

  return Response.json(created, { status: 201 })
}
