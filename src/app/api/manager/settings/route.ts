import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

const DEFAULT_TEAM = '2.OG'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const team = searchParams.get('team') ?? DEFAULT_TEAM

    let settings = await prisma.teamSettings.findUnique({ where: { team } })

    if (!settings) {
      settings = await prisma.teamSettings.create({
        data: { team, baseMonthlyHours: 160 },
      })
    }

    return Response.json(settings)
  } catch (error) {
    console.error('[GET /api/manager/settings]', error)
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const team = searchParams.get('team') ?? DEFAULT_TEAM
    const body = await request.json()

    const { baseMonthlyHours } = body

    const settings = await prisma.teamSettings.upsert({
      where: { team },
      create: {
        team,
        baseMonthlyHours: baseMonthlyHours !== undefined ? Number(baseMonthlyHours) : 160,
      },
      update: {
        ...(baseMonthlyHours !== undefined && { baseMonthlyHours: Number(baseMonthlyHours) }),
      },
    })

    return Response.json(settings)
  } catch (error) {
    console.error('[PATCH /api/manager/settings]', error)
    return Response.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
