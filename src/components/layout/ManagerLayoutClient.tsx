'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import ManagerSidebar from './ManagerSidebar'
import ManagerMobileNav from './ManagerMobileNav'

interface Props {
  children: React.ReactNode
}

export default function ManagerLayoutClient({ children }: Props) {
  const isMobile = useIsMobile()

  return (
    <div className="flex h-full">
      {!isMobile && <ManagerSidebar />}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          paddingBottom: isMobile ? 68 : 0,
        }}
      >
        {children}
      </div>
      {isMobile && <ManagerMobileNav />}
    </div>
  )
}
