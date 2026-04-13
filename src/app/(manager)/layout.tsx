import { requireAuth } from '@/lib/auth'
import ManagerSidebar from '@/components/layout/ManagerSidebar'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth('MANAGER')

  return (
    <div className="flex h-full">
      <ManagerSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
