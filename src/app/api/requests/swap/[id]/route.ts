import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const { id } = await params
  const body = await request.json()
  const { status, managerNote } = body

  const swap = await prisma.shiftSwapRequest.findUnique({ where: { id } })
  if (!swap) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 })

  if (session.role === 'MANAGER') {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return Response.json({ error: 'status inválido para gestor' }, { status: 400 })
    }
    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: { status, managerNote: managerNote ?? null },
    })
    return Response.json(updated)
  }

  // Employee can only cancel their own requests
  if (session.role === 'EMPLOYEE') {
    if (swap.requesterId !== session.employeeId) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 })
    }
    if (status !== 'CANCELLED') {
      return Response.json({ error: 'Colaboradores só podem cancelar pedidos' }, { status: 400 })
    }
    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    return Response.json(updated)
  }

  return Response.json({ error: 'Sem permissão' }, { status: 403 })
}
