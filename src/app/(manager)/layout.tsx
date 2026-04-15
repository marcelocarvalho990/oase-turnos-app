import { requireAuth } from '@/lib/auth'
import ManagerSidebar from '@/components/layout/ManagerSidebar'
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper'
import ToastProvider from '@/components/ui/ToastProvider'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth('MANAGER')

  return (
    <div className="flex h-full">
      <ManagerSidebar />
      <ToastProvider>
        <PageTransitionWrapper>
          {children}
        </PageTransitionWrapper>
      </ToastProvider>
    </div>
  )
}
