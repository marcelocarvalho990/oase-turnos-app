'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Zap, CheckCircle, AlertCircle, SlidersHorizontal, X } from 'lucide-react'
import { formatMonthYear, addMonths } from '@/lib/date-utils'

interface Props {
  year: number
  month: number
  team: string
  scheduleStatus: string
  onMonthChange: (year: number, month: number) => void
  onGenerate: (instructions?: string) => void
  isGenerating: boolean
  generateResult: { status: string; count?: number } | null
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600',
  GENERATED: 'bg-[#E6EEF3] text-[#003A5D]',
  PUBLISHED: 'bg-green-100 text-green-700',
  LOCKED:    'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     'Rascunho',
  GENERATED: 'Gerado',
  PUBLISHED: 'Publicado',
  LOCKED:    'Bloqueado',
}

export default function TopBar({ year, month, team, scheduleStatus, onMonthChange, onGenerate, isGenerating, generateResult }: Props) {
  const prev = addMonths(year, month, -1)
  const next = addMonths(year, month, 1)
  const [showInstructions, setShowInstructions] = useState(false)
  const [instructions, setInstructions] = useState('')

  function handleGenerate() {
    onGenerate(instructions.trim() || undefined)
    setShowInstructions(false)
  }

  return (
    <>
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

        <div className="flex-1" />

        {/* Generate result */}
        {generateResult && (
          <div className={`flex items-center gap-1.5 text-sm ${
            generateResult.status === 'FEASIBLE' || generateResult.status === 'OPTIMAL'
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {generateResult.status === 'FEASIBLE' || generateResult.status === 'OPTIMAL'
              ? <CheckCircle size={15} />
              : <AlertCircle size={15} />
            }
            {(generateResult.status === 'FEASIBLE' || generateResult.status === 'OPTIMAL') && `Solução encontrada (${generateResult.count} turnos)`}
            {generateResult.status === 'ERROR' && 'Erro na geração'}
            {generateResult.status === 'INFEASIBLE' && 'Impossível: restrições incompatíveis'}
          </div>
        )}

        {/* Instructions toggle */}
        <button
          onClick={() => setShowInstructions(v => !v)}
          title="Instruções para o gerador"
          style={{
            padding: '7px',
            borderRadius: 8,
            border: `1px solid ${showInstructions ? '#99BFCF' : '#E2E8F0'}`,
            background: showInstructions ? '#E6EEF3' : 'transparent',
            color: showInstructions ? '#003A5D' : '#64748B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.15s',
          }}
        >
          <SlidersHorizontal size={15} />
        </button>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: isGenerating ? '#7AA8C0' : '#003A5D',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
            opacity: isGenerating ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#002D47' }}
          onMouseLeave={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#003A5D' }}
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

      {/* Instructions panel */}
      {showInstructions && (
        <div className="shrink-0 border-b px-5 py-3" style={{ background: '#E6EEF3', borderColor: '#C5D9E3' }}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#003A5D' }}>Instruções adicionais para este mês</span>
              </div>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder='Ex: "Singh K. deve fazer mínimo 5 turnos F" · "Evitar turno S para Zimmermann S." · "Pelo menos 2 fins de semana para Bajric S."'
                rows={2}
                className="w-full text-sm text-slate-800 bg-white rounded-lg px-3 py-2 resize-none outline-none placeholder:text-slate-400"
                style={{ border: '1px solid #99BFCF' }}
              />
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: '#003A5D', opacity: 0.7 }}>
            As instruções são guardadas com o registo da geração para rastreabilidade.
          </p>
        </div>
      )}
    </>
  )
}
