import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import EmployeeCalendarClient from './EmployeeCalendarClient'

export default async function CalendarioPage() {
  const session = await requireAuth('EMPLOYEE')

  // Fetch employee's shift types for color mapping
  const shiftTypes = await prisma.shiftType.findMany({
    select: { id: true, name: true, code: true, color: true, startTime1: true, endTime1: true },
  })

  return (
    <EmployeeCalendarClient
      employeeId={session.employeeId!}
      employeeName={session.employeeName ?? ''}
      shiftTypes={shiftTypes}
    />
  )
}
