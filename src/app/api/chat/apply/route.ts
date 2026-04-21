import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

interface Action {
  type: 'UPSERT' | 'REMOVE'
  scheduleId: string
  employeeId: string
  date: string
  shiftCode: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: NextRequest) {
  await requireAuth('MANAGER')
  try {
    const body = await request.json() as { actions: Action[] }
    const { actions } = body

    if (!Array.isArray(actions) || actions.length === 0) {
      return Response.json({ error: 'actions array is required' }, { status: 400 })
    }

    let applied = 0

    for (const action of actions) {
      const { type, scheduleId, employeeId, date, shiftCode } = action

      if (!scheduleId?.trim() || !employeeId?.trim() || !date || !DATE_RE.test(date)) continue

      if (type === 'UPSERT') {
        if (!shiftCode) continue
        await prisma.assignment.upsert({
          where: { scheduleId_employeeId_date: { scheduleId, employeeId, date } },
          create: { scheduleId, employeeId, date, shiftCode, origin: 'MANUAL' },
          update: { shiftCode, origin: 'MANUAL' },
        })
        applied++
      } else if (type === 'REMOVE') {
        await prisma.assignment.deleteMany({
          where: { scheduleId, employeeId, date },
        })
        applied++
      }
    }

    return Response.json({ ok: true, applied })
  } catch (error) {
    console.error('[POST /api/chat/apply]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
