import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { verifyManagerPassword, verifyEmployeePin } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { role, password, employeeId, pin } = body

    if (role === 'MANAGER') {
      const ok = await verifyManagerPassword(password ?? '')
      if (!ok) return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
      await createSession({ role: 'MANAGER', employeeId: null, employeeName: null })
      return Response.json({ ok: true, role: 'MANAGER' })
    }

    if (role === 'EMPLOYEE') {
      if (!employeeId || !pin) {
        return Response.json({ error: 'employeeId e pin são obrigatórios' }, { status: 400 })
      }
      const ok = await verifyEmployeePin(employeeId, pin)
      if (!ok) return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
      const emp = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!emp) return Response.json({ error: 'Colaborador não encontrado' }, { status: 404 })
      await createSession({ role: 'EMPLOYEE', employeeId, employeeName: emp.name })
      return Response.json({ ok: true, role: 'EMPLOYEE' })
    }

    return Response.json({ error: 'Role inválido' }, { status: 400 })
  } catch (e) {
    console.error('[POST /api/auth/login]', e)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
