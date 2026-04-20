import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth('MANAGER')
  try {
    const { id } = await params
    const employee = await prisma.employee.findUnique({ where: { id } })

    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 })
    }

    return Response.json(employee)
  } catch (error) {
    console.error('[GET /api/staff/[id]]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth('MANAGER')
  try {
    const { id } = await params
    const body = await request.json()

    const { name, shortName, workPercentage, team, role, canCoverOtherTeams, isActive, vacationDays } = body

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(shortName !== undefined && { shortName }),
        ...(workPercentage !== undefined && { workPercentage: Number(workPercentage) }),
        ...(team !== undefined && { team }),
        ...(role !== undefined && { role }),
        ...(canCoverOtherTeams !== undefined && { canCoverOtherTeams: Boolean(canCoverOtherTeams) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(vacationDays !== undefined && { vacationDays: Number(vacationDays) }),
      },
    })

    return Response.json(employee)
  } catch (error) {
    console.error('[PUT /api/staff/[id]]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth('MANAGER')
  try {
    const { id } = await params

    const employee = await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    })

    return Response.json(employee)
  } catch (error) {
    console.error('[DELETE /api/staff/[id]]', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Failed to deactivate employee' }, { status: 500 })
  }
}
