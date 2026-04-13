import { requireAuth } from '@/lib/auth'
import ManagerPedidosClient from './ManagerPedidosClient'

export default async function ManagerPedidosPage() {
  await requireAuth('MANAGER')
  return <ManagerPedidosClient />
}
