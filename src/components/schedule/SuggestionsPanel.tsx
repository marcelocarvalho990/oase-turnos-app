'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Check, X, RefreshCw, ArrowRightLeft, PlusCircle, Loader } from 'lucide-react'

export interface AddSuggestion {
  id: string
  type: 'ADD'
  description: string
  reason: string
  employeeId: string
  employeeName: string
  date: string
  shiftCode: string
}

export interface SwapSuggestion {
  id: string
  type: 'SWAP'
  description: string
  reason: string
  fromEmployeeId: string
  fromEmployeeName: string
  fromDate: string
  fromShiftCode: string
  toEmployeeId: string
  toEmployeeName: string
  toDate: string
  toShiftCode: string
}

export type Suggestion = AddSuggestion | SwapSuggestion

interface Props {
  scheduleId: string
  year: number
  month: number
  team: string
  fetchTrigger: number  // increment to re-fetch suggestions
  onApplied: () => void // call router.refresh() after applying
}

export default function SuggestionsPanel({ scheduleId, year, month, team, fetchTrigger, onApplied }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    setIsFetching(true)
    setError(null)
    setDismissed(new Set())
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, year, month, team }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao carregar sugestões'); return }
      setSuggestions(data.suggestions ?? [])
      setExpanded(true)
    } catch {
      setError('Erro de ligação')
    } finally {
      setIsFetching(false)
      setHasFetched(true)
    }
  }, [scheduleId, year, month, team])

  // Auto-fetch when trigger increments (after schedule generation)
  useEffect(() => {
    if (fetchTrigger > 0) fetchSuggestions()
  }, [fetchTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id))
  const pendingCount = visibleSuggestions.length

  async function applySuggestion(suggestion: Suggestion) {
    setApplying(suggestion.id)
    try {
      const res = await fetch('/api/suggestions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion, scheduleId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Erro ao aplicar sugestão')
        return
      }
      setDismissed(prev => new Set([...prev, suggestion.id]))
      onApplied()
    } catch {
      alert('Erro de ligação')
    } finally {
      setApplying(null)
    }
  }

  function dismissSuggestion(id: string) {
    setDismissed(prev => new Set([...prev, id]))
  }

  // Don't render if never fetched
  if (!hasFetched && fetchTrigger === 0) return null

  const panelW = 340

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: panelW,
        zIndex: 200,
        fontFamily: "'IBM Plex Sans', sans-serif",
        filter: 'drop-shadow(0 4px 24px rgba(0,58,93,0.18))',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #003A5D 0%, #0066A1 100%)',
          color: 'white',
          border: 'none',
          borderRadius: expanded ? '12px 12px 0 0' : '12px',
          padding: '10px 14px',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <Sparkles size={16} color="#7DD3FC" />
        <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, textAlign: 'left' }}>
          Sugestões IA
        </span>

        {isFetching && <Loader size={14} color="rgba(255,255,255,0.7)" style={{ animation: 'spin 1s linear infinite' }} />}

        {!isFetching && hasFetched && pendingCount > 0 && (
          <span style={{
            background: '#F59E0B',
            color: 'white',
            borderRadius: 10,
            padding: '1px 7px',
            fontSize: '0.72rem',
            fontWeight: 700,
          }}>
            {pendingCount}
          </span>
        )}

        {!isFetching && hasFetched && (
          <button
            onClick={e => { e.stopPropagation(); fetchSuggestions() }}
            title="Atualizar sugestões"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', padding: 2 }}
          >
            <RefreshCw size={12} />
          </button>
        )}

        {expanded ? <ChevronDown size={16} color="rgba(255,255,255,0.8)" /> : <ChevronUp size={16} color="rgba(255,255,255,0.8)" />}
      </button>

      {/* Body */}
      {expanded && (
        <div style={{
          background: 'white',
          borderRadius: '0 0 12px 12px',
          border: '1px solid #D8E2E8',
          borderTop: 'none',
          maxHeight: 420,
          overflowY: 'auto',
        }}>
          {isFetching && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#7A9BAD', fontSize: '0.82rem' }}>
              <div style={{ marginBottom: 8 }}>A analisar equidade...</div>
              <div style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid #D8E2E8', borderTopColor: '#003A5D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!isFetching && error && (
            <div style={{ padding: '12px 16px', color: '#DC2626', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={14} /> {error}
            </div>
          )}

          {!isFetching && !error && visibleSuggestions.length === 0 && hasFetched && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: '#7A9BAD', fontSize: '0.82rem' }}>
              Nenhuma sugestão pendente.
              <br />As horas estão equilibradas.
            </div>
          )}

          {!isFetching && visibleSuggestions.map(sug => (
            <SuggestionCard
              key={sug.id}
              suggestion={sug}
              isApplying={applying === sug.id}
              onAccept={() => applySuggestion(sug)}
              onReject={() => dismissSuggestion(sug.id)}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function SuggestionCard({ suggestion, isApplying, onAccept, onReject }: {
  suggestion: Suggestion
  isApplying: boolean
  onAccept: () => void
  onReject: () => void
}) {
  const isSwap = suggestion.type === 'SWAP'

  const dateLabel = (date: string) => {
    const d = new Date(date + 'T00:00:00')
    return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: '1px solid #F0F4F7',
    }}>
      {/* Type badge + description */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '2px 7px',
          borderRadius: 5,
          fontSize: '0.68rem',
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
          background: isSwap ? '#EFF6FF' : '#F0FDF4',
          color: isSwap ? '#1D4ED8' : '#15803D',
          border: `1px solid ${isSwap ? '#BFDBFE' : '#BBF7D0'}`,
        }}>
          {isSwap ? <ArrowRightLeft size={10} /> : <PlusCircle size={10} />}
          {isSwap ? 'TROCA' : 'ADIÇÃO'}
        </span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#003A5D', lineHeight: 1.3 }}>
          {suggestion.description}
        </span>
      </div>

      {/* Detail line */}
      <div style={{ fontSize: '0.75rem', color: '#7A9BAD', marginBottom: 4, marginLeft: 0 }}>
        {isSwap ? (
          <>
            <span style={{ fontWeight: 600, color: '#475569' }}>{(suggestion as SwapSuggestion).fromEmployeeName}</span>
            {' '}cede{' '}
            <span style={{ fontWeight: 600, color: '#003A5D' }}>{(suggestion as SwapSuggestion).fromShiftCode}</span>
            {' '}({dateLabel((suggestion as SwapSuggestion).fromDate)}) →{' '}
            <span style={{ fontWeight: 600, color: '#475569' }}>{(suggestion as SwapSuggestion).toEmployeeName}</span>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 600, color: '#475569' }}>{(suggestion as AddSuggestion).employeeName}</span>
            {' · '}
            <span style={{ fontWeight: 600, color: '#003A5D' }}>{(suggestion as AddSuggestion).shiftCode}</span>
            {' · '}
            {dateLabel((suggestion as AddSuggestion).date)}
          </>
        )}
      </div>

      {/* Reason */}
      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 10, fontStyle: 'italic' }}>
        {suggestion.reason}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onAccept}
          disabled={isApplying}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 0',
            borderRadius: 7,
            border: 'none',
            background: isApplying ? '#D1FAE5' : '#ECFDF5',
            color: '#15803D',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: isApplying ? 'wait' : 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            transition: 'background 0.15s',
          }}
        >
          {isApplying
            ? <><div style={{ width: 12, height: 12, border: '2px solid #D1FAE5', borderTopColor: '#15803D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> A aplicar...</>
            : <><Check size={12} /> Aceitar</>
          }
        </button>
        <button
          onClick={onReject}
          disabled={isApplying}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '6px 0',
            borderRadius: 7,
            border: '1px solid #E2E8F0',
            background: 'white',
            color: '#64748B',
            fontSize: '0.78rem',
            fontWeight: 500,
            cursor: isApplying ? 'not-allowed' : 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          <X size={12} /> Ignorar
        </button>
      </div>
    </div>
  )
}
