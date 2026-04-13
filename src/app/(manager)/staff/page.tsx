import { prisma } from '@/lib/prisma'
import StaffPageClient from '@/components/staff/StaffPageClient'
import { Employee } from '@/types'

export default async function StaffPage() {
  const employees = await prisma.employee.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return <StaffPageClient employees={employees as unknown as Employee[]} />
}
