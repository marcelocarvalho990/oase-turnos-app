import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const date = new Date(d.valueOf())
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((date.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7)
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00').getDay()
  return d === 0 || d === 6
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message: string
      history: ChatMessage[]
      year?: number
      month?: number
      team?: string
    }

    const { message, history = [], year, month, team = '2.OG' } = body

    if (!message?.trim()) {
      return Response.json({ error: 'message is required' }, { status: 400 })
    }

    // --- Build context from DB ---
    const [employees, shiftTypes, pendingAbsences, teamSettings] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        orderBy: [{ team: 'asc' }, { role: 'asc' }, { name: 'asc' }],
      }),
      prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.absenceRequest.findMany({
        where: { status: 'PENDING' },
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teamSettings.findFirst({ where: { team } }),
    ])

    const shiftMap = new Map(shiftTypes.map(s => [s.code, s]))
    const baseMonthlyHours = teamSettings?.baseMonthlyHours ?? 160

    // Build employee lines
    const roleLabel: Record<string, string> = {
      TEAMLEITUNG: 'HF (Teamleitung)',
      FUNKTIONSSTUFE_3: 'FAGE (Funktionsstufe 3)',
      FUNKTIONSSTUFE_2: 'FAGE (Funktionsstufe 2)',
      FUNKTIONSSTUFE_1: 'SRK (Funktionsstufe 1)',
      LERNENDE: 'SRK (Lernende)',
    }

    const employeeLines = employees.map(e =>
      `  - ${e.name} (${e.shortName}) | ${roleLabel[e.role] ?? e.role} | ${e.workPercentage}% | Equipa: ${e.team} | Férias: ${e.vacationDays} dias`
    ).join('\n')

    const shiftLines = shiftTypes.map(s =>
      `  - ${s.code}: ${s.name} | ${s.startTime1}–${s.endTime1}${s.startTime2 ? ` + ${s.startTime2}–${s.endTime2}` : ''} | ${s.durationMinutes}min | Ausência: ${s.isAbsence ? 'Sim' : 'Não'}`
    ).join('\n')

    const absenceLines = pendingAbsences.length > 0
      ? pendingAbsences.map(a =>
          `  - ${a.employee.name}: ${a.type} de ${a.startDate} a ${a.endDate}${a.notes ? ` (nota: ${a.notes})` : ''}`
        ).join('\n')
      : '  (nenhum pedido pendente)'

    // Current month schedule if provided
    let scheduleContext = ''
    if (year && month) {
      const schedule = await prisma.schedule.findUnique({
        where: { year_month_team: { year, month, team } },
      })

      if (schedule) {
        const assignments = await prisma.assignment.findMany({
          where: { scheduleId: schedule.id },
        })

        // Build per-employee stats
        const empStats = employees
          .filter(e => e.team === team)
          .map(e => {
            const empAsgn = assignments.filter(a => a.employeeId === e.id)
            let workedMinutes = 0
            let totalShifts = 0
            const weekendDates: string[] = []

            for (const a of empAsgn) {
              const st = shiftMap.get(a.shiftCode)
              if (st?.isAbsence) continue
              totalShifts++
              workedMinutes += st?.durationMinutes ?? 0
              if (isWeekend(a.date)) weekendDates.push(a.date)
            }

            const weekends = new Set(weekendDates.map(isoWeekKey)).size
            const workedHours = Math.round(workedMinutes / 60 * 10) / 10
            const targetHours = Math.round(e.workPercentage / 100 * baseMonthlyHours * 10) / 10

            return `  - ${e.name}: ${totalShifts} turnos | ${workedHours}h trabalhadas (alvo ${targetHours}h) | ${weekends} fins de semana`
          }).join('\n')

        const monthNames = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
        scheduleContext = `\nEscala atual (${monthNames[month]} ${year}, equipa ${team}, estado: ${schedule.status}):\n${empStats}`
      }
    }

    const systemPrompt = `És um assistente inteligente para o gestor de turnos da Tertianum, uma empresa de cuidados residenciais na Suíça.
Tens acesso completo à informação dos colaboradores, turnos, pedidos de ausência e escalas.
Respondes sempre em português europeu de forma clara, direta e útil.
Podes fazer cálculos, comparar colaboradores, identificar problemas na escala, sugerir soluções.

=== COLABORADORES ATIVOS ===
${employeeLines}

=== TIPOS DE TURNO ===
${shiftLines}

=== CONFIGURAÇÕES DA EQUIPA ${team} ===
  - Horas mensais base (100%): ${baseMonthlyHours}h
  - Horas para 50%: ${baseMonthlyHours * 0.5}h, 80%: ${baseMonthlyHours * 0.8}h, etc.

=== PEDIDOS DE AUSÊNCIA PENDENTES ===
${absenceLines}
${scheduleContext}

Responde à pergunta do gestor com base nestes dados. Se precisares de dados que não estão disponíveis aqui (como uma escala de outro mês), diz-o.`

    // Call OpenRouter (OpenAI-compatible format: system goes inside messages array)
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
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[chat] OpenRouter error:', res.status, errText)
      return Response.json({ error: 'AI service unavailable' }, { status: 502 })
    }

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const reply = json.choices?.[0]?.message?.content ?? ''

    return Response.json({ reply })
  } catch (error) {
    console.error('[POST /api/chat]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
