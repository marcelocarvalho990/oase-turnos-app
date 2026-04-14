import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import EmployeeProfileClient from './EmployeeProfileClient'

const ROLE_LABELS: Record<string, string> = {
  TEAMLEITUNG: 'Teamleitung (HF)',
  FUNKTIONSSTUFE_3: 'Funktionsstufe 3 (FAGE)',
  FUNKTIONSSTUFE_2: 'Funktionsstufe 2 (FAGE)',
  FUNKTIONSSTUFE_1: 'Funktionsstufe 1 (SRK)',
  LERNENDE: 'Lernende (SRK)',
}

export default async function EmployeeProfilePage() {
  const session = await requireAuth('EMPLOYEE')

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId! },
    select: {
      id: true,
      name: true,
      shortName: true,
      role: true,
      workPercentage: true,
      team: true,
      canCoverOtherTeams: true,
    },
  })

  if (!employee) return <div>Erro: colaborador não encontrado.</div>

  // Get distinct teams for "other floors" display
  const allTeams = await prisma.employee.findMany({
    where: { isActive: true },
    select: { team: true },
    distinct: ['team'],
    orderBy: { team: 'asc' },
  })

  const otherTeams = allTeams.map(t => t.team).filter(t => t !== employee.team)

  return (
    <EmployeeProfileClient
      employee={{ ...employee, roleLabel: ROLE_LABELS[employee.role] ?? employee.role }}
      otherTeams={otherTeams}
    />
  )
}
