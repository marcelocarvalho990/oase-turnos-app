'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import EmployeeSidebar from './EmployeeSidebar'
import EmployeeMobileNav from './EmployeeMobileNav'

interface Props {
  children: React.ReactNode
  employeeName: string
}

export default function EmployeeLayoutClient({ children, employeeName }: Props) {
  const isMobile = useIsMobile()

  return (
    <div className="flex h-full" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {!isMobile && <EmployeeSidebar employeeName={employeeName} />}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{
          background: '#F4F6F8',
          paddingBottom: isMobile ? 68 : 0,
        }}
      >
        {children}
      </div>
      {isMobile && <EmployeeMobileNav />}
    </div>
  )
}
