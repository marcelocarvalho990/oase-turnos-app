'use client'

import { usePathname } from 'next/navigation'

export default function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="view-fade flex-1 flex flex-col min-w-0 overflow-hidden">
      {children}
    </div>
  )
}
