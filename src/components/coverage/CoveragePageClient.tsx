'use client'

import { useState, useCallback, useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import { CoverageRule, ShiftType, DayType } from '@/types'
import { useLang } from '@/hooks/useLang'

interface Props {
  rules: CoverageRule[]
  workShifts: ShiftType[]
}

const DAY_LABELS: Record<DayType, { pt: string; de: string }> = {
  WEEKDAY:  { pt: 'Dia de Semana', de: 'Werktag'  },
  SATURDAY: { pt: 'Sábado',        de: 'Samstag'  },
  SUNDAY:   { pt: 'Domingo',       de: 'Sonntag'  },
  HOLIDAY:  { pt: 'Feriado',       de: 'Feiertag' },
}
const DAY_TYPE_KEYS: DayType[] = ['WEEKDAY', 'SATURDAY', 'SUNDAY']

type RuleMap = Record<string, Record<DayType, { min: number; ideal: number; id?: string }>>

function buildRuleMap(rules: CoverageRule[], shiftCodes: string[]): RuleMap {
  const map: RuleMap = {}
  for (const code of shiftCodes) {
    map[code] = {
      WEEKDAY: { min: 0, ideal: 0 },
      SATURDAY: { min: 0, ideal: 0 },
      SUNDAY: { min: 0, ideal: 0 },
      HOLIDAY: { min: 0, ideal: 0 },
    }
  }
  for (const rule of rules) {
    if (!map[rule.shiftCode]) {
      map[rule.shiftCode] = {
        WEEKDAY: { min: 0, ideal: 0 },
        SATURDAY: { min: 0, ideal: 0 },
        SUNDAY: { min: 0, ideal: 0 },
        HOLIDAY: { min: 0, ideal: 0 },
      }
    }
    map[rule.shiftCode][rule.dayType] = {
      min: rule.minStaff,
      ideal: rule.idealStaff,
      id: rule.id,
    }
  }
  return map
}

interface CellState {
  min: number
  ideal: number
  id?: string
  saving?: boolean
  saved?: boolean
  error?: string
}

export default function CoveragePageClient({ rules, workShifts }: Props) {
  const [lang] = useLang()
  const DAY_TYPES = DAY_TYPE_KEYS.map(k => ({ key: k, label: DAY_LABELS[k][lang] }))
  const shiftCodes = workShifts.map((s) => s.code)
  const shiftMap = Object.fromEntries(workShifts.map((s) => [s.code, s]))

  const initialMap = buildRuleMap(rules, shiftCodes)

  // Flat state: key = "CODE:DAYTYPE"
  const [cells, setCells] = useState<Record<string, CellState>>(() => {
    const flat: Record<string, CellState> = {}
    for (const code of shiftCodes) {
      for (const { key } of DAY_TYPES) {
        const cell = initialMap[code]?.[key]
        flat[`${code}:${key}`] = { min: cell?.min ?? 0, ideal: cell?.ideal ?? 0, id: cell?.id }
      }
    }
    return flat
  })

  // Debounce timers
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const getCell = (code: string, dayType: DayType) => cells[`${code}:${dayType}`] ?? { min: 0, ideal: 0 }

  const setCell = (code: string, dayType: DayType, update: Partial<CellState>) => {
    setCells((prev) => ({
      ...prev,
      [`${code}:${dayType}`]: { ...prev[`${code}:${dayType}`], ...update },
    }))
  }

  const saveCell = useCallback(async (code: string, dayType: DayType, min: number, ideal: number) => {
    const cellKey = `${code}:${dayType}`
    setCell(code, dayType, { saving: true, error: undefined })
    try {
      const res = await fetch('/api/coverage-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: '2.OG', shiftCode: code, dayType, minStaff: min, idealStaff: ideal }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro')
      }
      const saved: CoverageRule = await res.json()
      setCell(code, dayType, { saving: false, saved: true, id: saved.id })
      setTimeout(() => setCell(code, dayType, { saved: false }), 1500)
    } catch (err: unknown) {
      setCell(code, dayType, { saving: false, error: err instanceof Error ? err.message : 'Erro' })
    }
  }, [])

  function handleChange(code: string, dayType: DayType, field: 'min' | 'ideal', value: string) {
    const num = Math.max(0, Math.min(99, parseInt(value, 10) || 0))
    const current = getCell(code, dayType)
    const next = { ...current, [field === 'min' ? 'min' : 'ideal']: num }
    setCell(code, dayType, { [field === 'min' ? 'min' : 'ideal']: num })

    const cellKey = `${code}:${dayType}`
    clearTimeout(timers.current[cellKey])
    timers.current[cellKey] = setTimeout(() => {
      saveCell(code, dayType, next.min, next.ideal)
    }, 700)
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{lang === 'de' ? 'Abdeckungsregeln' : 'Regras de Cobertura'}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{lang === 'de' ? 'Min. und Ideal pro Schicht · Team 2.OG' : 'Min. e ideal por turno · Equipa 2.OG'}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#E6EEF3] border border-[#99BFCF] inline-block" />
            {lang === 'de' ? 'Min. obligatorisch' : 'Min. obrigatório'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            Ideal
          </span>
          <span className="text-slate-400">{lang === 'de' ? 'Änderungen werden automatisch gespeichert.' : 'As alterações são guardadas automaticamente.'}</span>
        </div>

        {/* Grid card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 w-36">
                  {lang === 'de' ? 'Schicht' : 'Turno'}
                </th>
                {DAY_TYPES.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500" colSpan={2}>
                    {label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-slate-100">
                <th />
                {DAY_TYPES.map(({ key }) => (
                  <>
                    <th key={`${key}-min`} className="px-3 py-2 text-xs text-center font-medium text-[#003A5D] w-20">Min</th>
                    <th key={`${key}-ideal`} className="px-3 py-2 text-xs text-center font-medium text-emerald-600 w-20">Ideal</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shiftCodes.map((code) => {
                const shift = shiftMap[code]
                return (
                  <tr key={code} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-sm font-bold px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: shift?.bgColor ?? '#F3F4F6',
                            color: shift?.textColor ?? '#374151',
                          }}
                        >
                          {code}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[100px]">{shift?.name}</span>
                      </div>
                    </td>
                    {DAY_TYPES.map(({ key }) => {
                      const cell = getCell(code, key)
                      const isActive = cell.min > 0 || cell.ideal > 0
                      return (
                        <>
                          {/* Min */}
                          <td key={`${code}-${key}-min`} className="px-3 py-2 text-center">
                            <div className="relative inline-flex flex-col items-center">
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={cell.min}
                                onChange={(e) => handleChange(code, key, 'min', e.target.value)}
                                className={`w-14 text-center text-sm rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-[#003A5D] transition-colors ${
                                  isActive && cell.min > 0
                                    ? 'bg-[#F0F5F8] border-[#99BFCF] text-[#003A5D] font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              />
                              {cell.saving && (
                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                                  <span className="w-2.5 h-2.5 border-2 border-[#003A5D]/40 border-t-blue-500 rounded-full animate-spin inline-block" />
                                </span>
                              )}
                              {cell.saved && (
                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-emerald-600 text-xs">✓</span>
                              )}
                            </div>
                          </td>
                          {/* Ideal */}
                          <td key={`${code}-${key}-ideal`} className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={cell.ideal}
                              onChange={(e) => handleChange(code, key, 'ideal', e.target.value)}
                              className={`w-14 text-center text-sm rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
                                isActive && cell.ideal > 0
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            />
                          </td>
                        </>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
