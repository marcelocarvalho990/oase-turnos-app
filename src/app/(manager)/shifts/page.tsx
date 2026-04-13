import { prisma } from '@/lib/prisma'
import ShiftsPageClient from '@/components/shifts/ShiftsPageClient'
import { ShiftType } from '@/types'

export default async function ShiftsPage() {
  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return <ShiftsPageClient shiftTypes={shiftTypes as unknown as ShiftType[]} />
}
