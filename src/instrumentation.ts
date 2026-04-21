export async function register() {
  // Only run on the server (not in the edge runtime)
  if (process.env.NEXT_RUNTIME === 'edge') return

  try {
    const { prisma } = await import('@/lib/prisma')

    const REQUIRED_SHIFT_TYPES = [
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

    for (const st of REQUIRED_SHIFT_TYPES) {
      await prisma.shiftType.upsert({
        where: { code: st.code },
        create: st,
        update: {
          name: st.name,
          startTime1: st.startTime1,
          endTime1: st.endTime1,
          durationMinutes: st.durationMinutes,
          bgColor: st.bgColor,
          textColor: st.textColor,
          borderColor: st.borderColor,
          sortOrder: st.sortOrder,
        },
      })
    }
  } catch (err) {
    console.error('[instrumentation] Failed to upsert required shift types:', err)
  }
}
