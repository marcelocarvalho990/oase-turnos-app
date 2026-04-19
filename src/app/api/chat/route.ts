import { prisma } from '@/lib/prisma'
import { type NextRequest } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00').getDay()
  return d === 0 || d === 6
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const date = new Date(d.valueOf())
  date.setDate(date.getDate() + 4 - (date.getDay() || 7))
  const yearStart = new Date(date.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((date.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7)
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function monthLabel(year: number, month: number): string {
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[month - 1]}/${year}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message: string
      history: ChatMessage[]
      year?: number
      month?: number
      team?: string
      lang?: string
    }

    const { message, history = [], year, month, team = '2.OG', lang = 'pt' } = body

    if (!message?.trim()) {
      return Response.json({ error: 'message is required' }, { status: 400 })
    }

    // --- Build context from DB ---
    const [employees, shiftTypes, allAbsences, teamSettings] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        orderBy: [{ team: 'asc' }, { role: 'asc' }, { name: 'asc' }],
      }),
      prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
      // ALL absence requests — not just pending
      prisma.absenceRequest.findMany({
        include: { employee: { select: { name: true, shortName: true } } },
        orderBy: { startDate: 'desc' },
      }),
      prisma.teamSettings.findFirst({ where: { team } }),
    ])

    const shiftMap = new Map(shiftTypes.map(s => [s.code, s]))
    const baseMonthlyHours = teamSettings?.baseMonthlyHours ?? 160

    const roleLabel: Record<string, string> = {
      TEAMLEITUNG:     'HF (Teamleitung)',
      FUNKTIONSSTUFE_3:'HF (Funktionsstufe 3)',
      FUNKTIONSSTUFE_2:'FAGE (Funktionsstufe 2)',
      FUNKTIONSSTUFE_1:'SRK (Funktionsstufe 1)',
      LERNENDE:        'Lernende',
    }

    // --- Employees ---
    const employeeLines = employees.map(e =>
      `  - ${e.name} (${e.shortName}) | ${roleLabel[e.role] ?? e.role} | ${e.workPercentage}% | Equipa: ${e.team} | Férias anuais: ${e.vacationDays} dias`
    ).join('\n')

    // --- Shift types ---
    const shiftLines = shiftTypes.map(s =>
      `  - ${s.code}: ${s.name} | ${s.startTime1}–${s.endTime1}${s.startTime2 ? ` + ${s.startTime2}–${s.endTime2}` : ''} | ${s.durationMinutes}min | Ausência: ${s.isAbsence ? 'Sim' : 'Não'}`
    ).join('\n')

    // --- All absence requests (grouped by status) ---
    const absenceByStatus = { APPROVED: [] as typeof allAbsences, PENDING: [] as typeof allAbsences, REJECTED: [] as typeof allAbsences }
    for (const a of allAbsences) {
      if (a.status === 'APPROVED') absenceByStatus.APPROVED.push(a)
      else if (a.status === 'PENDING') absenceByStatus.PENDING.push(a)
      else absenceByStatus.REJECTED.push(a)
    }

    const fmtAbsence = (a: typeof allAbsences[0]) =>
      `  - ${a.employee.name}: ${a.type} ${a.startDate} → ${a.endDate}${a.notes ? ` ("${a.notes}")` : ''}`

    const absenceSection = `
=== PEDIDOS DE FÉRIAS / AUSÊNCIAS ===

APROVADOS (${absenceByStatus.APPROVED.length}):
${absenceByStatus.APPROVED.length > 0 ? absenceByStatus.APPROVED.map(fmtAbsence).join('\n') : '  (nenhum)'}

PENDENTES (${absenceByStatus.PENDING.length}):
${absenceByStatus.PENDING.length > 0 ? absenceByStatus.PENDING.map(fmtAbsence).join('\n') : '  (nenhum)'}

REJEITADOS (${absenceByStatus.REJECTED.length}):
${absenceByStatus.REJECTED.length > 0 ? absenceByStatus.REJECTED.map(fmtAbsence).join('\n') : '  (nenhum)'}`

    // --- Multi-month schedule context ---
    // Load last 3 months + current + next month
    const monthsToLoad: { y: number; m: number }[] = []
    const refYear = year ?? new Date().getFullYear()
    const refMonth = month ?? (new Date().getMonth() + 1)
    for (let delta = -3; delta <= 1; delta++) {
      let m = refMonth + delta
      let y = refYear
      while (m < 1) { m += 12; y-- }
      while (m > 12) { m -= 12; y++ }
      monthsToLoad.push({ y, m })
    }

    const scheduleContextParts: string[] = []

    for (const { y, m } of monthsToLoad) {
      const schedule = await prisma.schedule.findUnique({
        where: { year_month_team: { year: y, month: m, team } },
        select: { id: true, status: true },
      })
      if (!schedule) continue

      const assignments = await prisma.assignment.findMany({
        where: { scheduleId: schedule.id },
        select: { employeeId: true, date: true, shiftCode: true },
        orderBy: { date: 'asc' },
      })

      const empMap = new Map(employees.map(e => [e.id, e]))

      // Per-employee stats
      const empStats = employees.filter(e => e.team === team).map(e => {
        const empAsgn = assignments.filter(a => a.employeeId === e.id)
        let workedMin = 0; let totalShifts = 0; const weDates: string[] = []
        for (const a of empAsgn) {
          const st = shiftMap.get(a.shiftCode)
          if (st?.isAbsence) continue
          totalShifts++; workedMin += st?.durationMinutes ?? 0
          if (isWeekend(a.date)) weDates.push(a.date)
        }
        const weekends = new Set(weDates.map(isoWeekKey)).size
        const workedH = Math.round(workedMin / 60 * 10) / 10
        const targetH = Math.round(e.workPercentage / 100 * baseMonthlyHours * 10) / 10
        return `    ${e.name}: ${totalShifts} turnos, ${workedH}h/${targetH}h, ${weekends} FDS`
      }).join('\n')

      // Per-day assignments (current/selected month only, to avoid too much data)
      let dailySection = ''
      if (y === refYear && m === refMonth) {
        // Group by date → list of "code(empName)"
        const byDate = new Map<string, string[]>()
        for (const a of assignments) {
          if (!byDate.has(a.date)) byDate.set(a.date, [])
          const emp = empMap.get(a.employeeId)
          byDate.get(a.date)!.push(`${a.shiftCode}:${emp?.shortName ?? '?'}`)
        }
        // Group further by shift code per day
        const dayLines: string[] = []
        for (const [date, entries] of Array.from(byDate.entries()).sort()) {
          const byShift = new Map<string, string[]>()
          for (const e of entries) {
            const [code, name] = e.split(':')
            if (!byShift.has(code)) byShift.set(code, [])
            byShift.get(code)!.push(name)
          }
          const parts = Array.from(byShift.entries()).map(([code, names]) => `${code}=[${names.join(',')}]`).join(' ')
          dayLines.push(`    ${date}: ${parts}`)
        }
        dailySection = dayLines.length > 0
          ? `\n  Escalas diárias:\n${dayLines.join('\n')}`
          : ''
      }

      scheduleContextParts.push(
        `${monthLabel(y, m)} (${schedule.status}):\n  Resumo por colaborador:\n${empStats}${dailySection}`
      )
    }

    const scheduleSection = scheduleContextParts.length > 0
      ? `\n=== ESCALAS (últimos 3 meses + atual) ===\n${scheduleContextParts.join('\n\n')}`
      : ''

    const langInstructions: Record<string, string> = {
      de: 'Du antwortest IMMER auf Deutsch (Schweizer Deutsch ist auch akzeptiert). Verwende keine andere Sprache, egal in welcher Sprache die Frage gestellt wird.',
      pt: 'Respondes SEMPRE em português europeu. Não uses outra língua, independentemente do idioma em que a pergunta for feita.',
      en: 'You ALWAYS respond in English. Do not use any other language, regardless of the language the question is asked in.',
      fr: 'Tu réponds TOUJOURS en français. N\'utilise aucune autre langue, quelle que soit la langue dans laquelle la question est posée.',
      it: 'Rispondi SEMPRE in italiano. Non usare nessun\'altra lingua, indipendentemente dalla lingua in cui viene posta la domanda.',
    }
    const langInstruction = langInstructions[lang] ?? langInstructions['de']

    const systemPrompt = `És um assistente inteligente para o gestor de turnos da Tertianum, empresa de cuidados residenciais na Suíça.
Tens acesso COMPLETO a todos os dados: colaboradores, turnos, ausências (históricas e pendentes), escalas de múltiplos meses e detalhe diário da escala atual.
${langInstruction}
Podes fazer cálculos, identificar padrões, comparar colaboradores, sugerir soluções. Responde de forma clara e direta.

=== COLABORADORES ATIVOS ===
${employeeLines}

=== TIPOS DE TURNO ===
${shiftLines}

=== CONFIGURAÇÕES DA EQUIPA ${team} ===
  - Horas mensais base (100%): ${baseMonthlyHours}h
  - Horas para 50%: ${baseMonthlyHours * 0.5}h, 80%: ${baseMonthlyHours * 0.8}h, 100%: ${baseMonthlyHours}h
${absenceSection}
${scheduleSection}

Se precisares de dados não disponíveis aqui (como escalas de outros anos ou outras equipas), diz-o claramente.`

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
