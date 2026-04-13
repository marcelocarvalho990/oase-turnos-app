import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
    return Response.json(employees)
  } catch (error) {
    console.error('[GET /api/staff]', error)
    return Response.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, shortName, workPercentage, team, role, canCoverOtherTeams } = body

    if (!name || !shortName || !role) {
      return Response.json(
        { error: 'name, shortName, and role are required' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        shortName,
        workPercentage: Number(workPercentage ?? 100),
        team: team ?? '2.OG',
        role,
        canCoverOtherTeams: Boolean(canCoverOtherTeams ?? false),
      },
    })

    return Response.json(employee, { status: 201 })
  } catch (error) {
    console.error('[POST /api/staff]', error)
    return Response.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
