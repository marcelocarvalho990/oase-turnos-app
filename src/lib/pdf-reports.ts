import type { Employee, ShiftType, AssignmentMap, DayInfo } from '@/types'
import { ROLE_ORDER, ROLE_LABELS } from '@/types'

const BREAK_DEDUCTION_MIN = 36

// ─── helpers ──────────────────────────────────────────────────────────────────

function minutesToHours(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

const LOCALES: Record<string, string> = {
  de: 'de-DE', pt: 'pt-PT', en: 'en-GB', fr: 'fr-FR', it: 'it-IT',
}

const PDF_TX: Record<string, {
  schedule: string; hours: string
  employee: string; role: string; shift: string; time: string
  workdays: string; hoursCol: string; shifts: string; total: string
}> = {
  de: { schedule: 'Dienstplan', hours: 'Stundenbericht',    employee: 'Mitarbeiter', role: 'Funktion',      shift: 'Schicht',   time: 'Zeit',      workdays: 'Arbeitstage', hoursCol: 'Stunden', shifts: 'Schichten', total: 'GESAMT'  },
  pt: { schedule: 'Escala',     hours: 'Relatório de Horas', employee: 'Colaborador', role: 'Função',        shift: 'Turno',     time: 'Horário',   workdays: 'Dias',        hoursCol: 'Horas',   shifts: 'Turnos',   total: 'TOTAL'   },
  en: { schedule: 'Schedule',   hours: 'Hours Report',       employee: 'Employee',    role: 'Role',          shift: 'Shift',     time: 'Time',      workdays: 'Work days',   hoursCol: 'Hours',   shifts: 'Shifts',   total: 'TOTAL'   },
  fr: { schedule: 'Planning',   hours: 'Rapport d\'heures',  employee: 'Collaborateur', role: 'Fonction',    shift: 'Poste',     time: 'Horaire',   workdays: 'Jours',       hoursCol: 'Heures',  shifts: 'Postes',   total: 'TOTAL'   },
  it: { schedule: 'Turni',      hours: 'Report Ore',         employee: 'Collaboratore', role: 'Funzione',    shift: 'Turno',     time: 'Orario',    workdays: 'Giorni',      hoursCol: 'Ore',     shifts: 'Turni',    total: 'TOTALE'  },
}

function periodLabel(days: DayInfo[], year: number, month: number, locale: string): string {
  if (days.length > 7)
    return new Date(year, month - 1, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
  if (days.length === 1)
    return new Date(days[0].date + 'T00:00').toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const first = new Date(days[0].date + 'T00:00')
  const last  = new Date(days[days.length - 1].date + 'T00:00')
  return `${first.getDate()} – ${last.toLocaleString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length < 6) return [220, 220, 220]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function lum(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

const NAVY: [number, number, number]  = [0, 58, 93]
const WHITE: [number, number, number] = [255, 255, 255]
const LIGHT: [number, number, number] = [230, 237, 244]
const GREY:  [number, number, number] = [100, 100, 100]

const ABSENCE_ICONS: Record<string, string> = {
  Ferien:     '🌴',
  Krank30:    '🤒',
  Krank31:    '🏥',
  Geburtstag: '🎂',
  WbExtern:   '🎓',
}

const ABSENCE_NAMES: Record<string, string> = {
  Ferien:     'Ferien',
  Krank30:    'Krank bis 30 Tage',
  Krank31:    'Krank ab 31. Tag',
  Geburtstag: 'Geburtstagsfrei',
  WbExtern:   'Weiterbildung extern',
}

const emojiUrlCache = new Map<string, string>()
function emojiToDataUrl(emoji: string, sizePx = 48): string {
  const key = `${emoji}_${sizePx}`
  if (emojiUrlCache.has(key)) return emojiUrlCache.get(key)!
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = sizePx; canvas.height = sizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.font = `${Math.round(sizePx * 0.72)}px serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(emoji, sizePx / 2, sizePx / 2)
  const url = canvas.toDataURL('image/png')
  emojiUrlCache.set(key, url)
  return url
}

let xDataUrl: string | null = null
function xMarkToDataUrl(sizePx = 48): string {
  if (xDataUrl) return xDataUrl
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = sizePx; canvas.height = sizePx
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const r = sizePx * 0.32
  const cx = sizePx / 2, cy = sizePx / 2
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = sizePx * 0.13
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke()
  xDataUrl = canvas.toDataURL('image/png')
  return xDataUrl
}

// ─── Schedule Grid PDF ────────────────────────────────────────────────────────

export async function downloadSchedulePDF(opts: {
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  days: DayInfo[]
  year: number
  month: number
  team: string
  lang: string
  view: 'month' | 'week' | 'day'
}) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const { employees, assignmentMap, shiftTypes, days, year, month, team, lang, view } = opts
  const locale = LOCALES[lang] ?? LOCALES['de']
  const tx = PDF_TX[lang] ?? PDF_TX['de']
  const shiftMap = Object.fromEntries(shiftTypes.map(s => [s.code, s]))
  const period = periodLabel(days, year, month, locale)
  const title = `${tx.schedule} – ${period} – ${team}`

  const sorted = [...employees].sort((a, b) => {
    const ri = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    return ri !== 0 ? ri : a.name.localeCompare(b.name)
  })

  // ── DAILY VIEW ────────────────────────────────────────────────────────────
  if (view === 'day') {
    const day = days[0]
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...NAVY)
    doc.text(title, 14, 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GREY)
    doc.text(new Date().toLocaleString(locale), 14, 20)

    const head = [[
      { content: tx.employee, styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const } },
      { content: tx.role,     styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const } },
      { content: tx.shift,    styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const } },
      { content: tx.time,     styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const } },
    ]]

    const body: object[][] = []
    let currentRole: string | null = null

    for (const emp of sorted) {
      if (emp.role !== currentRole) {
        currentRole = emp.role
        body.push([{
          content: ROLE_LABELS[emp.role] ?? emp.role,
          colSpan: 4,
          styles: { fillColor: LIGHT, textColor: NAVY, fontStyle: 'bold' as const, fontSize: 7 },
        }])
      }
      const a = day ? assignmentMap[emp.id]?.[day.date] : undefined
      const s = a ? shiftMap[a.shiftCode] : undefined
      const bg = s ? hexToRgb(s.bgColor) : ([245, 245, 245] as [number, number, number])
      const tc = s ? (lum(...bg) > 160 ? [30, 30, 30] : WHITE) as [number, number, number] : (GREY as [number, number, number])
      const time = s ? `${s.startTime1}–${s.endTime1}` : ''

      body.push([
        { content: emp.name, styles: { fontStyle: 'bold' as const, fontSize: 8 } },
        { content: ROLE_LABELS[emp.role] ?? emp.role, styles: { fontSize: 7, textColor: GREY } },
        { content: s ? s.code : '–', styles: { fillColor: bg, textColor: tc, fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 8 } },
        { content: time || '–', styles: { fontSize: 8, halign: 'center' as const } },
      ])
    }

    autoTable(doc, {
      head, body,
      startY: 26,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [210, 215, 220], lineWidth: 0.2 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 40 }, 2: { cellWidth: 20 }, 3: { cellWidth: 30 } },
      theme: 'grid',
    })

    doc.save(`schedule_${year}_${String(month).padStart(2, '0')}_${team}_day.pdf`)
    return
  }

  // ── MONTHLY / WEEKLY VIEW ─────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.text(title, 14, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GREY)
  doc.text(new Date().toLocaleString(locale), 14, 20)

  // Shift legend — work shifts
  const workShifts = shiftTypes.filter(s => !s.isAbsence && s.isWorkTime)
  let lx = 14; let ly = 25
  doc.setFontSize(6.5)
  for (const s of workShifts) {
    const [r, g, b] = hexToRgb(s.bgColor)
    doc.setFillColor(r, g, b)
    doc.roundedRect(lx, ly, 2.5, 2.5, 0.4, 0.4, 'F')
    doc.setTextColor(60, 60, 60)
    const legendLabel = `${s.code} ${s.name}`
    doc.text(legendLabel, lx + 3.5, ly + 2)
    lx += doc.getTextWidth(legendLabel) + 9
    if (lx > pageW - 30) { lx = 14; ly += 5 }
  }

  // Shift legend — absence icons
  lx = 14; ly += 5
  for (const [code, icon] of Object.entries(ABSENCE_ICONS)) {
    const imgData = emojiToDataUrl(icon, 48)
    const sz = 3.2
    if (imgData) doc.addImage(imgData, 'PNG', lx, ly - sz * 0.82, sz, sz)
    doc.setTextColor(60, 60, 60)
    const label = ABSENCE_NAMES[code] ?? code
    doc.text(label, lx + sz + 1, ly)
    lx += doc.getTextWidth(label) + sz + 8
    if (lx > pageW - 30) { lx = 14; ly += 5 }
  }
  // Frei — grey dot
  doc.setFillColor(200, 210, 218)
  doc.circle(lx + 1.6, ly - 0.5, 1.2, 'F')
  doc.setTextColor(60, 60, 60)
  doc.text('Frei', lx + 4.2, ly)
  lx += doc.getTextWidth('Frei') + 8
  if (lx > pageW - 30) { lx = 14; ly += 5 }
  // Wunschfrei — ✕ (canvas PNG)
  {
    const sz = 3.2
    const imgData = xMarkToDataUrl(48)
    if (imgData) doc.addImage(imgData, 'PNG', lx, ly - sz * 0.82, sz, sz)
  }
  doc.setTextColor(60, 60, 60)
  doc.text('Wunschfrei', lx + 4.2, ly)

  const tableTop = ly + 5

  const nameColW = view === 'week' ? 44 : 36
  const usableW  = pageW - 14 - 14 - nameColW
  const dayColW  = Math.min(view === 'week' ? 28 : 8, usableW / days.length)

  const head = [[
    { content: tx.employee,
      styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const, fontSize: 7 } },
    ...days.map(d => {
      const dt = new Date(d.date + 'T00:00')
      const isWE  = d.dayType === 'SATURDAY' || d.dayType === 'SUNDAY' || d.dayType === 'HOLIDAY'
      const label = view === 'week'
        ? dt.toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
        : String(dt.getDate())
      return {
        content: label,
        styles: {
          fillColor: (isWE ? [198, 218, 232] : NAVY) as [number, number, number],
          textColor: WHITE,
          fontStyle: 'bold' as const,
          halign: 'center' as const,
          fontSize: view === 'week' ? 6.5 : 7,
        },
      }
    }),
  ]]

  // TV badge per day
  const HF_ROLES  = new Set(['TEAMLEITUNG', 'FUNKTIONSSTUFE_3'])
  const FAGE_ROLES = new Set(['FUNKTIONSSTUFE_2'])

  const ftvPerDay = new Map<string, string>()
  const stvPerDay = new Map<string, string>()

  for (const day of days) {
    for (const emp of sorted) {
      const a = assignmentMap[emp.id]?.[day.date]
      if (!ftvPerDay.has(day.date) && a?.shiftCode === 'F' && (HF_ROLES.has(emp.role) || FAGE_ROLES.has(emp.role))) {
        ftvPerDay.set(day.date, emp.id)
      }
      if (!stvPerDay.has(day.date) && a?.shiftCode === 'S' && (HF_ROLES.has(emp.role) || FAGE_ROLES.has(emp.role))) {
        stvPerDay.set(day.date, emp.id)
      }
    }
  }

  // Track which cells are empty (for dot drawing)
  const emptyCells = new Set<string>() // "rowIdx:colIdx"
  // Track absence icon cells: "rowIdx:colIdx" → { emoji, bg }
  const emojiCells = new Map<string, { emoji: string; bg: [number, number, number] }>()
  // Track Wunschfrei cells (✕ symbol)
  const xCells = new Set<string>()

  const bodyRowToEmployee = new Map<number, Employee>()
  let bodyRowIdx = 0
  const body: object[][] = []
  let currentRole: string | null = null

  for (const emp of sorted) {
    if (emp.role !== currentRole) {
      currentRole = emp.role
      body.push([{
        content: ROLE_LABELS[emp.role] ?? emp.role,
        colSpan: 1 + days.length,
        styles: { fillColor: LIGHT, textColor: NAVY, fontStyle: 'bold' as const, fontSize: 6.5 },
      }])
      bodyRowIdx++
    }

    bodyRowToEmployee.set(bodyRowIdx, emp)

    const empAssign = assignmentMap[emp.id] ?? {}
    const cells: object[] = [
      { content: emp.name, styles: { fontStyle: 'bold' as const, fontSize: 7 } },
    ]

    for (let di = 0; di < days.length; di++) {
      const day = days[di]
      const a = empAssign[day.date]
      if (!a) {
        emptyCells.add(`${bodyRowIdx}:${di + 1}`)
        cells.push({ content: '', styles: { fillColor: [252, 252, 252] as [number, number, number] } })
        continue
      }
      // Frei → grey dot (treat as empty)
      if (a.shiftCode === 'Frei') {
        emptyCells.add(`${bodyRowIdx}:${di + 1}`)
        cells.push({ content: '', styles: { fillColor: [252, 252, 252] as [number, number, number] } })
        continue
      }
      // Wunschfrei → ✕ symbol
      if (a.shiftCode === 'Wunschfrei') {
        xCells.add(`${bodyRowIdx}:${di + 1}`)
        cells.push({ content: '', styles: { fillColor: [252, 252, 252] as [number, number, number] } })
        continue
      }

      const s = shiftMap[a.shiftCode]
      if (!s) {
        cells.push({ content: a.shiftCode, styles: { halign: 'center' as const, fontSize: 6 } })
        continue
      }
      const bg = hexToRgb(s.bgColor)
      const tc = (lum(...bg) > 160 ? [30, 30, 30] : WHITE) as [number, number, number]

      // Absence icon cell — leave content empty, draw emoji in didDrawCell
      const emoji = ABSENCE_ICONS[a.shiftCode]
      if (emoji) {
        emojiCells.set(`${bodyRowIdx}:${di + 1}`, { emoji, bg })
        cells.push({ content: '', styles: { fillColor: bg } })
        continue
      }

      const label = view === 'week' ? `${s.code}\n${s.startTime1}–${s.endTime1}` : s.code
      cells.push({
        content: label,
        styles: {
          fillColor: bg,
          textColor: tc,
          fontStyle: 'bold' as const,
          halign: 'center' as const,
          fontSize: view === 'week' ? 6 : 6.5,
        },
      })
    }
    body.push(cells)
    bodyRowIdx++
  }

  autoTable(doc, {
    head, body,
    startY: tableTop,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: view === 'week' ? 2 : 1, lineColor: [210, 215, 220], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: nameColW },
      ...Object.fromEntries(days.map((_, i) => [i + 1, { cellWidth: dayColW, halign: 'center' as const }])),
    },
    theme: 'grid',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawCell: (data: any) => {
      if (data.section !== 'body') return
      if (data.column.index === 0) return

      const rowIdx = data.row.index
      const colIdx = data.column.index
      const { x, y, width, height } = data.cell as { x: number; y: number; width: number; height: number }

      // Draw gray dot for empty / Frei cells
      if (emptyCells.has(`${rowIdx}:${colIdx}`)) {
        const cx = x + width / 2
        const cy = y + height / 2
        doc.setFillColor(200, 210, 218)
        doc.circle(cx, cy, 0.8, 'F')
        return
      }

      // Draw ✕ for Wunschfrei cells (canvas PNG, same approach as emojis)
      if (xCells.has(`${rowIdx}:${colIdx}`)) {
        const sz = Math.min(width * 0.55, height * 0.65)
        const imgData = xMarkToDataUrl(48)
        if (imgData) doc.addImage(imgData, 'PNG', x + (width - sz) / 2, y + (height - sz) / 2, sz, sz)
        return
      }

      // Draw emoji for absence icon cells
      const emojiInfo = emojiCells.get(`${rowIdx}:${colIdx}`)
      if (emojiInfo) {
        const sz = Math.min(width * 0.68, height * 0.78)
        const imgData = emojiToDataUrl(emojiInfo.emoji, 48)
        if (imgData) doc.addImage(imgData, 'PNG', x + (width - sz) / 2, y + (height - sz) / 2, sz, sz)
        return
      }

      // TV badge
      const cellEmp = bodyRowToEmployee.get(rowIdx)
      if (!cellEmp) return

      const dayIdx = colIdx - 1
      if (dayIdx < 0 || dayIdx >= days.length) return

      const day = days[dayIdx]
      const isFTV = ftvPerDay.get(day.date) === cellEmp.id
      const isSTV = stvPerDay.get(day.date) === cellEmp.id
      if (!isFTV && !isSTV) return

      const bW = 3.8; const bH = 2.0
      const bx = x + width - bW - 0.3
      const by = y + 0.3

      const [cr, cg, cb] = isFTV ? [0, 58, 93] : [107, 33, 168]
      doc.setFillColor(cr, cg, cb)
      doc.roundedRect(bx, by, bW, bH, 0.3, 0.3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(3)
      doc.setFont('helvetica', 'bold')
      doc.text('TV', bx + bW / 2, by + bH * 0.72, { align: 'center' as const })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
    },
  })

  const suffix = view === 'week' ? 'week' : 'month'
  doc.save(`schedule_${year}_${String(month).padStart(2, '0')}_${team}_${suffix}.pdf`)
}

