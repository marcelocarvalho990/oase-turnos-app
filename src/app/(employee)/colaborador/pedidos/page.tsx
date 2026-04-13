import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import EmployeePedidosClient from './EmployeePedidosClient'

export default async function PedidosPage() {
  const session = await requireAuth('EMPLOYEE')

  // Fetch colleagues for swap target selector
  const colleagues = await prisma.employee.findMany({
    where: { id: { not: session.employeeId! }, isActive: true },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: 'asc' },
  })

  return (
    <EmployeePedidosClient
      employeeId={session.employeeId!}
      colleagues={colleagues}
    />
  )
}
