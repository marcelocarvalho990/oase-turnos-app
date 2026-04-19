import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  await requireAuth('MANAGER')

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (statusFilter) {
    where.status = statusFilter
  }

  const requests = await prisma.wunschfreiRequest.findMany({
    where,
    include: {
      employee: {
        select: { name: true, shortName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(requests)
}
