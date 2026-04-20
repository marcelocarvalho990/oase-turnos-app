import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { verifyManagerPassword, verifyEmployeePin } from '@/lib/auth'

// In-memory rate limiter (per process instance)
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getClientKey(request: Request): string {
  const forwarded = (request as Request & { headers: Headers }).headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

function clearRateLimit(key: string): void {
  attempts.delete(key)
}

export async function POST(request: Request) {
  try {
    const clientKey = getClientKey(request)
    if (!checkRateLimit(clientKey)) {
      return Response.json(
        { error: 'Demasiadas tentativas. Tenta novamente em 15 minutos.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { role, password, employeeId, pin } = body

    if (role === 'MANAGER') {
      const ok = await verifyManagerPassword(password ?? '')
      if (!ok) return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
      clearRateLimit(clientKey)
      await createSession({ role: 'MANAGER', employeeId: null, employeeName: null })
      return Response.json({ ok: true, role: 'MANAGER' })
    }

    if (role === 'EMPLOYEE') {
      if (!employeeId || !pin) {
        return Response.json({ error: 'employeeId e pin são obrigatórios' }, { status: 400 })
      }
      const ok = await verifyEmployeePin(employeeId, pin)
      if (!ok) return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
      clearRateLimit(clientKey)
      const emp = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!emp) return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 })
      await createSession({ role: 'EMPLOYEE', employeeId, employeeName: emp.name })
      return Response.json({ ok: true, role: 'EMPLOYEE' })
    }

    return Response.json({ error: 'Role inválido' }, { status: 400 })
  } catch (e) {
    console.error('[POST /api/auth/login]', e instanceof Error ? e.message : 'unknown error')
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
