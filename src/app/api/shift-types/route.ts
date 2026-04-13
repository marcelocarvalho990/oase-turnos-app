import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

export async function GET() {
  try {
    const shiftTypes = await prisma.shiftType.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return Response.json(shiftTypes)
  } catch (error) {
    console.error('[GET /api/shift-types]', error)
    return Response.json({ error: 'Failed to fetch shift types' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      code,
      name,
      description,
      startTime1,
      endTime1,
      startTime2,
      endTime2,
      durationMinutes,
      color,
      bgColor,
      textColor,
      borderColor,
      isAbsence,
      isWorkTime,
      sortOrder,
      eligibleRoles,
    } = body

    if (!code || !name || !startTime1 || !endTime1 || !color || !bgColor || !textColor || !borderColor) {
      return Response.json(
        { error: 'code, name, startTime1, endTime1, color, bgColor, textColor, and borderColor are required' },
        { status: 400 }
      )
    }

    const shiftType = await prisma.shiftType.create({
      data: {
        code,
        name,
        description: description ?? null,
        startTime1,
        endTime1,
        startTime2: startTime2 ?? null,
        endTime2: endTime2 ?? null,
        durationMinutes: Number(durationMinutes ?? 0),
        color,
        bgColor,
        textColor,
        borderColor,
        isAbsence: Boolean(isAbsence ?? false),
        isWorkTime: Boolean(isWorkTime ?? true),
        sortOrder: Number(sortOrder ?? 0),
        eligibleRoles: eligibleRoles ?? '[]',
      },
    })

    return Response.json(shiftType, { status: 201 })
  } catch (error) {
    console.error('[POST /api/shift-types]', error)
    return Response.json({ error: 'Failed to create shift type' }, { status: 500 })
  }
}
