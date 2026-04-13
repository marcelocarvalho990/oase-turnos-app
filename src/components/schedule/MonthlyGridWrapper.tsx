'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MonthlyGrid from './MonthlyGrid'
import TopBar from '../layout/TopBar'
import type { Employee, ShiftType, Schedule, CoverageRule, AssignmentMap, DayInfo, Assignment } from '@/types'

interface Props {
  schedule: Schedule
  employees: Employee[]
  assignmentMap: AssignmentMap
  shiftTypes: ShiftType[]
  coverageRules: CoverageRule[]
  days: DayInfo[]
  year: number
  month: number
  team: string
}

export default function MonthlyGridWrapper({
  schedule,
  employees,
  assignmentMap: initialMap,
  shiftTypes,
  coverageRules,
  days,
  year,
  month,
  team,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [assignmentMap, setAssignmentMap] = useState<AssignmentMap>(initialMap)
  const [isGenerating, setIsGenerating] = useState(false)

  // Sync with server data after router.refresh()
  useEffect(() => {
    setAssignmentMap(initialMap)
  }, [initialMap])
  const [generateResult, setGenerateResult] = useState<{ status: string; count?: number } | null>(null)

  const handleCellChange = useCallback(async (employeeId: string, date: string, shiftCode: string | null) => {
    // Optimistic update
    setAssignmentMap(prev => {
      const next = { ...prev, [employeeId]: { ...prev[employeeId] } }
      if (!shiftCode) {
        delete next[employeeId][date]
      } else {
        next[employeeId][date] = {
          id: '',
          scheduleId: schedule.id,
          employeeId,
          date,
          shiftCode,
          isExternal: false,
          origin: 'MANUAL',
        } as Assignment
      }
      return next
    })

    // API call
    try {
      const res = await fetch('/api/schedules/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id, employeeId, date, shiftCode: shiftCode ?? '' }),
      })
      if (!res.ok) {
        // Revert on error
        setAssignmentMap(initialMap)
      }
    } catch {
      setAssignmentMap(initialMap)
    }
  }, [schedule.id, initialMap])

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setGenerateResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: schedule.id, year, month, team }),
      })
      const data = await res.json()
      setGenerateResult({ status: data.status, count: data.count })
      // Reload to get fresh data
      startTransition(() => router.refresh())
    } catch {
      setGenerateResult({ status: 'ERROR' })
    } finally {
      setIsGenerating(false)
    }
  }, [schedule.id, year, month, team, router])

  const handleMonthChange = useCallback((newYear: number, newMonth: number) => {
    router.push(`/schedule?year=${newYear}&month=${newMonth}&team=${team}`)
  }, [team, router])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar
        year={year}
        month={month}
        team={team}
        scheduleStatus={schedule.status}
        onMonthChange={handleMonthChange}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        generateResult={generateResult}
      />
      <div className="flex-1 overflow-hidden">
        <MonthlyGrid
          employees={employees}
          assignmentMap={assignmentMap}
          shiftTypes={shiftTypes}
          coverageRules={coverageRules}
          days={days}
          onCellChange={handleCellChange}
        />
      </div>
    </div>
  )
}
