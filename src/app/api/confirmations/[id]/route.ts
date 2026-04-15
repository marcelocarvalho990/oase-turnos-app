import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth('MANAGER')
  const { id } = await params
  const body = await request.json() as { status: string; managerNote?: string }
  const { status, managerNote } = body

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return Response.json({ error: 'status deve ser APPROVED ou REJECTED' }, { status: 400 })
  }

  const row = await prisma.shiftConfirmation.findUnique({ where: { id } })
  if (!row) return Response.json({ error: 'Confirmação não encontrada' }, { status: 404 })

  const updated = await prisma.shiftConfirmation.update({
    where: { id },
    data: { status, managerNote: managerNote ?? null, updatedAt: new Date() },
    include: { employee: { select: { name: true, shortName: true } } },
  })

  return Response.json(updated)
}
