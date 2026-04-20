import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function DELETE(request: NextRequest) {
  await requireAuth('MANAGER')
  try {
    const { searchParams } = request.nextUrl
    const scheduleId = searchParams.get('scheduleId')

    if (!scheduleId) {
      return Response.json({ error: 'scheduleId is required' }, { status: 400 })
    }

    await prisma.assignment.deleteMany({
      where: { scheduleId, origin: 'AUTO' },
    })

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'DRAFT', generatedAt: null },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/schedules/clear]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to clear schedule' }, { status: 500 })
  }
}
