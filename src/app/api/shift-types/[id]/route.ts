import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      startTime1,
      endTime1,
      durationMinutes,
      breakTime,
    } = body

    if (!name || !startTime1 || !endTime1) {
      return Response.json(
        { error: 'name, startTime1, and endTime1 are required' },
        { status: 400 }
      )
    }

    const shiftType = await prisma.shiftType.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        startTime1,
        endTime1,
        startTime2: null,
        endTime2: null,
        durationMinutes: Number(durationMinutes),
        breakTime: breakTime ?? null,
      },
    })

    return Response.json(shiftType)
  } catch (error) {
    console.error('[PUT /api/shift-types/[id]]', error)
    return Response.json({ error: 'Failed to update shift type' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.shiftType.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[DELETE /api/shift-types/[id]]', error)
    return Response.json({ error: 'Failed to delete shift type' }, { status: 500 })
  }
}
