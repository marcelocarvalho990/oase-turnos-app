import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function PATCH(request: NextRequest) {
  await requireAuth('MANAGER')
  try {
    const body = await request.json()
    const { scheduleId, employeeId, date, shiftCode } = body

    if (!scheduleId || !employeeId || !date) {
      return Response.json(
        { error: 'scheduleId, employeeId, and date are required' },
        { status: 400 }
      )
    }

    if (!DATE_RE.test(date)) {
      return Response.json({ error: 'date format must be YYYY-MM-DD' }, { status: 400 })
    }

    // Empty shiftCode means delete the assignment
    if (shiftCode === '' || shiftCode === null || shiftCode === undefined) {
      await prisma.assignment.deleteMany({
        where: { scheduleId, employeeId, date },
      })
      return Response.json({ deleted: true })
    }

    // Upsert the assignment
    const assignment = await prisma.assignment.upsert({
      where: {
        scheduleId_employeeId_date: { scheduleId, employeeId, date },
      },
      create: {
        scheduleId,
        employeeId,
        date,
        shiftCode,
        origin: 'MANUAL',
      },
      update: {
        shiftCode,
        origin: 'MANUAL',
      },
    })

    return Response.json(assignment)
  } catch (error) {
    console.error('[PATCH /api/schedules/assignments]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to upsert assignment' }, { status: 500 })
  }
}
