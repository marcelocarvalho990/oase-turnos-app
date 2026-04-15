import { requireAuth } from '@/lib/auth'
import RegistoClient from './RegistoClient'

export default async function RegistoPage() {
  await requireAuth('EMPLOYEE')
  return <RegistoClient />
}
