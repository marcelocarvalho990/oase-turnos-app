import { prisma } from '@/lib/prisma'
import { runScheduler, type SchedulerConstraint } from '@/lib/scheduler'
import { type NextRequest } from 'next/server'
import path from 'path'
import { spawn } from 'child_process'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

function getDayType(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const dow = date.getDay()
  if (dow === 6) return 'SATURDAY'
  if (dow === 0) return 'SUNDAY'
  return 'WEEKDAY'
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

function runSolver(
  problemJson: string,
  solverPath: string,
  timeoutMs = 60000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [solverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Solver exited with code ${code}. stderr: ${stderr}`))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })

    // Write problem to stdin and close it
    proc.stdin.write(problemJson)
    proc.stdin.end()

    // Safety timeout
    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      reject(new Error('Solver timed out'))
    }, timeoutMs)

    proc.on('close', () => clearTimeout(timer))
  })
}

interface ParsedEmployee {
  id: string
  name: string
  shortName: string
}

async function parseInstructions(
  instructionsText: string,
  employees: ParsedEmployee[],
  allShiftCodes: string[]
): Promise<SchedulerConstraint[]> {
  if (!instructionsText?.trim()) return []

  const employeeList = employees
    .map(e => `- id: "${e.id}", nome: "${e.name}", abreviatura: "${e.shortName}"`)
    .join('\n')

  const workShiftList = allShiftCodes.join(', ')

  const prompt = `És um assistente que converte instruções de um gestor de turnos em restrições JSON estruturadas.

COLABORADORES (usa o id exato):
${employeeList}

TURNOS DISPONÍVEIS: ${workShiftList}
Legenda: F = manhã/morning, S = tarde/afternoon/Nachmittag. Outros turnos: ${allShiftCodes.filter(c => c !== 'F' && c !== 'S').join(', ') || 'nenhum'}

TIPOS DE RESTRIÇÃO:
- BLOCK_SHIFT: bloqueia um turno específico para o colaborador
- MAX_SHIFT: máximo de vezes que pode fazer esse turno
- MIN_SHIFT: mínimo de vezes que deve fazer esse turno
- MAX_WEEKENDS: máximo de fins de semana a trabalhar
- MIN_WEEKENDS: mínimo de fins de semana a trabalhar

REGRAS DE CONVERSÃO (aplica a CADA instrução individualmente):

"não trabalha" / "de folga" / "ausente" / "não escalar este mês"
→ BLOCK_SHIFT para CADA turno de ${workShiftList} (uma entrada por turno)

"só faz turno da manhã" / "só manhãs" / "apenas turno F"
→ BLOCK_SHIFT para cada turno EXCEPTO F

"só faz turno da tarde" / "só tardes" / "apenas turno S" / "só S"
→ BLOCK_SHIFT para cada turno EXCEPTO S

"faz turno da manhã" / "turno F" (sem "só")
→ BLOCK_SHIFT para cada turno EXCEPTO F (interpretado como restrição exclusiva)

"evitar turno X" / "sem turno X"
→ BLOCK_SHIFT apenas para X

"trabalhar todos os dias" / "máximo de dias" / "escalar sempre"
→ MIN_SHIFT com shiftCode do turno que lhe foi atribuído, count: 22

"mínimo N fins de semana" → MIN_WEEKENDS count: N
"máximo N fins de semana" → MAX_WEEKENDS count: N
"máximo N turnos X" → MAX_SHIFT shiftCode: X, count: N
"mínimo N turnos X" → MIN_SHIFT shiftCode: X, count: N

PROCESSO:
1. Identifica TODOS os colaboradores mencionados nas instruções (por nome parcial, apelido ou abreviatura)
2. Para CADA colaborador, analisa o que é pedido e gera as restrições correspondentes
3. Processa TODAS as instruções — não ignores nenhuma

INSTRUÇÕES DO GESTOR:
"${instructionsText}"

Responde APENAS com um array JSON válido. Formato de cada elemento:
{"type": "BLOCK_SHIFT"|"MAX_SHIFT"|"MIN_SHIFT"|"MAX_WEEKENDS"|"MIN_WEEKENDS", "employeeId": "<id>", "shiftCode": "<código ou omite>", "count": <número ou omite>}

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
      console.error('[parseInstructions] OpenRouter error:', res.status, await res.text())
      return []
    }

    const json = await res.json() as { choices: Array<{ message: { content: string } }> }
    const text = json.choices?.[0]?.message?.content?.trim() ?? ''

    // Extract JSON array from response (handle possible markdown fences)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as SchedulerConstraint[]
    // Validate each constraint has required fields and a valid employee id
    return parsed.filter(
      c => c.type && c.employeeId && employees.some(e => e.id === c.employeeId)
    )
  } catch (err) {
    console.error('[parseInstructions] AI parse failed:', err)
    return []
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { scheduleId, year, month, team, instructions } = body

    if (!scheduleId || !year || !month || !team) {
      return Response.json(
        { error: 'scheduleId, year, month, and team are required' },
        { status: 400 }
      )
    }

    // Load all data needed for the solver
    const [schedule, internalEmployees, externalEmployees, shiftTypes, coverageRules, absences, preferences, existingAssignments] =
      await Promise.all([
        prisma.schedule.findUnique({ where: { id: scheduleId } }),
        // Internal staff — this team
        prisma.employee.findMany({
          where: { isActive: true, team },
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
        }),
        // External staff — other teams who are allowed to cover
        prisma.employee.findMany({
          where: { isActive: true, canCoverOtherTeams: true, team: { not: team } },
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
        }),
        prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.coverageRule.findMany({ where: { team } }),
        prisma.absenceRequest.findMany({
          where: {
            employee: { team },
            status: 'APPROVED',
          },
          include: { employee: true },
        }),
        prisma.shiftPreference.findMany({
          where: {
            employee: { team },
          },
          include: { employee: true },
        }),
        prisma.assignment.findMany({
          where: { scheduleId, origin: 'MANUAL' },
        }),
      ])

    // Merge: internal employees first, external after
    const employees = [
      ...internalEmployees,
      ...externalEmployees,
    ]

    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (schedule.status === 'PUBLISHED') {
      return Response.json({ error: 'Cannot regenerate a published schedule. Clear it first.' }, { status: 409 })
    }

    const yr = Number(year)
    const mo = Number(month)
    const dates = buildDatesForMonth(yr, mo)
    const workingDays = getWorkingDays(yr, mo)

    // Build hard blocks per employee from absence requests (already filtered: APPROVED + isHardBlock)
    const hardBlocksMap: Record<string, string[]> = {}
    for (const abs of absences) {
      const empId = abs.employeeId
      if (!hardBlocksMap[empId]) hardBlocksMap[empId] = []
      // Expand date range
      const start = new Date(abs.startDate + 'T00:00:00')
      const end = new Date(abs.endDate + 'T00:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        hardBlocksMap[empId].push(d.toISOString().split('T')[0])
      }
    }
    // Also add MANUAL assignments as fixed blocks (employee has a set shift)
    const fixedMap: Record<string, Record<string, string>> = {}
    for (const a of existingAssignments) {
      if (!fixedMap[a.employeeId]) fixedMap[a.employeeId] = {}
      fixedMap[a.employeeId][a.date] = a.shiftCode
    }

    // Only F, F9, S are generated — M and other shifts excluded
    const GENERATE_SHIFT_CODES = new Set(['F', 'F9', 'S'])

    // Build problem JSON matching solver's expected format
    const problem = {
      year: yr,
      month: mo,
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        workPercentage: e.workPercentage,
        isExternal: e.team !== team,
        // Hard blocks: absence requests + dates with manual assignments
        hardBlocks: [
          ...(hardBlocksMap[e.id] ?? []),
          ...Object.keys(fixedMap[e.id] ?? {}),
        ],
      })),
      shiftTypes: shiftTypes
        .filter(st => st.isAbsence || GENERATE_SHIFT_CODES.has(st.code))
        .map((st) => ({
          code: st.code,
          name: st.name,
          durationMinutes: st.durationMinutes,
          isAbsence: st.isAbsence,
          eligibleRoles: JSON.parse(st.eligibleRoles || '[]'),
        })),
      coverageRules: coverageRules
        .filter(r => GENERATE_SHIFT_CODES.has(r.shiftCode))
        .map((r) => ({
          shiftCode: r.shiftCode,
          dayType: r.dayType,
          minStaff: r.minStaff,
          idealStaff: r.idealStaff,
        })),
      // Metadata only (not used by solver core)
      workingDays,
      dates: dates.map((d) => ({ date: d, dayType: getDayType(d) })),
    }

    // Parse natural language instructions into structured constraints via AI
    // Only internal employees are referenced in manager instructions
    const workShiftCodes = shiftTypes.filter(st => !st.isAbsence).map(st => st.code)
    const parsedConstraints = await parseInstructions(
      instructions ?? '',
      internalEmployees.map(e => ({ id: e.id, name: e.name, shortName: e.shortName })),
      workShiftCodes
    )

    const solverPath = path.join(process.cwd(), 'solver', 'solver.py')

    let solutionAssignments: Array<{ employeeId: string; date: string; shiftCode: string }>

    try {
      const rawOutput = await runSolver(JSON.stringify(problem), solverPath)
      const solution = JSON.parse(rawOutput)

      if (!solution.assignments || !Array.isArray(solution.assignments)) {
        throw new Error('Solver returned invalid solution format')
      }

      solutionAssignments = solution.assignments
    } catch (solverError) {
      const errMessage = solverError instanceof Error ? solverError.message : String(solverError)

      // Python not available — fall back to built-in JS scheduler
      if (
        errMessage.includes('ENOENT') ||
        errMessage.includes('not found') ||
        errMessage.includes('No such file')
      ) {
        solutionAssignments = runScheduler({
          year: yr,
          month: mo,
          employees: problem.employees,
          shiftTypes: problem.shiftTypes,
          coverageRules: problem.coverageRules as import('@/lib/scheduler').SchedulerCoverageRule[],
          dates: problem.dates as import('@/lib/scheduler').SchedulerDate[],
          constraints: parsedConstraints,
        })
      } else {
        throw solverError
      }
    }

    // Build a set of MANUAL assignment keys to avoid conflicts
    const manualKeys = new Set(
      existingAssignments.map((a) => `${a.employeeId}::${a.date}`)
    )

    // Filter out solver assignments that conflict with manual ones
    const filteredAssignments = solutionAssignments.filter(
      (a) => !manualKeys.has(`${a.employeeId}::${a.date}`)
    )

    // Clear existing AUTO assignments and bulk insert new ones
    await prisma.assignment.deleteMany({
      where: { scheduleId, origin: 'AUTO' },
    })

    if (filteredAssignments.length > 0) {
      await prisma.assignment.createMany({
        data: filteredAssignments.map((a) => ({
          scheduleId,
          employeeId: a.employeeId,
          date: a.date,
          shiftCode: a.shiftCode,
          origin: 'AUTO',
        })),
      })
    }
    solutionAssignments = filteredAssignments

    // Insert absence assignments for approved vacation days within this month
    // Build a set of all already-assigned employee+date pairs
    const assignedKeys = new Set([
      ...filteredAssignments.map(a => `${a.employeeId}::${a.date}`),
      ...existingAssignments.map(a => `${a.employeeId}::${a.date}`),
    ])

    const absenceAssignments: Array<{ employeeId: string; date: string; shiftCode: string }> = []
    const monthPrefix = `${String(yr)}-${String(mo).padStart(2, '0')}-`

    for (const abs of absences) {
      const shiftCode = abs.type  // 'Ferien', 'Krank30', etc. — matches ShiftType.code
      const start = new Date(abs.startDate + 'T00:00:00')
      const end = new Date(abs.endDate + 'T00:00:00')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        if (!dateStr.startsWith(monthPrefix)) continue
        const key = `${abs.employeeId}::${dateStr}`
        if (assignedKeys.has(key)) continue
        assignedKeys.add(key)
        absenceAssignments.push({ employeeId: abs.employeeId, date: dateStr, shiftCode })
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

    // Update schedule status
    await prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'GENERATED', generatedAt: new Date() },
    })

    const durationMs = Date.now() - startTime

    const logViolations = instructions
      ? `[instructions] ${instructions}\n[parsed] ${JSON.stringify(parsedConstraints)}`
      : undefined

    await prisma.solverLog.create({
      data: {
        scheduleId,
        status: 'FEASIBLE',
        durationMs,
        ...(logViolations ? { violations: logViolations } : {}),
      },
    })

    return Response.json({
      status: 'FEASIBLE',
      count: solutionAssignments.length,
      durationMs,
      parsedConstraints: parsedConstraints.length,
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
    } catch {
      // ignore logging error
    }

    return Response.json({ error: 'Failed to generate schedule' }, { status: 500 })
  }
}
