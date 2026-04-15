import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { type NextRequest } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const BREAK_MIN = 36
const TARGET_HOURS_100PCT = 164.8

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (session.role !== 'MANAGER') {
    return Response.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { scheduleId, year, month, team } = await request.json()
  if (!scheduleId || !year || !month || !team) {
    return Response.json({ error: 'Parâmetros em falta' }, { status: 400 })
  }

  const [employees, assignments, shiftTypes, absences] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true, team },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    prisma.assignment.findMany({ where: { scheduleId } }),
    prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.absenceRequest.findMany({
      where: { employee: { team }, status: 'APPROVED' },
    }),
  ])

  const shiftTypeMap = new Map(shiftTypes.map(st => [st.code, st]))

  // Build blocked dates per employee (absences)
  const absenceBlocksMap = new Map<string, Set<string>>()
  for (const abs of absences) {
    if (!absenceBlocksMap.has(abs.employeeId)) absenceBlocksMap.set(abs.employeeId, new Set())
    const start = new Date(abs.startDate + 'T00:00:00')
    const end = new Date(abs.endDate + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      absenceBlocksMap.get(abs.employeeId)!.add(d.toISOString().split('T')[0])
    }
  }

  // Compute hours per employee
  const workAssignments = assignments.filter(a => !shiftTypeMap.get(a.shiftCode)?.isAbsence)
  const assignedDatesMap = new Map<string, Set<string>>()
  const assignedShiftsMap = new Map<string, { date: string; shiftCode: string }[]>()

  for (const a of workAssignments) {
    if (!assignedDatesMap.has(a.employeeId)) assignedDatesMap.set(a.employeeId, new Set())
    assignedDatesMap.get(a.employeeId)!.add(a.date)
    if (!assignedShiftsMap.has(a.employeeId)) assignedShiftsMap.set(a.employeeId, [])
    assignedShiftsMap.get(a.employeeId)!.push({ date: a.date, shiftCode: a.shiftCode })
  }

  // All calendar dates in month
  const daysInMonth = new Date(year, month, 0).getDate()
  const allDates: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    allDates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  const employeeStats = employees.map(emp => {
    const empAssignments = workAssignments.filter(a => a.employeeId === emp.id)
    let workedMinutes = 0
    for (const a of empAssignments) {
      const st = shiftTypeMap.get(a.shiftCode)
      if (!st) continue
      const brk = (a.shiftCode === 'F' || a.shiftCode === 'S') ? BREAK_MIN : 0
      workedMinutes += st.durationMinutes - brk
    }
    const targetHours = Math.round((emp.workPercentage / 100) * TARGET_HOURS_100PCT * 10) / 10
    const workedHours = Math.round(workedMinutes / 60 * 10) / 10
    const delta = Math.round((workedHours - targetHours) * 10) / 10

    const absenceBlocks = absenceBlocksMap.get(emp.id) ?? new Set()
    const assigned = assignedDatesMap.get(emp.id) ?? new Set()
    const freeDays = allDates.filter(d => !assigned.has(d) && !absenceBlocks.has(d))

    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      workPercentage: emp.workPercentage,
      targetHours,
      workedHours,
      delta,
      freeDays: freeDays.slice(0, 15),
      shifts: (assignedShiftsMap.get(emp.id) ?? []).sort((a, b) => a.date.localeCompare(b.date)),
    }
  })

  const workShiftTypes = shiftTypes.filter(st => !st.isAbsence)
  const shiftInfo = workShiftTypes.map(st => {
    const brk = (st.code === 'F' || st.code === 'S') ? BREAK_MIN : 0
    const effH = Math.round((st.durationMinutes - brk) / 60 * 10) / 10
    return `${st.code} "${st.name}" (${effH}h efectivas)`
  })

  const underTarget = employeeStats.filter(e => e.delta < -4).sort((a, b) => a.delta - b.delta)
  const overTarget = employeeStats.filter(e => e.delta > 4).sort((a, b) => b.delta - a.delta)

  if (underTarget.length === 0) {
    return Response.json({ suggestions: [] })
  }

  const prompt = `És um gestor de turnos experiente. Analisa os dados e gera sugestões para equilibrar as horas dos colaboradores.

MÊS: ${year}-${String(month).padStart(2, '0')}
TURNOS DISPONÍVEIS: ${shiftInfo.join(' | ')}

COLABORADORES COM HORAS A MENOS (precisam de mais turnos):
${underTarget.map(e =>
  `- ID "${e.id}" | ${e.name} (${e.role}, ${e.workPercentage}%) | ${e.workedHours}h / ${e.targetHours}h (${e.delta}h em falta)` +
  `\n  Dias livres: ${e.freeDays.join(', ')}`
).join('\n')}

COLABORADORES COM HORAS A MAIS (podem ceder turnos):
${overTarget.length > 0
  ? overTarget.map(e =>
    `- ID "${e.id}" | ${e.name} (${e.role}) | ${e.workedHours}h / ${e.targetHours}h (+${e.delta}h a mais)` +
    `\n  Turnos recentes: ${e.shifts.slice(-8).map(s => s.date.slice(5) + ':' + s.shiftCode).join(', ')}`
  ).join('\n')
  : '(nenhum significativo)'}

REGRAS OBRIGATÓRIAS:
- LERNENDE: só podem fazer F e F9
- Turno S: precisa de 1 FAGE + 1 SRK (não LERNENDE)
- Turno F9: apenas 1 SRK por dia
- Máximo 1 turno M por dia
- Máximo 5 dias consecutivos de trabalho por colaborador

PRIORIDADE: sugere primeiro SWAPs (colaborador com horas a mais cede turno a alguém com horas a menos no mesmo dia). Depois sugere ADDs nos dias livres.

Gera até 8 sugestões. Usa os IDs exactos fornecidos.

Responde APENAS com um array JSON. Cada elemento tem este formato:

Para ADD (adicionar turno num dia livre):
{"type":"ADD","description":"texto curto","reason":"justificação","employeeId":"<id>","employeeName":"<nome>","date":"YYYY-MM-DD","shiftCode":"<código>"}

Para SWAP (colaborador A cede turno a colaborador B no mesmo dia):
{"type":"SWAP","description":"texto curto","reason":"justificação","fromEmployeeId":"<id>","fromEmployeeName":"<nome>","fromDate":"YYYY-MM-DD","fromShiftCode":"<código>","toEmployeeId":"<id>","toEmployeeName":"<nome>","toDate":"YYYY-MM-DD","toShiftCode":"<código>"}

Array JSON:`

  try {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://turnos-tertianum.vercel.app',
        'X-Title': 'Turnos Tertianum',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      console.error('[suggestions] OpenRouter error:', res.status, await res.text())
      return Response.json({ error: 'IA não disponível' }, { status: 503 })
    }

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const text = json.choices?.[0]?.message?.content?.trim() ?? ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return Response.json({ suggestions: [] })

    const raw = JSON.parse(jsonMatch[0]) as unknown[]
    const suggestions = raw.map((s, i) => ({ ...(s as object), id: `sug_${Date.now()}_${i}` }))

    return Response.json({ suggestions })
  } catch (err) {
    console.error('[suggestions] Error:', err)
    return Response.json({ error: 'Erro ao gerar sugestões' }, { status: 500 })
  }
}
