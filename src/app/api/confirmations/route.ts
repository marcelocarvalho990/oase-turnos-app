import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  const { searchParams } = new URL(request.url)
  const scheduleId = searchParams.get('scheduleId')

  if (session.role === 'MANAGER') {
    const rows = await prisma.shiftConfirmation.findMany({
      where: scheduleId ? { scheduleId } : {},
      include: { employee: { select: { name: true, shortName: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })
    return Response.json(rows)
  }

  // Employee: only own confirmations
  const rows = await prisma.shiftConfirmation.findMany({
    where: { employeeId: session.employeeId! },
    orderBy: { date: 'desc' },
  })
  return Response.json(rows)
}

export async function POST(request: NextRequest) {
  const session = await requireAuth('EMPLOYEE')
  const body = await request.json() as {
    date: string
    shiftCode: string
    type: string
    actualEnd?: string
    reason?: string
  }

  const { date, shiftCode, type, actualEnd, reason } = body

  if (!date || !shiftCode || !type) {
    return Response.json({ error: 'date, shiftCode e type são obrigatórios' }, { status: 400 })
  }

  if (!['WORKED', 'EARLY_DEPARTURE', 'ABSENT'].includes(type)) {
    return Response.json({ error: 'type inválido' }, { status: 400 })
  }

  const d = new Date(date + 'T00:00:00')
  const employee = await prisma.employee.findUnique({ where: { id: session.employeeId! } })
  if (!employee) return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 })

  const schedule = await prisma.schedule.findUnique({
    where: { year_month_team: { year: d.getFullYear(), month: d.getMonth() + 1, team: employee.team } },
  })
  if (!schedule) return Response.json({ error: 'Escala não encontrada para este mês' }, { status: 404 })

  const existing = await prisma.shiftConfirmation.findUnique({
    where: { employeeId_date: { employeeId: session.employeeId!, date } },
  })

  const data = {
    employeeId: session.employeeId!,
    scheduleId: schedule.id,
    date,
    shiftCode,
    type,
    actualEnd: actualEnd ?? null,
    reason: reason ?? null,
    status: 'CONFIRMED',
    managerNote: null,
    updatedAt: new Date(),
  }

  let row
  if (existing) {
    row = await prisma.shiftConfirmation.update({ where: { id: existing.id }, data })
  } else {
    row = await prisma.shiftConfirmation.create({ data: { ...data, id: undefined } })
  }

  return Response.json(row, { status: existing ? 200 : 201 })
}