// ─── Hours Report PDF ─────────────────────────────────────────────────────────

export async function downloadHoursPDF(opts: {
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  days: DayInfo[]
  year: number
  month: number
  team: string
  lang: string
}) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const { employees, assignmentMap, shiftTypes, days, year, month, team, lang } = opts
  const locale = LOCALES[lang] ?? LOCALES['de']
  const tx = PDF_TX[lang] ?? PDF_TX['de']
  const shiftMap = Object.fromEntries(shiftTypes.map(s => [s.code, s]))
  const period = periodLabel(days, year, month, locale)
  const title = `${tx.hours} – ${period} – ${team}`

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  doc.text(title, 14, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GREY)
  doc.text(new Date().toLocaleString(locale), 14, 22)

  const sorted = [...employees].sort((a, b) => {
    const ri = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    return ri !== 0 ? ri : a.name.localeCompare(b.name)
  })

  const colH = (s: string, extra: object = {}) => ({
    content: s,
    styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const, ...extra },
  })

  const head = [[
    colH(tx.employee),
    colH(tx.role),
    colH(tx.workdays, { halign: 'center' }),
    colH(tx.hoursCol, { halign: 'center' }),
    colH('%', { halign: 'center' }),
    colH(tx.shifts),
  ]]

  let totalMins = 0
  const body: object[][] = []
  let currentRole: string | null = null

  for (const emp of sorted) {
    if (emp.role !== currentRole) {
      currentRole = emp.role
      body.push([{
        content: ROLE_LABELS[emp.role] ?? emp.role,
        colSpan: 6,
        styles: { fillColor: LIGHT, textColor: NAVY, fontStyle: 'bold' as const, fontSize: 7.5 },
      }])
    }

    const empAssign = assignmentMap[emp.id] ?? {}
    let workDays = 0; let workMins = 0
    const codeCounts: Record<string, number> = {}

    for (const day of days) {
      const a = empAssign[day.date]
      if (!a) continue
      const s = shiftMap[a.shiftCode]
      if (!s?.isWorkTime) continue
      workDays++
      const breakMin = BREAK_DEDUCTION_MIN
      workMins += s.durationMinutes - breakMin
      codeCounts[a.shiftCode] = (codeCounts[a.shiftCode] ?? 0) + 1
    }

    totalMins += workMins
    const detail = Object.entries(codeCounts).map(([c, n]) => `${c}×${n}`).join('  ')

    body.push([
      { content: emp.name, styles: { fontStyle: 'bold' as const, fontSize: 8 } },
      { content: ROLE_LABELS[emp.role] ?? emp.role, styles: { fontSize: 7, textColor: GREY } },
      { content: String(workDays), styles: { halign: 'center' as const, fontSize: 8 } },
      { content: minutesToHours(workMins), styles: { halign: 'center' as const, fontStyle: 'bold' as const, textColor: NAVY, fontSize: 8 } },
      { content: `${emp.workPercentage}%`, styles: { halign: 'center' as const, fontSize: 8 } },
      { content: detail || '–', styles: { fontSize: 7, textColor: GREY } },
    ])
  }

  body.push([
    { content: tx.total, colSpan: 3,
      styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const, halign: 'right' as const, fontSize: 9 } },
    { content: minutesToHours(totalMins),
      styles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold' as const, halign: 'center' as const, fontSize: 9 } },
    { content: '', colSpan: 2, styles: { fillColor: NAVY } },
  ])

  autoTable(doc, {
    head, body,
    startY: 28,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [210, 215, 220], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 36 }, 2: { cellWidth: 18 }, 3: { cellWidth: 18 }, 4: { cellWidth: 16 }, 5: { cellWidth: 'auto' } },
    theme: 'grid',
  })

  // Absence icon legend below the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legendY: number = (doc as any).lastAutoTable?.finalY ?? 200
  let llx = 14; let lly = legendY + 8
  doc.setFontSize(6.5)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'bold')
  doc.text('Legende:', llx, lly)
  llx += 14
  doc.setFont('helvetica', 'normal')
  for (const [code, icon] of Object.entries(ABSENCE_ICONS)) {
    const imgData = emojiToDataUrl(icon, 48)
    const sz = 3.2
    if (imgData) doc.addImage(imgData, 'PNG', llx, lly - sz * 0.82, sz, sz)
    doc.setTextColor(60, 60, 60)
    const label = ABSENCE_NAMES[code] ?? code
    doc.text(label, llx + sz + 1, lly)
    llx += doc.getTextWidth(label) + sz + 8
    if (llx > 180) { llx = 28; lly += 5 }
  }
  // Frei — grey dot
  doc.setFillColor(200, 210, 218)
  doc.circle(llx + 1.6, lly - 0.5, 1.2, 'F')
  doc.setTextColor(60, 60, 60)
  doc.text('Frei', llx + 4.2, lly)
  llx += doc.getTextWidth('Frei') + 8
  if (llx > 180) { llx = 28; lly += 5 }
  // Wunschfrei — ✕ (canvas PNG)
  {
    const sz = 3.2
    const imgData = xMarkToDataUrl(48)
    if (imgData) doc.addImage(imgData, 'PNG', llx, lly - sz * 0.82, sz, sz)
  }
  doc.setTextColor(60, 60, 60)
  doc.text('Wunschfrei', llx + 4.2, lly)

  doc.save(`hours_${year}_${String(month).padStart(2, '0')}_${team}.pdf`)
}
