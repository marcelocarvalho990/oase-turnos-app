import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import MonthlyGridWrapper from '@/components/schedule/MonthlyGridWrapper'
import { getDaysInMonth } from '@/lib/date-utils'
import type { AssignmentMap, ShiftType } from '@/types'

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string; team?: string }>
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const now = new Date()
  const year = parseInt(sp.year ?? String(now.getFullYear()))
  const month = parseInt(sp.month ?? String(now.getMonth() + 1))
  const team = sp.team ?? '2.OG'

  // Get or create schedule
  let schedule = await prisma.schedule.findUnique({
    where: { year_month_team: { year, month, team } },
  })
  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: { year, month, team, status: 'DRAFT' },
    })
  }

  const [employees, assignments, shiftTypes, coverageRules] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true, team },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    prisma.assignment.findMany({
      where: { scheduleId: schedule.id },
    }),
    prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.coverageRule.findMany({ where: { team } }),
  ])

  // Build assignment map: { employeeId: { date: assignment } }
  const assignmentMap: AssignmentMap = {}
  for (const emp of employees) {
    assignmentMap[emp.id] = {}
  }
  for (const a of assignments) {
    if (!assignmentMap[a.employeeId]) assignmentMap[a.employeeId] = {}
    assignmentMap[a.employeeId][a.date] = {
      id: a.id,
      scheduleId: a.scheduleId,
      employeeId: a.employeeId,
      date: a.date,
      shiftCode: a.shiftCode,
      halfOf: (a.halfOf as 'FULL' | 'FIRST' | 'SECOND' | undefined) ?? 'FULL',
      isExternal: a.isExternal,
      origin: a.origin as 'AUTO' | 'MANUAL',
      notes: a.notes,
    }
  }

  const parsedShiftTypes: ShiftType[] = shiftTypes.map((st: typeof shiftTypes[0]) => ({
    ...st,
    eligibleRoles: JSON.parse(st.eligibleRoles || '[]'),
  }))

  const days = getDaysInMonth(year, month)

  return (
    <MonthlyGridWrapper
      schedule={{ id: schedule.id, year, month, team, status: schedule.status as 'DRAFT' | 'GENERATED' | 'PUBLISHED' | 'LOCKED' }}
      employees={employees.map(e => ({
        ...e,
        role: e.role as import('@/types').Role,
      }))}
      assignmentMap={assignmentMap}
      shiftTypes={parsedShiftTypes}
      coverageRules={coverageRules.map(r => ({
        ...r,
        dayType: r.dayType as import('@/types').DayType,
      }))}
      days={days}
      year={year}
      month={month}
      team={team}
    />
  )
}
