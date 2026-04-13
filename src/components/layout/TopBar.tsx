'use client'

import { ChevronLeft, ChevronRight, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { formatMonthYear, addMonths } from '@/lib/date-utils'

interface Props {
  year: number
  month: number
  team: string
  scheduleStatus: string
  onMonthChange: (year: number, month: number) => void
  onGenerate: () => void
  isGenerating: boolean
  generateResult: { status: string; count?: number } | null
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  GENERATED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  LOCKED: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  GENERATED: 'Gerado',
  PUBLISHED: 'Publicado',
  LOCKED: 'Bloqueado',
}

export default function TopBar({ year, month, team, scheduleStatus, onMonthChange, onGenerate, isGenerating, generateResult }: Props) {
  const prev = addMonths(year, month, -1)
  const next = addMonths(year, month, 1)

  return (
    <header className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-4">
      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onMonthChange(prev.year, prev.month)}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-slate-900 w-40 text-center">
          {formatMonthYear(year, month, 'de-DE')}
        </h1>
        <button
          onClick={() => onMonthChange(next.year, next.month)}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Team badge */}
      <span className="text-sm text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
        {team}
      </span>

      {/* Status badge */}
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[scheduleStatus] ?? STATUS_STYLES.DRAFT}`}>
        {STATUS_LABELS[scheduleStatus] ?? scheduleStatus}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generate result */}
      {generateResult && (
        <div className={`flex items-center gap-1.5 text-sm ${
          generateResult.status === 'OPTIMAL' || generateResult.status === 'FEASIBLE'
            ? 'text-green-600'
            : generateResult.status === 'MOCK'
            ? 'text-amber-600'
            : 'text-red-600'
        }`}>
          {generateResult.status === 'OPTIMAL' || generateResult.status === 'FEASIBLE' ? (
            <CheckCircle size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          {generateResult.status === 'OPTIMAL' && `Gerado com sucesso (${generateResult.count} turnos)`}
          {generateResult.status === 'FEASIBLE' && `Solução encontrada (${generateResult.count} turnos)`}
          {generateResult.status === 'MOCK' && 'Solver não instalado — sem geração'}
          {generateResult.status === 'ERROR' && 'Erro na geração'}
          {generateResult.status === 'INFEASIBLE' && 'Impossível: restrições incompatíveis'}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            A gerar...
          </>
        ) : (
          <>
            <Zap size={15} />
            Gerar Escala
          </>
        )}
      </button>
    </header>
  )
}
