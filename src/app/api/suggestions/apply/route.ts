import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

interface AddSuggestion {
  type: 'ADD'
  employeeId: string
  date: string
  shiftCode: string
}

interface SwapSuggestion {
  type: 'SWAP'
  fromEmployeeId: string
  fromDate: string
  fromShiftCode: string
  toEmployeeId: string
  toDate: string
  toShiftCode: string
}

type Suggestion = AddSuggestion | SwapSuggestion

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session.role !== 'MANAGER') {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { suggestion, scheduleId } = (await request.json()) as { suggestion: Suggestion; scheduleId: string }

  if (!suggestion || !scheduleId) {
    return Response.json({ error: 'Parâmetros em falta' }, { status: 400 })
  }

  if (suggestion.type === 'ADD') {
    const existing = await prisma.assignment.findFirst({
      where: { scheduleId, employeeId: suggestion.employeeId, date: suggestion.date },
    })
    if (existing) {
      return Response.json({ error: 'Colaborador já tem turno nesse dia' }, { status: 409 })
    }
    await prisma.assignment.create({
      data: {
        scheduleId,
        employeeId: suggestion.employeeId,
        date: suggestion.date,
        shiftCode: suggestion.shiftCode,
        origin: 'MANUAL',
      },
    })
    return Response.json({ ok: true })
  }

  if (suggestion.type === 'SWAP') {
    const fromAssignment = await prisma.assignment.findFirst({
      where: { scheduleId, employeeId: suggestion.fromEmployeeId, date: suggestion.fromDate },
    })
    if (!fromAssignment) {
      return Response.json({ error: 'Turno original não encontrado (pode já ter sido alterado)' }, { status: 404 })
    }

    const toExisting = await prisma.assignment.findFirst({
      where: { scheduleId, employeeId: suggestion.toEmployeeId, date: suggestion.toDate },
    })

    if (toExisting) {
      // True bidirectional swap: exchange the two employees on their respective shifts
      await prisma.$transaction([
        prisma.assignment.update({
          where: { id: fromAssignment.id },
          data: { employeeId: suggestion.toEmployeeId, shiftCode: suggestion.toShiftCode, origin: 'MANUAL' },
        }),
        prisma.assignment.update({
          where: { id: toExisting.id },
          data: { employeeId: suggestion.fromEmployeeId, shiftCode: suggestion.fromShiftCode, origin: 'MANUAL' },
        }),
      ])
    } else {
      // Simple reassignment: remove from A, give to B
      await prisma.$transaction([
        prisma.assignment.delete({ where: { id: fromAssignment.id } }),
        prisma.assignment.create({
          data: {
            scheduleId,
            employeeId: suggestion.toEmployeeId,
            date: suggestion.toDate,
            shiftCode: suggestion.toShiftCode,
            origin: 'MANUAL',
          },
        }),
      ])
    }
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Tipo de sugestão inválido' }, { status: 400 })
}
