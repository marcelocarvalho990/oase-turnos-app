import { requireAuth } from '@/lib/auth'
import ConfirmacoesClient from './ConfirmacoesClient'

export default async function ConfirmacoesPage() {
  await requireAuth('MANAGER')
  return <ConfirmacoesClient />
}
