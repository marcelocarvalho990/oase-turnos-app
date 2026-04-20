import { createHash, randomInt, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'
import { getSession } from './session'
import { redirect } from 'next/navigation'

export function hashPin(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function generatePin(): string {
  return String(randomInt(1000, 10000))
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) {
    // Still do the comparison to avoid timing leak on length
    timingSafeEqual(ba, Buffer.alloc(ba.length))
    return false
  }
  return timingSafeEqual(ba, bb)
}

export async function verifyManagerPassword(password: string): Promise<boolean> {
  const hash = hashPin(password)
  const managerPin = await prisma.userPin.findFirst({ where: { employeeId: null } })
  if (!managerPin) {
    const envPassword = process.env.MANAGER_PASSWORD
    if (!envPassword) return false
    await prisma.userPin.create({ data: { employeeId: null, pin: hashPin(envPassword) } })
    return safeEqual(hash, hashPin(envPassword))
  }
  return safeEqual(hash, managerPin.pin)
}

export async function verifyEmployeePin(employeeId: string, pin: string): Promise<boolean> {
  const record = await prisma.userPin.findUnique({ where: { employeeId } })
  if (!record) return false
  return safeEqual(hashPin(pin), record.pin)
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
