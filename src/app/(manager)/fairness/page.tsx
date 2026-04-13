'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingDown, TrendingUp, Users, Calendar } from 'lucide-react'
import { FairnessMetric } from '@/types'

const TEAM = '2.OG'

function getHealthColor(worked: number, target: number): string {
  if (target === 0) return 'bg-slate-200'
  const pct = worked / target
  if (pct >= 0.9) return 'bg-emerald-500'
  if (pct >= 0.7) return 'bg-amber-400'
  return 'bg-red-500'
}

function getHealthBg(worked: number, target: number): string {
  if (target === 0) return ''
  const pct = worked / target
  if (pct >= 0.9) return ''
  if (pct >= 0.7) return 'bg-amber-50 border-l-4 border-amber-400'
  return 'bg-red-50 border-l-4 border-red-400'
}

function getHealthLabel(worked: number, target: number): { label: string; cls: string } {
  if (target === 0) return { label: '—', cls: 'text-slate-400' }
  const pct = worked / target
  if (pct >= 0.9) return { label: 'OK', cls: 'text-emerald-700 bg-emerald-50 border border-emerald-200' }
  if (pct >= 0.7) return { label: 'Atenção', cls: 'text-amber-700 bg-amber-50 border border-amber-200' }
  return { label: 'Baixo', cls: 'text-red-700 bg-red-50 border border-red-200' }
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-sm text-slate-500">A carregar dados de equidade…</span>
    </div>
  )
}

export default function FairnessPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [metrics, setMetrics] = useState<FairnessMetric[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })

  useEffect(() => {
    setLoading(true)
    setError(null)
    setMetrics(null)
    fetch(`/api/fairness?year=${year}&month=${month}&team=${encodeURIComponent(TEAM)}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Erro ao carregar')
        }
        return res.json()
      })
      .then((data: FairnessMetric[]) => {
        // Sort by deviation (most negative first)
        const sorted = [...data].sort((a, b) => {
          const devA = a.workedHours - a.targetHours
          const devB = b.workedHours - b.targetHours
          return devA - devB
        })
        setMetrics(sorted)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erro desconhecido'))
      .finally(() => setLoading(false))
  }, [year, month])

  const totalShifts = metrics?.reduce((s, m) => s + m.totalShifts, 0) ?? 0
  const belowTarget = metrics?.filter((m) => m.targetHours > 0 && m.workedHours / m.targetHours < 0.9).length ?? 0
  const avgWeekends = metrics?.length
    ? (metrics.reduce((s, m) => s + m.weekendsWorked, 0) / metrics.length).toFixed(1)
    : '—'

  // Month navigation
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Equidade e Fairness</h1>
              <p className="text-xs text-slate-500 mt-0.5">Equipa {TEAM}</p>
            </div>
          </div>
          {/* Month picker */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="bg-white text-slate-700 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[130px] text-center capitalize">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="bg-white text-slate-700 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
            >
              ›
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalShifts}</p>
              <p className="text-xs text-slate-500">Atribuições totais</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{belowTarget}</p>
              <p className="text-xs text-slate-500">Abaixo do objetivo</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Users size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avgWeekends}</p>
              <p className="text-xs text-slate-500">Fins de semana (média)</p>
            </div>
          </div>
        </div>

        {/* Chart / list */}
        {loading && <Spinner />}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error === 'Schedule not found'
              ? 'Ainda não existe uma escala gerada para este mês.'
              : error}
          </div>
        )}

        {metrics && metrics.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center text-slate-400 text-sm">
            Nenhum dado disponível para este mês.
          </div>
        )}

        {metrics && metrics.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[200px_1fr_80px_80px_70px] gap-3 px-5 py-3 bg-slate-50/70 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Colaborador</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Horas trabalhadas vs. objetivo</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">FdS</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Turnos difíceis</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Estado</span>
            </div>

            <div className="divide-y divide-slate-50">
              {metrics.map((m) => {
                const pct = m.targetHours > 0 ? Math.min(100, (m.workedHours / m.targetHours) * 100) : 0
                const deviation = m.workedHours - m.targetHours
                const healthColor = getHealthColor(m.workedHours, m.targetHours)
                const rowBg = getHealthBg(m.workedHours, m.targetHours)
                const { label: healthLabel, cls: healthCls } = getHealthLabel(m.workedHours, m.targetHours)

                return (
                  <div
                    key={m.employeeId}
                    className={`grid grid-cols-[200px_1fr_80px_80px_70px] gap-3 px-5 py-3.5 items-center ${rowBg}`}
                  >
                    {/* Name */}
                    <div>
                      <p className="text-sm font-medium text-slate-800 truncate">{m.employeeName}</p>
                      <p className="text-xs text-slate-400">{m.workPercentage}%</p>
                    </div>

                    {/* Hours bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-700 font-medium">{m.workedHours.toFixed(1)}h</span>
                        <span className="text-slate-400">/ {m.targetHours.toFixed(1)}h</span>
                        <span className={`font-mono font-semibold text-xs ${deviation >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {deviation >= 0 ? '+' : ''}{deviation.toFixed(1)}h
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${healthColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* Target marker line */}
                      <div className="relative h-0">
                        <div
                          className="absolute top-0 w-0.5 h-3 bg-slate-400 -translate-y-3 -translate-x-1/2"
                          style={{ left: '100%' }}
                          title="Objetivo"
                        />
                      </div>
                    </div>

                    {/* Weekends */}
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        {m.weekendsWorked}
                      </span>
                    </div>

                    {/* Hard shifts (S + G) */}
                    <div className="text-center">
                      <span className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        m.hardShiftsCount > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {m.hardShiftsCount}
                      </span>
                    </div>

                    {/* Health badge */}
                    <div className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${healthCls}`}>
                        {healthLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        {metrics && metrics.length > 0 && (
          <div className="flex items-center gap-5 text-xs text-slate-500 pb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              ≥ 90% objetivo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              70–90%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              &lt; 70%
            </span>
            <span className="ml-2 text-slate-400">FdS = Fins de semana trabalhados · Difíceis = Turnos S e G</span>
          </div>
        )}
      </div>
    </div>
  )
}
