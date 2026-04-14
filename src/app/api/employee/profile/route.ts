import { prisma } from '@/lib/prisma'
import { getSession, createSession } from '@/lib/session'
import { hashPin } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE' || !session.employeeId) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      id: true,
      name: true,
      shortName: true,
      role: true,
      workPercentage: true,
      team: true,
      canCoverOtherTeams: true,
    },
  })

  if (!employee) {
    return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 })
  }

  return Response.json(employee)
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'EMPLOYEE' || !session.employeeId) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { currentPin, newPin } = body

  if (!currentPin || !newPin) {
    return Response.json({ error: 'PIN atual e novo PIN são obrigatórios' }, { status: 400 })
  }

  if (!/^\d{4,6}$/.test(newPin)) {
    return Response.json({ error: 'O novo PIN deve ter 4 a 6 dígitos' }, { status: 400 })
  }

  // Verify current PIN
  const record = await prisma.userPin.findUnique({
    where: { employeeId: session.employeeId },
  })

  if (!record || hashPin(currentPin) !== record.pin) {
    return Response.json({ error: 'PIN atual incorreto' }, { status: 403 })
  }

  // Update PIN
  await prisma.userPin.update({
    where: { employeeId: session.employeeId },
    data: { pin: hashPin(newPin) },
  })

  // Refresh session (name may not change but keeps session valid)
  await createSession(session)

  return Response.json({ success: true })
}
