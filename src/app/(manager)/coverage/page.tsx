import { prisma } from '@/lib/prisma'
import CoveragePageClient from '@/components/coverage/CoveragePageClient'
import { CoverageRule, ShiftType } from '@/types'

export default async function CoveragePage() {
  const [rules, workShifts] = await Promise.all([
    prisma.coverageRule.findMany({
      orderBy: [{ shiftCode: 'asc' }, { dayType: 'asc' }],
    }),
    prisma.shiftType.findMany({
      where: { isWorkTime: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  return (
    <CoveragePageClient
      rules={rules as unknown as CoverageRule[]}
      workShifts={workShifts as unknown as ShiftType[]}
    />
  )
}
