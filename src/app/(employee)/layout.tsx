import { requireAuth } from '@/lib/auth'
import EmployeeLayoutClient from '@/components/layout/EmployeeLayoutClient'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth('EMPLOYEE')

  return (
    <EmployeeLayoutClient employeeName={session.employeeName ?? ''}>
      {children}
    </EmployeeLayoutClient>
  )
}
