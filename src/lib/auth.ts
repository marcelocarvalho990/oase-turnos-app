import { createHash } from 'crypto'
import { prisma } from './prisma'
import { getSession } from './session'
import { redirect } from 'next/navigation'

export function hashPin(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function verifyManagerPassword(password: string): Promise<boolean> {
  const hash = hashPin(password)
  const managerPin = await prisma.userPin.findFirst({ where: { employeeId: null } })
  if (!managerPin) {
    // Auto-create manager pin from env on first check
    const envPassword = process.env.MANAGER_PASSWORD ?? 'admin123'
    await prisma.userPin.create({ data: { employeeId: null, pin: hashPin(envPassword) } })
    return hashPin(password) === hashPin(envPassword)
  }
  return hash === managerPin.pin
}

export async function verifyEmployeePin(employeeId: string, pin: string): Promise<boolean> {
  const record = await prisma.userPin.findUnique({ where: { employeeId } })
  if (!record) return false
  return hashPin(pin) === record.pin
}

export async function getCurrentUser() {
  return getSession()
}

export async function requireAuth(role?: 'MANAGER' | 'EMPLOYEE') {
  const session = await getSession()
  if (!session) redirect('/login')
  if (role && session.role !== role) {
    redirect(session.role === 'MANAGER' ? '/schedule' : '/colaborador')
  }
  return session
}
