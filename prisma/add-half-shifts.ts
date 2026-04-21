// One-time script to add HF and HS half-shift types to the existing DB
import { PrismaClient } from '@prisma/client'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaLibSql } = require('@prisma/adapter-libsql')
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaLibSql({ url: `file://${dbPath}` })
const prisma = new PrismaClient({ adapter })

const HALF_SHIFTS = [
  {
    code: 'HF',
    name: 'Halb Frühdienst',
    startTime1: '07:00',
    endTime1: '11:30',
    startTime2: null,
    endTime2: null,
    durationMinutes: 270,
    color: '#2563EB',
    bgColor: '#DBEAFE',
    textColor: '#1D4ED8',
    borderColor: '#93C5FD',
    isAbsence: false,
    isWorkTime: true,
    sortOrder: 11,
    eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1","LERNENDE"]',
  },
  {
    code: 'HS',
    name: 'Halb Spätdienst',
    startTime1: '16:00',
    endTime1: '21:10',
    startTime2: null,
    endTime2: null,
    durationMinutes: 310,
    color: '#DC2626',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
    borderColor: '#FCA5A5',
    isAbsence: false,
    isWorkTime: true,
    sortOrder: 12,
    eligibleRoles: '["TEAMLEITUNG","FUNKTIONSSTUFE_3","FUNKTIONSSTUFE_2","FUNKTIONSSTUFE_1","LERNENDE"]',
  },
]

async function main() {
  for (const st of HALF_SHIFTS) {
    await prisma.shiftType.upsert({
      where: { code: st.code },
      create: st,
      update: {
        name: st.name,
        startTime1: st.startTime1,
        endTime1: st.endTime1,
        durationMinutes: st.durationMinutes,
        color: st.color,
        bgColor: st.bgColor,
        textColor: st.textColor,
        borderColor: st.borderColor,
        isAbsence: st.isAbsence,
        isWorkTime: st.isWorkTime,
        sortOrder: st.sortOrder,
        eligibleRoles: st.eligibleRoles,
      },
    })
    console.log(`Upserted: ${st.code} (${st.name})`)
  }
  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
