export type Role =
  | 'TEAMLEITUNG'
  | 'FUNKTIONSSTUFE_3'
  | 'FUNKTIONSSTUFE_2'
  | 'FUNKTIONSSTUFE_1'
  | 'LERNENDE'

export const ROLE_LABELS: Record<Role, string> = {
  TEAMLEITUNG: 'Teamleitung',
  FUNKTIONSSTUFE_3: 'Funktionsstufe 3',
  FUNKTIONSSTUFE_2: 'Funktionsstufe 2',
  FUNKTIONSSTUFE_1: 'Funktionsstufe 1',
  LERNENDE: 'Lernende',
}

export const ROLE_ORDER: Role[] = [
  'TEAMLEITUNG',
  'FUNKTIONSSTUFE_3',
  'FUNKTIONSSTUFE_2',
  'FUNKTIONSSTUFE_1',
  'LERNENDE',
]

export type DayType = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY' | 'HOLIDAY'
export type ScheduleStatus = 'DRAFT' | 'GENERATED' | 'PUBLISHED' | 'LOCKED'
export type Origin = 'AUTO' | 'MANUAL'

export interface Employee {
  id: string
  name: string
  shortName: string
  workPercentage: number
  team: string
  role: Role
  canCoverOtherTeams: boolean
  isActive: boolean
}

export interface ShiftType {
  id: string
  code: string
  name: string
  description?: string | null
  startTime1: string
  endTime1: string
  startTime2?: string | null
  endTime2?: string | null
  durationMinutes: number
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  isAbsence: boolean
  isWorkTime: boolean
  sortOrder: number
  eligibleRoles: string[]
}

export interface Assignment {
  id: string
  scheduleId: string
  employeeId: string
  date: string
  shiftCode: string
  isExternal: boolean
  origin: Origin
  notes?: string | null
}

export interface Schedule {
  id: string
  year: number
  month: number
  team: string
  status: ScheduleStatus
  generatedAt?: string | null
  assignments?: Assignment[]
}

export interface AbsenceRequest {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  type: string
  isHardBlock: boolean
  notes?: string | null
}

export interface CoverageRule {
  id: string
  team: string
  shiftCode: string
  dayType: DayType
  minStaff: number
  idealStaff: number
}

export interface FairnessMetric {
  employeeId: string
  employeeName: string
  workPercentage: number
  targetHours: number
  workedHours: number
  weekendsWorked: number
  hardShiftsCount: number
  externalShiftsCount: number
  totalShifts: number
}

// Grid types
export type AssignmentMap = Record<string, Record<string, Assignment | null>>

export interface DayInfo {
  date: string // "YYYY-MM-DD"
  day: number
  dayType: DayType
  weekdayLabel: string // "Mo", "Di", etc.
  isToday: boolean
  weekNumber: number
}

export interface CoverageStats {
  date: string
  shiftCode: string
  count: number
  minRequired: number
  idealCount: number
}
