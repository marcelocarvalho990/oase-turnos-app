import { requireAuth } from '@/lib/auth'
import EmployeeSidebar from '@/components/layout/EmployeeSidebar'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth('EMPLOYEE')

  return (
    <div className="flex h-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <EmployeeSidebar employeeName={session.employeeName ?? ''} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAF8F4]">
        {children}
      </div>
    </div>
  )
}
