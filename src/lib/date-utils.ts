import { DayInfo, DayType } from '@/types'

export function getDaysInMonth(year: number, month: number): DayInfo[] {
  const days: DayInfo[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const WEEKDAY_LABELS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayOfWeek = date.getDay() // 0=Sun, 6=Sat
    const weekdayLabel = WEEKDAY_LABELS_DE[dayOfWeek]

    let dayType: DayType = 'WEEKDAY'
    if (dayOfWeek === 6) dayType = 'SATURDAY'
    if (dayOfWeek === 0) dayType = 'SUNDAY'

    // Week number (ISO)
    const jan1 = new Date(year, 0, 1)
    const weekNumber = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)

    days.push({
      date: dateStr,
      day: d,
      dayType,
      weekdayLabel,
      isToday: dateStr === today,
      weekNumber,
    })
  }

  return days
}

export function formatMonthYear(year: number, month: number, locale = 'de-DE'): string {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function getTargetHours(workPercentage: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let workingDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow !== 0 && dow !== 6) workingDays++
  }
  // 42h/week → 8.4h/day average
  return Math.round((workPercentage / 100) * workingDays * 8.4 * 10) / 10
}

export function isWeekend(date: string): boolean {
  const dow = new Date(date).getDay()
  return dow === 0 || dow === 6
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}
