import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

// DELETE /api/schedules/clear?scheduleId=xxx
// Deletes all AUTO assignments and resets schedule status to DRAFT
export async function DELETE(request: NextRequest) {
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
    console.error('[DELETE /api/schedules/clear]', error)
    return Response.json({ error: 'Failed to clear schedule' }, { status: 500 })
  }
}
