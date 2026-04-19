import { requireAuth } from '@/lib/auth'
import ManagerLayoutClient from '@/components/layout/ManagerLayoutClient'
import ToastProvider from '@/components/ui/ToastProvider'
import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireAuth('MANAGER')

  return (
    <ManagerLayoutClient>
      <ToastProvider>
        <PageTransitionWrapper>
          {children}
        </PageTransitionWrapper>
      </ToastProvider>
    </ManagerLayoutClient>
  )
}
