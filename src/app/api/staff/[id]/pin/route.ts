import { prisma } from '@/lib/prisma'
import { requireAuth, hashPin, generatePin } from '@/lib/auth'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth('MANAGER')
  const { id } = await params

  const pin = generatePin()
  const hashed = hashPin(pin)

  await prisma.userPin.upsert({
    where: { employeeId: id },
    update: { pin: hashed },
    create: { employeeId: id, pin: hashed },
  })

  return Response.json({ pin }) // plain PIN shown once
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth('MANAGER')
  const { id } = await params

  const record = await prisma.userPin.findUnique({ where: { employeeId: id } })
  return Response.json({ hasPin: !!record })
}
