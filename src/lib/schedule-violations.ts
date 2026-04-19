import type { Employee, AssignmentMap, DayInfo, Role } from '@/types'

const HF_ROLES: Role[] = ['TEAMLEITUNG', 'FUNKTIONSSTUFE_3']
const FAGE_ROLES: Role[] = ['FUNKTIONSSTUFE_2']
const SRK_ROLES: Role[] = ['FUNKTIONSSTUFE_1']
const WORK_CODES = new Set(['F', 'F9', 'S', 'M'])
const MAX_CONSECUTIVE = 5

type Lang = 'pt' | 'de' | 'en' | 'fr' | 'it'

const VM: Record<Lang, {
  fNoCoverage: string
  fStaff: (n: number) => string
  fNoLeader: string
  sNoCoverage: string
  sNoFAGE: string
  sNoSRK: string
  sLernende: string
  sfConsec: (names: string) => string
  consec: (name: string, n: number) => string
}> = {
  de: {
    fNoCoverage: 'F: keine Abdeckung',
    fStaff: (n) => `F: ${n}/4 Mitarbeiter`,
    fNoLeader: 'F: kein HF / FAGE',
    sNoCoverage: 'S: keine Abdeckung',
    sNoFAGE: 'S: kein FAGE',
    sNoSRK: 'S: kein SRK',
    sLernende: 'S: Lernende im S-Dienst',
    sfConsec: (names) => `S→F: ${names}`,
    consec: (name, n) => `${name}: ${n} aufeinanderfolgende Tage`,
  },
  pt: {
    fNoCoverage: 'F: sem cobertura',
    fStaff: (n) => `F: ${n}/4 pessoas`,
    fNoLeader: 'F: sem HF nem FAGE',
    sNoCoverage: 'S: sem cobertura',
    sNoFAGE: 'S: sem FAGE',
    sNoSRK: 'S: sem SRK',
    sLernende: 'S: aprendiz no turno S',
    sfConsec: (names) => `S→F: ${names}`,
    consec: (name, n) => `${name}: ${n} dias consecutivos`,
  },
  en: {
    fNoCoverage: 'F: no coverage',
    fStaff: (n) => `F: ${n}/4 staff`,
    fNoLeader: 'F: no HF or FAGE',
    sNoCoverage: 'S: no coverage',
    sNoFAGE: 'S: no FAGE',
    sNoSRK: 'S: no SRK',
    sLernende: 'S: trainee on S shift',
    sfConsec: (names) => `S→F: ${names}`,
    consec: (name, n) => `${name}: ${n} consecutive days`,
  },
  fr: {
    fNoCoverage: 'F: pas de couverture',
    fStaff: (n) => `F: ${n}/4 agents`,
    fNoLeader: 'F: pas de HF ni FAGE',
    sNoCoverage: 'S: pas de couverture',
    sNoFAGE: 'S: pas de FAGE',
    sNoSRK: 'S: pas de SRK',
    sLernende: 'S: apprenti au poste S',
    sfConsec: (names) => `S→F: ${names}`,
    consec: (name, n) => `${name}: ${n} jours consécutifs`,
  },
  it: {
    fNoCoverage: 'F: nessuna copertura',
    fStaff: (n) => `F: ${n}/4 persone`,
    fNoLeader: 'F: nessun HF / FAGE',
    sNoCoverage: 'S: nessuna copertura',
    sNoFAGE: 'S: nessun FAGE',
    sNoSRK: 'S: nessun SRK',
    sLernende: 'S: apprendista nel turno S',
    sfConsec: (names) => `S→F: ${names}`,
    consec: (name, n) => `${name}: ${n} giorni consecutivi`,
  },
}

export function computeDayViolations(
  day: DayInfo,
  employees: Employee[],
  assignmentMap: AssignmentMap,
  days: DayInfo[],
  lang: Lang = 'de',
): string[] {
  const m = VM[lang] ?? VM['de']
  const issues: string[] = []

  const workersOn = (code: string) =>
    employees.filter(e => assignmentMap[e.id]?.[day.date]?.shiftCode === code)

  // ── F shift ──
  const fWorkers = workersOn('F')
  const fHF    = fWorkers.filter(e => HF_ROLES.includes(e.role)).length
  const fFAGE  = fWorkers.filter(e => FAGE_ROLES.includes(e.role)).length
  const fTotal = fWorkers.length

  if (fTotal === 0) {
    issues.push(m.fNoCoverage)
  } else {
    if (fTotal < 4) issues.push(m.fStaff(fTotal))
    if (fHF === 0 && fFAGE === 0) issues.push(m.fNoLeader)
  }

  // ── S shift ──
  const sWorkers  = workersOn('S')
  const sFAGE     = sWorkers.filter(e => HF_ROLES.includes(e.role) || FAGE_ROLES.includes(e.role)).length
  const sSRK      = sWorkers.filter(e => SRK_ROLES.includes(e.role)).length
  const sLERNENDE = sWorkers.filter(e => e.role === 'LERNENDE').length
  const sTotal    = sWorkers.length

  if (sTotal === 0) {
    issues.push(m.sNoCoverage)
  } else {
    if (sFAGE === 0) issues.push(m.sNoFAGE)
    if (sSRK === 0)  issues.push(m.sNoSRK)
    if (sLERNENDE > 0) issues.push(m.sLernende)
  }

  // ── S→F consecutive ──
  const dayIdx = days.findIndex(d => d.date === day.date)
  if (dayIdx > 0) {
    const prevDate = days[dayIdx - 1].date
    const prevSIds = new Set(
      employees
        .filter(e => assignmentMap[e.id]?.[prevDate]?.shiftCode === 'S')
        .map(e => e.id),
    )
    const sfNames = fWorkers
      .filter(e => prevSIds.has(e.id))
      .map(e => e.shortName)
    if (sfNames.length > 0) issues.push(m.sfConsec(sfNames.join(', ')))
  }

  // ── Consecutive working days (> MAX_CONSECUTIVE) ──
  if (dayIdx >= MAX_CONSECUTIVE) {
    for (const emp of employees) {
      const todayCode = assignmentMap[emp.id]?.[day.date]?.shiftCode
      if (!todayCode || !WORK_CODES.has(todayCode)) continue

      let streak = 1
      for (let i = dayIdx - 1; i >= 0; i--) {
        const code = assignmentMap[emp.id]?.[days[i].date]?.shiftCode
        if (code && WORK_CODES.has(code)) streak++
        else break
      }
      if (streak === MAX_CONSECUTIVE + 1) {
        issues.push(m.consec(emp.shortName, streak))
      }
    }
  }

  return issues
}

export function countTotalViolations(
  days: DayInfo[],
  employees: Employee[],
  assignmentMap: AssignmentMap,
): number {
  return days.reduce(
    (total, day) => total + computeDayViolations(day, employees, assignmentMap, days).length,
    0,
  )
}
