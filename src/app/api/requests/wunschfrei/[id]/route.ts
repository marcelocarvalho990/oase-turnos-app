import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  const { id } = await params

  const body = await request.json() as { status?: string; managerNote?: string }
  const { status, managerNote } = body

  const record = await prisma.wunschfreiRequest.findUnique({ where: { id } })
  if (!record) {
    return Response.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  if (session.role === 'MANAGER') {
    // Manager can approve or reject
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return Response.json({ error: 'Status inválido para manager (APPROVED ou REJECTED)' }, { status: 400 })
    }
    const updated = await prisma.wunschfreiRequest.update({
      where: { id },
      data: {
        status,
        managerNote: managerNote ?? null,
      },
    })
    return Response.json(updated)
  }

  // Employee: can only cancel their own PENDING requests
  if (record.employeeId !== session.employeeId) {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (record.status !== 'PENDING') {
    return Response.json({ error: 'Apenas pedidos pendentes podem ser cancelados' }, { status: 409 })
  }

  const updated = await prisma.wunschfreiRequest.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })
  return Response.json(updated)
}
