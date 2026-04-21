import { PrismaClient } from '@prisma/client'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaLibSql } = require('@prisma/adapter-libsql')
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaLibSql({ url: `file://${dbPath}` })
const prisma = new PrismaClient({ adapter })

const SHIFT_TYPES = [
  { code: 'F',   name: 'Frühdienst',                  startTime1: '07:00', endTime1: '12:30', startTime2: '13:06', endTime2: '16:00', durationMinutes: 504, bgColor: '#DBEAFE', textColor: '#1D4ED8', borderColor: '#93C5FD', color: '#2563EB', isAbsence: false, sortOrder: 1,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1","LERNENDE"]' },
  { code: 'F9',  name: 'Hotellerie',                   startTime1: '07:00', endTime1: '11:30', startTime2: '12:06', endTime2: '16:00', durationMinutes: 504, bgColor: '#E0E7FF', textColor: '#4338CA', borderColor: '#A5B4FC', color: '#4F46E5', isAbsence: false, sortOrder: 2,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1"]' },
  { code: 'G',   name: 'Geteilter Dienst',             startTime1: '07:00', endTime1: '11:30', startTime2: '17:06', endTime2: '21:00', durationMinutes: 504, bgColor: '#EDE9FE', textColor: '#6D28D9', borderColor: '#C4B5FD', color: '#7C3AED', isAbsence: false, sortOrder: 3,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2"]' },
  { code: 'M',   name: 'Mitteldienst',                 startTime1: '10:00', endTime1: '13:00', startTime2: '13:36', endTime2: '19:00', durationMinutes: 504, bgColor: '#FEF3C7', textColor: '#92400E', borderColor: '#FCD34D', color: '#D97706', isAbsence: false, sortOrder: 4,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1"]' },
  { code: 'S',   name: 'Spätdienst',                   startTime1: '12:10', endTime1: '15:00', startTime2: '15:36', endTime2: '21:10', durationMinutes: 504, bgColor: '#FEE2E2', textColor: '#991B1B', borderColor: '#FCA5A5', color: '#DC2626', isAbsence: false, sortOrder: 5,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1","LERNENDE"]' },
  { code: 'B',   name: 'Bürodienst',                   startTime1: '07:00', endTime1: '12:00', startTime2: '12:36', endTime2: '16:00', durationMinutes: 504, bgColor: '#D1FAE5', textColor: '#065F46', borderColor: '#6EE7B7', color: '#059669', isAbsence: false, sortOrder: 6,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3"]' },
  { code: 'I',   name: 'Individueller Dienst',         startTime1: '07:45', endTime1: '11:30', startTime2: '12:06', endTime2: '16:45', durationMinutes: 504, bgColor: '#F0FDF4', textColor: '#166534', borderColor: '#86EFAC', color: '#16A34A', isAbsence: false, sortOrder: 7,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1"]' },
  { code: 'Fr',  name: 'Tagesverantwortung Frühdienst',startTime1: '07:00', endTime1: '12:00', startTime2: '12:36', endTime2: '16:00', durationMinutes: 504, bgColor: '#CFFAFE', textColor: '#164E63', borderColor: '#67E8F9', color: '#0891B2', isAbsence: false, sortOrder: 8,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3"]' },
  { code: 'Stv', name: 'Tagesverantwortung Spätdienst',startTime1: '12:10', endTime1: '15:00', startTime2: '15:36', endTime2: '21:10', durationMinutes: 504, bgColor: '#FDF2F8', textColor: '#9D174D', borderColor: '#F9A8D4', color: '#DB2777', isAbsence: false, sortOrder: 9,  eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3"]' },
  { code: 'LB',  name: 'Lernbegleitung',               startTime1: '07:00', endTime1: '11:30', startTime2: '12:06', endTime2: '16:00', durationMinutes: 504, bgColor: '#F1F5F9', textColor: '#334155', borderColor: '#CBD5E1', color: '#64748B', isAbsence: false, sortOrder: 10, eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2"]' },
  { code: 'HF',  name: 'Halb Frühdienst',              startTime1: '07:00', endTime1: '11:30', durationMinutes: 270, bgColor: '#DBEAFE', textColor: '#1D4ED8', borderColor: '#93C5FD', color: '#2563EB', isAbsence: false, sortOrder: 11, eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1","LERNENDE"]' },
  { code: 'HS',  name: 'Halb Spätdienst',              startTime1: '16:00', endTime1: '21:10', durationMinutes: 310, bgColor: '#FEE2E2', textColor: '#991B1B', borderColor: '#FCA5A5', color: '#DC2626', isAbsence: false, sortOrder: 12, eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1","LERNENDE"]' },
  // Absences
  { code: 'Ferien',      name: 'Ferien',               startTime1: '00:00', endTime1: '00:00', durationMinutes: 0, bgColor: '#BBF7D0', textColor: '#14532D', borderColor: '#4ADE80', color: '#16A34A', isAbsence: true, isWorkTime: false, sortOrder: 20, eligibleRoles: '[]' },
  { code: 'Krank30',     name: 'Krank bis 30 Tage',    startTime1: '00:00', endTime1: '00:00', durationMinutes: 504, bgColor: '#FEE2E2', textColor: '#7F1D1D', borderColor: '#F87171', color: '#DC2626', isAbsence: true, isWorkTime: true, sortOrder: 21, eligibleRoles: '[]' },
  { code: 'Krank31',     name: 'Krank ab 31. Tag',     startTime1: '00:00', endTime1: '00:00', durationMinutes: 504, bgColor: '#FECACA', textColor: '#450A0A', borderColor: '#EF4444', color: '#B91C1C', isAbsence: true, isWorkTime: true, sortOrder: 22, eligibleRoles: '[]' },
  { code: 'Geburtstag',  name: 'Geburtstagsfrei',      startTime1: '00:00', endTime1: '00:00', durationMinutes: 504, bgColor: '#FDE68A', textColor: '#78350F', borderColor: '#FCD34D', color: '#F59E0B', isAbsence: true, isWorkTime: false, sortOrder: 23, eligibleRoles: '[]' },
  { code: 'WbIntern',    name: 'Weiterbildung intern', startTime1: '00:00', endTime1: '00:00', durationMinutes: 504, bgColor: '#E0F2FE', textColor: '#0C4A6E', borderColor: '#7DD3FC', color: '#0EA5E9', isAbsence: true, isWorkTime: true, sortOrder: 24, eligibleRoles: '[]' },
  { code: 'WbExtern',    name: 'Weiterbildung extern', startTime1: '00:00', endTime1: '00:00', durationMinutes: 504, bgColor: '#BAE6FD', textColor: '#0C4A6E', borderColor: '#38BDF8', color: '#0284C7', isAbsence: true, isWorkTime: true, sortOrder: 25, eligibleRoles: '[]' },
  { code: 'Berufsschule',name: 'Berufsschule',         startTime1: '00:00', endTime1: '00:00', durationMinutes: 504, bgColor: '#F0F9FF', textColor: '#0C4A6E', borderColor: '#BAE6FD', color: '#0369A1', isAbsence: true, isWorkTime: true, sortOrder: 26, eligibleRoles: '[]' },
  { code: 'UbKurs',      name: 'Überbetrieblicher Kurs',startTime1:'00:00', endTime1: '00:00', durationMinutes: 504, bgColor: '#E0F2FE', textColor: '#075985', borderColor: '#7DD3FC', color: '#0284C7', isAbsence: true, isWorkTime: true, sortOrder: 27, eligibleRoles: '[]' },
  { code: 'Wunschfrei',  name: 'Wunschfrei',           startTime1: '00:00', endTime1: '00:00', durationMinutes: 0, bgColor: '#F5F3FF', textColor: '#4C1D95', borderColor: '#DDD6FE', color: '#7C3AED', isAbsence: true, isWorkTime: false, sortOrder: 28, eligibleRoles: '[]' },
  { code: 'Frei',        name: 'Frei',                 startTime1: '00:00', endTime1: '00:00', durationMinutes: 0, bgColor: '#F3F4F6', textColor: '#374151', borderColor: '#D1D5DB', color: '#6B7280', isAbsence: true, isWorkTime: false, sortOrder: 29, eligibleRoles: '[]' },
  { code: 'Kompensation',name: 'Kompensation',         startTime1: '00:00', endTime1: '00:00', durationMinutes: 0, bgColor: '#FFFBEB', textColor: '#92400E', borderColor: '#FDE68A', color: '#F59E0B', isAbsence: true, isWorkTime: false, sortOrder: 30, eligibleRoles: '[]' },
  { code: 'Pikett',      name: 'Pikettdienst',         startTime1: '07:00', endTime1: '12:30', durationMinutes: 0, bgColor: '#F0F9FF', textColor: '#0C4A6E', borderColor: '#BAE6FD', color: '#0369A1', isAbsence: true, isWorkTime: false, sortOrder: 31, eligibleRoles: '[]' },
]

const EMPLOYEES = [
  { name: 'Singh Kuldip',                    shortName: 'Singh K.',      role: 'TEAMLEITUNG',    workPercentage: 100 },
  { name: 'Gomes Martins Stefan',            shortName: 'Gomes M. S.',   role: 'FUNKTIONSSTUFE_3', workPercentage: 100 },
  { name: 'Zimmermann Sandra',               shortName: 'Zimmermann S.', role: 'FUNKTIONSSTUFE_3', workPercentage: 80 },
  { name: 'Ciurariu Elisabeth Victoria',     shortName: 'Ciurariu E.',   role: 'FUNKTIONSSTUFE_3', workPercentage: 80 },
  { name: 'Ariyaratnam Rathissa',            shortName: 'Ariyaratnam R.',role: 'FUNKTIONSSTUFE_3', workPercentage: 100 },
  { name: 'Ferizaj Edita',                   shortName: 'Ferizaj E.',    role: 'FUNKTIONSSTUFE_2', workPercentage: 80 },
  { name: 'Recica Albesa',                   shortName: 'Recica A.',     role: 'FUNKTIONSSTUFE_2', workPercentage: 60 },
  { name: 'Sikder Saraf Bintey',             shortName: 'Sikder S.',     role: 'FUNKTIONSSTUFE_2', workPercentage: 80 },
  { name: 'Hartmann Doreen',                 shortName: 'Hartmann D.',   role: 'FUNKTIONSSTUFE_2', workPercentage: 80 },
  { name: 'Bajric Sanela',                   shortName: 'Bajric S.',     role: 'FUNKTIONSSTUFE_2', workPercentage: 80 },
  { name: 'Eises Constancia',                shortName: 'Eises C.',      role: 'FUNKTIONSSTUFE_2', workPercentage: 100 },
  { name: 'Buitrago Bartolo Angie Claribel', shortName: 'Buitrago A.',   role: 'FUNKTIONSSTUFE_2', workPercentage: 60 },
  { name: 'Asani Argetime',                  shortName: 'Asani A.',      role: 'FUNKTIONSSTUFE_1', workPercentage: 80 },
  { name: 'Chodon Jangchok',                 shortName: 'Chodon J.',     role: 'FUNKTIONSSTUFE_1', workPercentage: 80 },
  { name: 'Teixeira Ramos Lopes Ricardo',    shortName: 'Teixeira R.',   role: 'FUNKTIONSSTUFE_1', workPercentage: 80 },
  { name: 'Agoume Pulcherie Harmelle',       shortName: 'Agoume P.',     role: 'FUNKTIONSSTUFE_1', workPercentage: 60 },
  { name: 'Pavlovic Nikola',                 shortName: 'Pavlovic N.',   role: 'FUNKTIONSSTUFE_1', workPercentage: 80 },
  { name: 'Dogan Hevin Aleyna',              shortName: 'Dogan H.',      role: 'LERNENDE',        workPercentage: 100 },
  { name: 'Mustafic Layla',                  shortName: 'Mustafic L.',   role: 'LERNENDE',        workPercentage: 100 },
  { name: 'Koch Moritz',                     shortName: 'Koch M.',       role: 'LERNENDE',        workPercentage: 100 },
]

const COVERAGE_RULES = [
  { team: '2.OG', shiftCode: 'F',  dayType: 'WEEKDAY',  minStaff: 3, idealStaff: 4 },
  { team: '2.OG', shiftCode: 'S',  dayType: 'WEEKDAY',  minStaff: 2, idealStaff: 3 },
  { team: '2.OG', shiftCode: 'M',  dayType: 'WEEKDAY',  minStaff: 1, idealStaff: 2 },
  { team: '2.OG', shiftCode: 'F',  dayType: 'SATURDAY', minStaff: 2, idealStaff: 3 },
  { team: '2.OG', shiftCode: 'S',  dayType: 'SATURDAY', minStaff: 1, idealStaff: 2 },
  { team: '2.OG', shiftCode: 'F',  dayType: 'SUNDAY',   minStaff: 2, idealStaff: 2 },
  { team: '2.OG', shiftCode: 'S',  dayType: 'SUNDAY',   minStaff: 1, idealStaff: 2 },
]

function getRandomShift(day: number, dow: number): string {
  const isWeekend = dow === 0 || dow === 6
  const workShifts = ['F', 'F', 'F', 'S', 'S', 'M', 'G']
  const absences = ['Frei', 'Frei', 'Wunschfrei']
  // ~70% chance of working on weekdays, 50% on weekends
  const workProb = isWeekend ? 0.5 : 0.7
  if (Math.random() < workProb) {
    return workShifts[Math.floor(Math.random() * workShifts.length)]
  }
  return absences[Math.floor(Math.random() * absences.length)]
}

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.assignment.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.coverageRule.deleteMany()
  await prisma.shiftPreference.deleteMany()
  await prisma.absenceRequest.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.shiftType.deleteMany()
  await prisma.solverLog.deleteMany()

  // Create shift types
  for (const st of SHIFT_TYPES) {
    await prisma.shiftType.create({
      data: {
        code: st.code,
        name: st.name,
        startTime1: st.startTime1,
        endTime1: st.endTime1,
        startTime2: st.startTime2 ?? null,
        endTime2: st.endTime2 ?? null,
        durationMinutes: st.durationMinutes,
        color: st.color,
        bgColor: st.bgColor,
        textColor: st.textColor,
        borderColor: st.borderColor,
        isAbsence: st.isAbsence,
        isWorkTime: st.isWorkTime ?? true,
        sortOrder: st.sortOrder,
        eligibleRoles: st.eligibleRoles,
      },
    })
  }
  console.log(`Created ${SHIFT_TYPES.length} shift types`)

  // Create employees
  const createdEmployees = []
  for (const emp of EMPLOYEES) {
    const e = await prisma.employee.create({
      data: {
        name: emp.name,
        shortName: emp.shortName,
        workPercentage: emp.workPercentage,
        team: '2.OG',
        role: emp.role,
        canCoverOtherTeams: false,
        isActive: true,
      },
    })
    createdEmployees.push(e)
  }
  console.log(`Created ${createdEmployees.length} employees`)

  // Create coverage rules
  for (const rule of COVERAGE_RULES) {
    await prisma.coverageRule.create({ data: rule })
  }
  console.log(`Created ${COVERAGE_RULES.length} coverage rules`)

  // Create schedule for April 2026 with demo assignments
  const schedule = await prisma.schedule.create({
    data: {
      year: 2026,
      month: 4,
      team: '2.OG',
      status: 'DRAFT',
    },
  })

  // Seed some absence requests
  const zimmermann = createdEmployees.find(e => e.name.includes('Zimmermann'))
  const recica = createdEmployees.find(e => e.name.includes('Recica'))

  if (zimmermann) {
    await prisma.absenceRequest.create({
      data: {
        employeeId: zimmermann.id,
        startDate: '2026-04-14',
        endDate: '2026-04-20',
        type: 'Ferien',
        isHardBlock: true,
        notes: 'Genehmigter Urlaub',
      },
    })
  }

  if (recica) {
    await prisma.absenceRequest.create({
      data: {
        employeeId: recica.id,
        startDate: '2026-04-05',
        endDate: '2026-04-05',
        type: 'Wunschfrei',
        isHardBlock: false,
      },
    })
  }

  // Generate demo assignments for April 2026
  const daysInApril = 30
  const WORK_SHIFTS = ['F', 'F', 'F', 'S', 'S', 'M', 'G', 'F9', 'I']
  const assignments = []

  for (const emp of createdEmployees) {
    let shiftCount = 0
    const targetShifts = Math.round((emp.workPercentage / 100) * 22) // ~22 working days

    for (let d = 1; d <= daysInApril; d++) {
      const date = new Date(2026, 3, d) // April = month 3 (0-indexed)
      const dow = date.getDay()
      const dateStr = `2026-04-${String(d).padStart(2, '0')}`

      // Check if absence request blocks this day
      let isBlocked = false
      if (emp.name.includes('Zimmermann') && d >= 14 && d <= 20) {
        assignments.push({ scheduleId: schedule.id, employeeId: emp.id, date: dateStr, shiftCode: 'Ferien', isExternal: false, origin: 'MANUAL' })
        isBlocked = true
      }
      if (emp.name.includes('Recica') && d === 5) {
        assignments.push({ scheduleId: schedule.id, employeeId: emp.id, date: dateStr, shiftCode: 'Wunschfrei', isExternal: false, origin: 'MANUAL' })
        isBlocked = true
      }

      if (isBlocked) continue

      const isWeekend = dow === 0 || dow === 6
      const workProb = isWeekend ? 0.45 : (shiftCount < targetShifts ? 0.75 : 0.2)

      if (Math.random() < workProb) {
        const shift = WORK_SHIFTS[Math.floor(Math.random() * WORK_SHIFTS.length)]
        // Filter by eligibility
        const eligibleForRole = ['F', 'S', 'M', 'F9', 'I']
        const shiftCode = eligibleForRole.includes(shift) ? shift : 'F'
        assignments.push({ scheduleId: schedule.id, employeeId: emp.id, date: dateStr, shiftCode, isExternal: false, origin: 'AUTO' })
        shiftCount++
      }
    }
  }

  // Bulk create assignments (no skipDuplicates in Prisma 7 libsql driver)
  await prisma.assignment.createMany({ data: assignments })
  console.log(`Created ${assignments.length} demo assignments`)
  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
