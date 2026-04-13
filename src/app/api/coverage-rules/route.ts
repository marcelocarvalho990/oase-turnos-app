import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const team = searchParams.get('team')

    const rules = await prisma.coverageRule.findMany({
      where: team ? { team } : undefined,
      orderBy: [{ team: 'asc' }, { shiftCode: 'asc' }, { dayType: 'asc' }],
    })

    return Response.json(rules)
  } catch (error) {
    console.error('[GET /api/coverage-rules]', error)
    return Response.json({ error: 'Failed to fetch coverage rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { team, shiftCode, dayType, minStaff, idealStaff } = body

    if (!team || !shiftCode || !dayType) {
      return Response.json(
        { error: 'team, shiftCode, and dayType are required' },
        { status: 400 }
      )
    }

    // Upsert by the unique composite key (team + shiftCode + dayType)
    const rule = await prisma.coverageRule.upsert({
      where: {
        team_shiftCode_dayType: { team, shiftCode, dayType },
      },
      create: {
        team,
        shiftCode,
        dayType,
        minStaff: Number(minStaff ?? 0),
        idealStaff: Number(idealStaff ?? 0),
      },
      update: {
        minStaff: Number(minStaff ?? 0),
        idealStaff: Number(idealStaff ?? 0),
      },
    })

    return Response.json(rule)
  } catch (error) {
    console.error('[POST /api/coverage-rules]', error)
    return Response.json({ error: 'Failed to create/update coverage rule' }, { status: 500 })
  }
}
