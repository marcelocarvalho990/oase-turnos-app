'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Zap, CheckCircle, AlertCircle, Trash2, X } from 'lucide-react'
import { formatMonthYear, addMonths } from '@/lib/date-utils'

interface Props {
  year: number
  month: number
  team: string
  scheduleStatus: string
  scheduleId: string
  onMonthChange: (year: number, month: number) => void
  onGenerate: (instructions?: string) => void
  onClear: () => void
  isGenerating: boolean
  generateResult: { status: string; count?: number } | null
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#F1F5F9', color: '#64748B' },
  GENERATED: { bg: '#E6EEF3', color: '#003A5D' },
  PUBLISHED: { bg: '#DCFCE7', color: '#16A34A' },
  LOCKED:    { bg: '#FEF3C7', color: '#D97706' },
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     'Rascunho',
  GENERATED: 'Gerado',
  PUBLISHED: 'Publicado',
  LOCKED:    'Bloqueado',
}

export default function TopBar({
  year, month, team, scheduleStatus, onMonthChange, onGenerate, onClear, isGenerating, generateResult,
}: Props) {
  const prev = addMonths(year, month, -1)
  const next = addMonths(year, month, 1)
  const [showModal, setShowModal] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [isClearing, setIsClearing] = useState(false)

  function openGenerateModal() {
    setInstructions('')
    setShowModal(true)
  }

  function handleGenerate() {
    onGenerate(instructions.trim() || undefined)
    setShowModal(false)
  }

  async function handleClear() {
    setIsClearing(true)
    try {
      await onClear()
    } finally {
      setIsClearing(false)
      setShowClearConfirm(false)
    }
  }

  const statusStyle = STATUS_STYLES[scheduleStatus] ?? STATUS_STYLES.DRAFT
  const hasGenerated = scheduleStatus === 'GENERATED' || scheduleStatus === 'PUBLISHED'

  return (
    <>
      <header
        className="shrink-0 border-b px-5 py-3 flex items-center gap-3"
        style={{ background: '#fff', borderColor: '#D8E2E8' }}
      >
        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMonthChange(prev.year, prev.month)}
            style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#7A9BAD' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F6F8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronLeft size={17} />
          </button>
          <h1 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#001E30', width: 148, textAlign: 'center', fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {formatMonthYear(year, month, 'de-DE')}
          </h1>
          <button
            onClick={() => onMonthChange(next.year, next.month)}
            style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#7A9BAD' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F4F6F8')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronRight size={17} />
          </button>
        </div>

        {/* Team badge */}
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#7A9BAD', background: '#F4F6F8', padding: '3px 10px', borderRadius: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
          {team}
        </span>

        {/* Status badge */}
        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {STATUS_LABELS[scheduleStatus] ?? scheduleStatus}
        </span>

        <div className="flex-1" />

        {/* Generate result */}
        {generateResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: generateResult.status === 'ERROR' ? '#DC2626' : '#16A34A' }}>
            {generateResult.status === 'ERROR'
              ? <AlertCircle size={14} />
              : <CheckCircle size={14} />
            }
            {(generateResult.status === 'FEASIBLE' || generateResult.status === 'OPTIMAL') && `${generateResult.count} turnos gerados`}
            {generateResult.status === 'ERROR' && 'Erro na geração'}
            {generateResult.status === 'INFEASIBLE' && 'Restrições impossíveis'}
          </div>
        )}

        {/* Clear button — only when schedule has generated content */}
        {hasGenerated && (
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing}
            title="Apagar escala gerada"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
              background: 'transparent', border: '1px solid #FECACA', borderRadius: 8,
              color: '#EF4444', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Trash2 size={14} />
            Apagar
          </button>
        )}

        {/* Generate button */}
        <button
          onClick={openGenerateModal}
          disabled={isGenerating}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
            background: isGenerating ? '#7AA8C0' : '#003A5D', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", transition: 'background 0.15s',
            opacity: isGenerating ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#002D47' }}
          onMouseLeave={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#003A5D' }}
        >
          {isGenerating ? (
            <>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              A gerar...
            </>
          ) : (
            <>
              <Zap size={14} />
              Gerar Escala
            </>
          )}
        </button>
      </header>

      {/* Generate modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,30,48,0.45)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
              padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#003A5D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Gerar Escala
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7A9BAD', marginTop: 2 }}>
                  {formatMonthYear(year, month, 'de-DE')} · {team}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#7A9BAD' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Instructions field */}
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#001E30', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notas / Instruções adicionais (opcional)
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
              placeholder={'Ex: "O Ricardo não trabalha este mês"\n"A Ana faz só turno F"\n"Máximo 2 fins de semana para o João"'}
              rows={4}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none', border: '1.5px solid #D8E2E8',
                borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: '#001E30',
                fontFamily: "'IBM Plex Sans', sans-serif", outline: 'none', lineHeight: 1.6,
                background: '#F4F6F8',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#003A5D')}
              onBlur={e => (e.currentTarget.style.borderColor = '#D8E2E8')}
            />
            <p style={{ fontSize: '0.7rem', color: '#7A9BAD', marginTop: 6 }}>
              A AI interpreta as instruções automaticamente — não precisas de usar uma sintaxe específica.
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid #D8E2E8',
                  background: 'transparent', color: '#7A9BAD', fontSize: '0.82rem', fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
                  background: '#003A5D', color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#002D47')}
                onMouseLeave={e => (e.currentTarget.style.background = '#003A5D')}
              >
                <Zap size={14} />
                Gerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,30,48,0.45)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowClearConfirm(false) }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400,
              padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#001E30', marginBottom: 10 }}>
              Apagar escala gerada?
            </div>
            <p style={{ fontSize: '0.85rem', color: '#7A9BAD', lineHeight: 1.6, marginBottom: 22 }}>
              Todos os turnos gerados automaticamente serão removidos. Os turnos inseridos manualmente são mantidos. O estado volta a Rascunho.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid #D8E2E8',
                  background: 'transparent', color: '#7A9BAD', fontSize: '0.82rem', fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleClear}
                disabled={isClearing}
                style={{
                  padding: '9px 18px', background: '#EF4444', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                  cursor: isClearing ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif", opacity: isClearing ? 0.7 : 1,
                }}
              >
                {isClearing ? 'A apagar...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
