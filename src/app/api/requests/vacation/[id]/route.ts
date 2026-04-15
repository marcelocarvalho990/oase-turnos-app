import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const { id } = await params
  const body = await request.json()
  const { status, managerNote } = body

  if (session.role === 'MANAGER') {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return Response.json({ error: 'status deve ser APPROVED ou REJECTED' }, { status: 400 })
    }
    const updated = await prisma.absenceRequest.update({
      where: { id },
      data: { status, managerNote: managerNote ?? null },
    })
    return Response.json(updated)
  }

  // Employee can only cancel their own requests
  if (session.role === 'EMPLOYEE') {
    const req = await prisma.absenceRequest.findUnique({ where: { id } })
    if (!req) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (req.employeeId !== session.employeeId) {
      return Response.json({ error: 'Sem permissão' }, { status: 403 })
    }
    if (status !== 'CANCELLED') {
      return Response.json({ error: 'Colaboradores só podem cancelar pedidos' }, { status: 400 })
    }
    const updated = await prisma.absenceRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
    return Response.json(updated)
  }

  return Response.json({ error: 'Sem permissão' }, { status: 403 })
}


export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (session.role !== 'MANAGER') {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const { id } = await params
  const existing = await prisma.absenceRequest.findUnique({ where: { id } })
  if (!existing) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 })
  await prisma.absenceRequest.delete({ where: { id } })
  return Response.json({ ok: true })
}
