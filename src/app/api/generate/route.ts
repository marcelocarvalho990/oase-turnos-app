import { prisma } from '@/lib/prisma'
import { runScheduler } from '@/lib/scheduler'
import { type NextRequest } from 'next/server'

// Allow up to 120s on Vercel Pro (LLM scheduling takes time)
export const maxDuration = 120

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const BREAK_MIN = 36
const TARGET_HOURS_100PCT = 164.8

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDayType(dateStr: string): string {
  const dow = new Date(dateStr + 'T00:00:00').getDay()
  if (dow === 6) return 'SATURDAY'
  if (dow === 0) return 'SUNDAY'
  return 'WEEKDAY'
}

function buildDatesForMonth(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const dates: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    dates.push(`${year}-${mm}-${dd}`)
  }
  return dates
}

function getWorkingDays(year: number, month: number): number {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LLMAssignment {
  employeeId: string
  date: string
  shiftCode: string
}

interface LLMEvaluationItem {
  employeeId: string
  employeeName: string
  assignedShifts: number
  expectedShifts: number
  workedHours: number
  targetHours: number
  deltaHours: number
  alerts: string[]
}

interface LLMProblem {
  description: string
  affected?: string
}

interface LLMSuggestion {
  type: 'ADD' | 'SWAP'
  description: string
  reason: string
  // ADD
  employeeId?: string
  employeeName?: string
  date?: string
  shiftCode?: string
  // SWAP
  fromEmployeeId?: string
  fromEmployeeName?: string
  fromDate?: string
  fromShiftCode?: string
  toEmployeeId?: string
  toEmployeeName?: string
  toDate?: string
  toShiftCode?: string
}

interface LLMGenerationResult {
  assignments: LLMAssignment[]
  summary: string
  quality: 'boa' | 'moderada' | 'fraca'
  evaluation: LLMEvaluationItem[]
  problems: {
    critical: LLMProblem[]
    important: LLMProblem[]
    moderate: LLMProblem[]
  }
  suggestions: LLMSuggestion[]
  managerNotes: string
}

// ── LLM system prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu és um motor profissional de geração e avaliação de escalas de trabalho para equipas com múltiplos trabalhadores, diferentes percentagens de contrato, diferentes funções, diferentes hierarquias e restrições humanas reais.

A tua função NÃO é gerar uma escala "perfeita" a qualquer custo.
A tua função é gerar uma escala mensal REALISTA, OPERACIONALMENTE VIÁVEL, HUMANAMENTE ACEITÁVEL e AJUSTÁVEL PELO MANAGER, respeitando ao máximo as regras e mostrando claramente os desvios, conflitos e sugestões.

PRINCÍPIO CENTRAL: Nunca sacrificar realismo humano para satisfazer perfeição matemática.

FASE 1 — LER todos os dados antes de gerar
FASE 2 — SEPARAR regras em hard constraints (cobertura, hierarquia, bloqueios, compatibilidade básica) e soft constraints (turnos consecutivos, S→F, equilíbrio de horas)
FASE 3 — GERAR escala base suficientemente boa (cobrir turnos, respeitar hierarquia F/S, distribuir carga)
FASE 4 — AVALIAR: calcular horas atribuídas vs esperadas, alertas, desvios por colaborador
FASE 5 — DETETAR problemas: críticos (sem cobertura, sem responsável F/S), importantes (desvio alto, excesso consecutivo), moderados (pequenas imperfeições)
FASE 6 — SUGESTÕES práticas e acionáveis

REGRAS HARD (respeitar sempre):
- Em cada turno F e S: deve existir exatamente 1 responsável qualificado (HF=TEAMLEITUNG ou FAGE=FUNKTIONSSTUFE_2/3)
- Cada trabalhador só pode ter 1 turno por dia
- Respeitar bloqueios absolutos (férias aprovadas, atribuições manuais fixas)
- LERNENDE: apenas turnos F e F9
- Turno S: 1 FAGE + 1 SRK não-LERNENDE

REGRAS SOFT (respeitar ao máximo, alertar quando violadas):
- Máximo recomendado 5 dias consecutivos (soft — alertar se 6+, nunca bloquear absolutamente se inevitável)
- Turno S seguido de turno F no dia seguinte: não ideal, detetar e sinalizar, não bloquear absolutamente
- Distribuição equilibrada de horas e turnos por colaborador

FINS DE SEMANA (SATURDAY e SUNDAY):
- São dias de trabalho normais — atribuir turnos F, F9 e S exactamente como em dias de semana
- NUNCA deixar fins de semana sem cobertura por serem fim de semana
- Distribuir fins de semana de forma justa — cada colaborador deve trabalhar aproximadamente o mesmo número de fins de semana
- Um colaborador pode trabalhar no máximo ~4 dias de fim de semana por mês (2 fins de semana completos)

SOBRE ALVOS DE HORAS:
- 100% = 164.8h/mês
- O número de turnos NÃO é fixo — varia com o mês, as ausências e a realidade operacional
- Aceitar pequenas diferenças entre meses

COMPORTAMENTOS PROIBIDOS:
- Esconder desvios ou problemas
- Fingir que a escala está perfeita quando não está
- Gerar soluções desumanas só porque fecham matematicamente
- Omitir validação de responsável qualificado nos turnos F e S

Responde SEMPRE exclusivamente com JSON válido, sem texto adicional, sem markdown, sem explicações fora do JSON.`

// ── Build LLM user message ────────────────────────────────────────────────────

function buildUserMessage(params: {
  year: number
  month: number
  team: string
  dates: string[]
  employees: Array<{
    id: string; name: string; role: string; workPercentage: number
    isExternal: boolean; hardBlocks: string[]
  }>
  shiftTypes: Array<{ code: string; name: string; durationMinutes: number; isAbsence: boolean; eligibleRoles: string[] }>
  coverageRules: Array<{ shiftCode: string; dayType: string; minStaff: number; idealStaff: number }>
  fixedAssignments: Array<{ employeeId: string; date: string; shiftCode: string }>
  instructions?: string
}): string {
  const { year, month, dates, employees, shiftTypes, coverageRules, fixedAssignments, instructions } = params

  const monthName = new Date(year, month - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
  const workShifts = shiftTypes.filter(s => !s.isAbsence)

  // Shift descriptions with effective hours
  const shiftDesc = workShifts.map(s => {
    const brk = (s.code === 'F' || s.code === 'S') ? BREAK_MIN : 0
    const effH = ((s.durationMinutes - brk) / 60).toFixed(1)
    const roles = s.eligibleRoles.length > 0 ? ` [elegível: ${s.eligibleRoles.join(', ')}]` : ' [todos]'
    return `  ${s.code} "${s.name}": ${s.durationMinutes}min total, ${effH}h efectivas (pausa ${brk}min)${roles}`
  }).join('\n')

  // Coverage rules
  const coverageDesc = coverageRules.length > 0
    ? coverageRules.map(r => `  ${r.shiftCode} em ${r.dayType}: mín ${r.minStaff}, ideal ${r.idealStaff}`).join('\n')
    : '  (usar regras operacionais padrão)'

  // Employee table
  const empTable = employees.map(e => {
    const targetH = ((e.workPercentage / 100) * TARGET_HOURS_100PCT).toFixed(1)
    const avgShiftH = 7.4 // approx effective hours per shift
    const expectedShifts = Math.round((e.workPercentage / 100) * TARGET_HOURS_100PCT / avgShiftH)
    const blocks = e.hardBlocks.length > 0 ? e.hardBlocks.join(', ') : 'nenhum'
    const ext = e.isExternal ? ' [EXTERNO — usar por último]' : ''
    return `  ID="${e.id}" | ${e.name} | ${e.role} | ${e.workPercentage}% | alvo ~${targetH}h (~${expectedShifts} turnos)${ext}\n    Bloqueios: ${blocks}`
  }).join('\n')

  // Fixed assignments
  const fixedDesc = fixedAssignments.length > 0
    ? fixedAssignments.map(a => `  ${a.date} → ${employees.find(e => e.id === a.employeeId)?.name ?? a.employeeId}: ${a.shiftCode} (NÃO alterar)`).join('\n')
    : '  (nenhuma)'

  // Calendar
  const calendarDesc = dates.map(d => {
    const dt = getDayType(d)
    const dow = new Date(d + 'T00:00:00').toLocaleString('pt-PT', { weekday: 'short' })
    return `  ${d} (${dow}, ${dt})`
  }).join('\n')

  // JSON schema for response
  const schema = `{
  "summary": "resumo geral em 2-4 frases",
  "quality": "boa|moderada|fraca",
  "assignments": [
    {"employeeId": "<id exacto>", "date": "YYYY-MM-DD", "shiftCode": "<código>"}
  ],
  "evaluation": [
    {
      "employeeId": "<id>",
      "employeeName": "<nome>",
      "assignedShifts": <N>,
      "expectedShifts": <N>,
      "workedHours": <N.N>,
      "targetHours": <N.N>,
      "deltaHours": <N.N>,
      "alerts": ["texto do alerta se existir"]
    }
  ],
  "problems": {
    "critical": [{"description": "...", "affected": "nome ou data"}],
    "important": [{"description": "...", "affected": "..."}],
    "moderate": [{"description": "...", "affected": "..."}]
  },
  "suggestions": [
    {
      "type": "ADD",
      "description": "...",
      "reason": "...",
      "employeeId": "<id>",
      "employeeName": "<nome>",
      "date": "YYYY-MM-DD",
      "shiftCode": "<código>"
    }
  ],
  "managerNotes": "observações importantes para revisão manual"
}`

  return `Gera a escala mensal para ${monthName}.

## EQUIPA (usa os IDs exactos no JSON de output)

${empTable}

## TURNOS DISPONÍVEIS

${shiftDesc}

## REGRAS DE COBERTURA

${coverageDesc}

## CALENDÁRIO (${dates.length} dias)

${calendarDesc}

## ATRIBUIÇÕES FIXAS (MANUAL — não alterar, não incluir no output assignments)

${fixedDesc}

## INSTRUÇÕES DO MANAGER

${instructions?.trim() || '(nenhuma instrução específica)'}

## FORMATO DE RESPOSTA OBRIGATÓRIO

Responde EXCLUSIVAMENTE com JSON válido seguindo este schema exacto (sem texto, sem markdown):

${schema}`
}

// ── Validate and clean LLM assignments ───────────────────────────────────────

function validateAssignments(
  raw: LLMAssignment[],
  employeeIds: Set<string>,
  validShiftCodes: Set<string>,
  hardBlocksMap: Record<string, string[]>,
  fixedMap: Record<string, Record<string, string>>,
): LLMAssignment[] {
  const seen = new Set<string>() // empId::date
  const valid: LLMAssignment[] = []

  for (const a of raw) {
    if (!a.employeeId || !a.date || !a.shiftCode) continue
    if (!employeeIds.has(a.employeeId)) continue
    if (!validShiftCodes.has(a.shiftCode)) continue

    const key = `${a.employeeId}::${a.date}`
    if (seen.has(key)) continue // duplicate
    seen.add(key)

    // Check hard blocks (absences)
    if (hardBlocksMap[a.employeeId]?.includes(a.date)) continue
    // Check fixed assignments (MANUAL)
    if (fixedMap[a.employeeId]?.[a.date]) continue

    valid.push(a)
  }

  return valid
}

// ── Call LLM to generate schedule ────────────────────────────────────────────

async function generateWithLLM(userMessage: string): Promise<LLMGenerationResult | null> {
  if (!OPENROUTER_API_KEY) return null

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
        model: 'anthropic/claude-sonnet-4-5',
        max_tokens: 12000,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!res.ok) {
      console.error('[generate/LLM] OpenRouter error:', res.status, await res.text())
      return null
    }

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const text = json.choices?.[0]?.message?.content?.trim() ?? ''

    // Extract JSON (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[generate/LLM] No JSON in response:', text.slice(0, 500))
      return null
    }

    const parsed = JSON.parse(jsonMatch[0]) as LLMGenerationResult
    if (!Array.isArray(parsed.assignments)) return null

    return parsed
  } catch (err) {
    console.error('[generate/LLM] Error:', err)
    return null
  }
}

// ── TypeScript fallback scheduler ─────────────────────────────────────────────

function buildFallbackInput(params: {
  yr: number; mo: number
  employees: Array<{ id: string; name: string; role: string; workPercentage: number; isExternal: boolean; hardBlocks: string[] }>
  shiftTypes: Array<{ code: string; name: string; durationMinutes: number; isAbsence: boolean; eligibleRoles: string[] }>
  coverageRules: Array<{ shiftCode: string; dayType: string; minStaff: number; idealStaff: number }>
  dates: string[]
}) {
  const GENERATE_SHIFT_CODES = new Set(['F', 'F9', 'S', 'M'])
  return {
    year: params.yr,
    month: params.mo,
    employees: params.employees,
    shiftTypes: params.shiftTypes.filter(st => st.isAbsence || GENERATE_SHIFT_CODES.has(st.code)),
    coverageRules: params.coverageRules.filter(r => GENERATE_SHIFT_CODES.has(r.shiftCode)) as import('@/lib/scheduler').SchedulerCoverageRule[],
    dates: params.dates.map(d => ({ date: d, dayType: getDayType(d) as 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' })),
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { scheduleId, year, month, team, instructions } = body

    if (!scheduleId || !year || !month || !team) {
      return Response.json({ error: 'scheduleId, year, month, and team are required' }, { status: 400 })
    }

    const [schedule, internalEmployees, externalEmployees, shiftTypes, coverageRules, absences, existingAssignments] =
      await Promise.all([
        prisma.schedule.findUnique({ where: { id: scheduleId } }),
        prisma.employee.findMany({ where: { isActive: true, team }, orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
        prisma.employee.findMany({ where: { isActive: true, canCoverOtherTeams: true, team: { not: team } }, orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
        prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.coverageRule.findMany({ where: { team } }),
        prisma.absenceRequest.findMany({ where: { employee: { team }, status: 'APPROVED' }, include: { employee: true } }),
        prisma.assignment.findMany({ where: { scheduleId, origin: 'MANUAL' } }),
      ])

    if (!schedule) return Response.json({ error: 'Schedule not found' }, { status: 404 })
    if (schedule.status === 'PUBLISHED') return Response.json({ error: 'Cannot regenerate a published schedule. Clear it first.' }, { status: 409 })

    const yr = Number(year)
    const mo = Number(month)
    const dates = buildDatesForMonth(yr, mo)
    const workingDays = getWorkingDays(yr, mo)
    const employees = [...internalEmployees, ...externalEmployees]

    // Build hard blocks from absences
    const hardBlocksMap: Record<string, string[]> = {}
    for (const abs of absences) {
      if (!hardBlocksMap[abs.employeeId]) hardBlocksMap[abs.employeeId] = []
      const start = new Date(abs.startDate + 'T00:00:00')
      const end = new Date(abs.endDate + 'T00:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        hardBlocksMap[abs.employeeId].push(d.toISOString().split('T')[0])
      }
    }

    // Fixed manual assignments
    const fixedMap: Record<string, Record<string, string>> = {}
    for (const a of existingAssignments) {
      if (!fixedMap[a.employeeId]) fixedMap[a.employeeId] = {}
      fixedMap[a.employeeId][a.date] = a.shiftCode
    }

    // Employees with hard blocks for the LLM
    const employeesForLLM = employees.map(e => ({
      id: e.id,
      name: e.name,
      role: e.role,
      workPercentage: e.workPercentage,
      isExternal: e.team !== team,
      hardBlocks: [
        ...(hardBlocksMap[e.id] ?? []),
        ...Object.keys(fixedMap[e.id] ?? {}),
      ],
    }))

    const shiftTypesForLLM = shiftTypes.map(st => ({
      code: st.code,
      name: st.name,
      durationMinutes: st.durationMinutes,
      isAbsence: st.isAbsence,
      eligibleRoles: JSON.parse(st.eligibleRoles || '[]') as string[],
    }))

    const coverageRulesForLLM = coverageRules.map(r => ({
      shiftCode: r.shiftCode,
      dayType: r.dayType,
      minStaff: r.minStaff,
      idealStaff: r.idealStaff,
    }))

    const fixedAssignmentsForLLM = existingAssignments.map(a => ({
      employeeId: a.employeeId,
      date: a.date,
      shiftCode: a.shiftCode,
    }))

    // ── Try LLM generation ──────────────────────────────────────────────────

    let solutionAssignments: Array<{ employeeId: string; date: string; shiftCode: string }>
    let llmReport: Omit<LLMGenerationResult, 'assignments'> | null = null
    let generationMode = 'LLM'

    const userMessage = buildUserMessage({
      year: yr, month: mo, team, dates,
      employees: employeesForLLM,
      shiftTypes: shiftTypesForLLM,
      coverageRules: coverageRulesForLLM,
      fixedAssignments: fixedAssignmentsForLLM,
      instructions,
    })

    const llmResult = await generateWithLLM(userMessage)

    if (llmResult) {
      const employeeIds = new Set(employees.map(e => e.id))
      const validShiftCodes = new Set(shiftTypes.filter(s => !s.isAbsence).map(s => s.code))

      const validated = validateAssignments(
        llmResult.assignments,
        employeeIds,
        validShiftCodes,
        hardBlocksMap,
        fixedMap,
      )

      solutionAssignments = validated
      llmReport = {
        summary: llmResult.summary ?? '',
        quality: llmResult.quality ?? 'moderada',
        evaluation: llmResult.evaluation ?? [],
        problems: llmResult.problems ?? { critical: [], important: [], moderate: [] },
        suggestions: (llmResult.suggestions ?? []).map((s, i) => ({ ...s, id: `sug_${Date.now()}_${i}` })),
        managerNotes: llmResult.managerNotes ?? '',
      }
    } else {
      // Fallback: TypeScript greedy scheduler
      generationMode = 'FALLBACK'
      console.warn('[generate] LLM failed or unavailable — falling back to TypeScript scheduler')

      const fallbackInput = buildFallbackInput({
        yr, mo, employees: employeesForLLM, shiftTypes: shiftTypesForLLM,
        coverageRules: coverageRulesForLLM, dates,
      })

      solutionAssignments = runScheduler(fallbackInput)
    }

    // ── Save to DB ──────────────────────────────────────────────────────────

    const manualKeys = new Set(existingAssignments.map(a => `${a.employeeId}::${a.date}`))
    const filteredAssignments = solutionAssignments.filter(a => !manualKeys.has(`${a.employeeId}::${a.date}`))

    await prisma.assignment.deleteMany({ where: { scheduleId, origin: 'AUTO' } })

    if (filteredAssignments.length > 0) {
      await prisma.assignment.createMany({
        data: filteredAssignments.map(a => ({
          scheduleId,
          employeeId: a.employeeId,
          date: a.date,
          shiftCode: a.shiftCode,
          origin: 'AUTO',
        })),
      })
    }

    // ── Insert absence assignments ──────────────────────────────────────────

    const assignedKeys = new Set([
      ...filteredAssignments.map(a => `${a.employeeId}::${a.date}`),
      ...existingAssignments.map(a => `${a.employeeId}::${a.date}`),
    ])

    const absenceAssignments: Array<{ employeeId: string; date: string; shiftCode: string }> = []
    const monthPrefix = `${String(yr)}-${String(mo).padStart(2, '0')}-`

    for (const abs of absences) {
      const start = new Date(abs.startDate + 'T00:00:00')
      const end = new Date(abs.endDate + 'T00:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        if (!dateStr.startsWith(monthPrefix)) continue
        const key = `${abs.employeeId}::${dateStr}`
        if (assignedKeys.has(key)) continue
        assignedKeys.add(key)
        absenceAssignments.push({ employeeId: abs.employeeId, date: dateStr, shiftCode: abs.type })
      }
    }

    if (absenceAssignments.length > 0) {
      await prisma.assignment.createMany({
        data: absenceAssignments.map(a => ({
          scheduleId,
          employeeId: a.employeeId,
          date: a.date,
          shiftCode: a.shiftCode,
          origin: 'AUTO',
        })),
      })
    }

    // ── Update schedule status ──────────────────────────────────────────────

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'GENERATED', generatedAt: new Date() },
    })

    const durationMs = Date.now() - startTime

    await prisma.solverLog.create({
      data: {
        scheduleId,
        status: 'FEASIBLE',
        durationMs,
        ...(instructions ? { violations: `[mode:${generationMode}] [instructions] ${instructions}` } : { violations: `[mode:${generationMode}]` }),
      },
    })

    return Response.json({
      status: 'FEASIBLE',
      count: filteredAssignments.length,
      mode: generationMode,
      workingDays,
      // Rich report from LLM (null if fallback was used)
      report: llmReport,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error('[POST /api/generate]', error)

    try {
      const body = await (request.json().catch(() => ({}))) as { scheduleId?: string }
      if (body?.scheduleId) {
        await prisma.solverLog.create({
          data: {
            scheduleId: body.scheduleId,
            status: 'ERROR',
            durationMs,
            violations: error instanceof Error ? error.message : String(error),
          },
        })
      }
    } catch { /* ignore logging error */ }

    return Response.json({ error: 'Failed to generate schedule' }, { status: 500 })
  }
}
