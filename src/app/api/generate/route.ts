import { prisma } from '@/lib/prisma'
import { runScheduler } from '@/lib/scheduler'
import { type NextRequest } from 'next/server'
import path from 'path'
import { spawn } from 'child_process'

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
    const [schedule, employees, shiftTypes, coverageRules, absences, preferences, existingAssignments] =
      await Promise.all([
        prisma.schedule.findUnique({ where: { id: scheduleId } }),
        prisma.employee.findMany({
          where: { isActive: true, team },
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
        }),
        prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.coverageRule.findMany({ where: { team } }),
        prisma.absenceRequest.findMany({
          where: {
            employee: { team },
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

    if (!schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const yr = Number(year)
    const mo = Number(month)
    const dates = buildDatesForMonth(yr, mo)
    const workingDays = getWorkingDays(yr, mo)

    // Build hard blocks per employee from absence requests
    const hardBlocksMap: Record<string, string[]> = {}
    for (const abs of absences) {
      if (!abs.isHardBlock) continue
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

    // Build problem JSON matching solver's expected format
    const problem = {
      year: yr,
      month: mo,
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        workPercentage: e.workPercentage,
        // Hard blocks: absence requests + dates with manual assignments
        hardBlocks: [
          ...(hardBlocksMap[e.id] ?? []),
          ...Object.keys(fixedMap[e.id] ?? {}),
        ],
      })),
      shiftTypes: shiftTypes.map((st) => ({
        code: st.code,
        name: st.name,
        durationMinutes: st.durationMinutes,
        isAbsence: st.isAbsence,
        eligibleRoles: JSON.parse(st.eligibleRoles || '[]'),
      })),
      coverageRules: coverageRules.map((r) => ({
        shiftCode: r.shiftCode,
        dayType: r.dayType,
        minStaff: r.minStaff,
        idealStaff: r.idealStaff,
      })),
      // Metadata only (not used by solver core)
      workingDays,
      dates: dates.map((d) => ({ date: d, dayType: getDayType(d) })),
    }

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

    // Update schedule status
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
        ...(instructions ? { violations: `[instructions] ${instructions}` } : {}),
      },
    })

    return Response.json({
      status: 'FEASIBLE',
      count: solutionAssignments.length,
      durationMs,
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
