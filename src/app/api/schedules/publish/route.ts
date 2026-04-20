import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function PATCH(request: NextRequest) {
  await requireAuth('MANAGER')
  try {
    const { scheduleId } = await request.json() as { scheduleId: string }

    if (!scheduleId) {
      return Response.json({ error: 'scheduleId is required' }, { status: 400 })
    }

    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })

    return Response.json({ ok: true, status: schedule.status })
  } catch (error) {
    console.error('[PATCH /api/schedules/publish]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to publish schedule' }, { status: 500 })
  }
}
