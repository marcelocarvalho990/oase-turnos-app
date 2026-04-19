'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, ChevronDown, ChevronUp, Check, X, RefreshCw,
  ArrowRightLeft, PlusCircle, Loader, AlertTriangle, Info, AlertCircle,
  ClipboardList, Lightbulb, BarChart3,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddSuggestion {
  id: string; type: 'ADD'
  description: string; reason: string
  employeeId: string; employeeName: string; date: string; shiftCode: string
}

export interface SwapSuggestion {
  id: string; type: 'SWAP'
  description: string; reason: string
  fromEmployeeId: string; fromEmployeeName: string; fromDate: string; fromShiftCode: string
  toEmployeeId: string; toEmployeeName: string; toDate: string; toShiftCode: string
}

export type Suggestion = AddSuggestion | SwapSuggestion

export interface EvaluationItem {
  employeeId: string; employeeName: string
  assignedShifts: number; expectedShifts: number
  workedHours: number; targetHours: number; deltaHours: number
  alerts: string[]
}

export interface Problem { description: string; affected?: string }

export interface GenerationReport {
  summary: string
  quality: 'boa' | 'moderada' | 'fraca'
  evaluation: EvaluationItem[]
  problems: { critical: Problem[]; important: Problem[]; moderate: Problem[] }
  suggestions: Suggestion[]
  managerNotes: string
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  scheduleId: string
  year: number
  month: number
  team: string
  report: GenerationReport | null        // from LLM generation (preferred)
  fetchTrigger: number                   // fallback: increment to fetch from /api/suggestions
  onApplied: () => void
}

type Tab = 'resumo' | 'problemas' | 'sugestoes'

// ── Colours ───────────────────────────────────────────────────────────────────

const C = {
  primary: '#003A5D', accent: '#0066A1', border: '#D8E2E8',
  muted: '#7A9BAD', bg: '#F0F4F7', white: '#fff',
  green: '#15803D', greenBg: '#ECFDF5', greenBorder: '#BBF7D0',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
  amber: '#D97706', amberBg: '#FFFBEB', amberBorder: '#FDE68A',
  blue: '#1D4ED8', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  slate: '#64748B',
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SuggestionsPanel({ scheduleId, year, month, team, report, fetchTrigger, onApplied }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [tab, setTab] = useState<Tab>('resumo')
  const [activeReport, setActiveReport] = useState<GenerationReport | null>(report)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null)

  // When LLM report arrives directly from generation → use it
  useEffect(() => {
    if (report) {
      setActiveReport(report)
      setDismissed(new Set())
      setTab('resumo')
      setExpanded(true)
      setHasFetched(true)
    }
  }, [report])

  // Fallback: when LLM didn't produce a report, fetch suggestions from /api/suggestions
  useEffect(() => {
    if (fetchTrigger > 0 && !report) {
      fetchFallbackSuggestions()
    }
  }, [fetchTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchFallbackSuggestions() {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, year, month, team }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.suggestions?.length > 0) {
        // Build a minimal report with just suggestions
        setActiveReport({
          summary: 'Escala gerada. Sugestões de equilíbrio de horas abaixo.',
          quality: 'moderada',
          evaluation: [],
          problems: { critical: [], important: [], moderate: [] },
          suggestions: data.suggestions,
          managerNotes: '',
        })
        setDismissed(new Set())
        setTab('sugestoes')
        setExpanded(true)
        setHasFetched(true)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // Derived values — safe-guarded for when activeReport is null (loading state)
  const visibleSuggestions = (activeReport?.suggestions ?? []).filter(s => !dismissed.has(s.id))
  const totalProblems = (activeReport?.problems.critical.length ?? 0) + (activeReport?.problems.important.length ?? 0) + (activeReport?.problems.moderate.length ?? 0)
  const pendingSuggestions = visibleSuggestions.length
  const quality = activeReport?.quality ?? 'moderada'
  const qualityColour = quality === 'boa' ? C.green : quality === 'moderada' ? C.amber : C.red
  const qualityBg = quality === 'boa' ? C.greenBg : quality === 'moderada' ? C.amberBg : C.redBg

  // ── Refresh suggestions (manual button) ──────────────────────────────────

  const refreshSuggestions = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, year, month, team }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.suggestions) {
        setActiveReport(prev => prev ? { ...prev, suggestions: data.suggestions } : prev)
        setDismissed(new Set())
        setTab('sugestoes')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [scheduleId, year, month, team])

  // ── Apply suggestion ──────────────────────────────────────────────────────

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
        setErrorModal({ title: 'Não foi possível aplicar', message: data.error ?? 'Erro ao aplicar sugestão' })
        return
      }
      setDismissed(prev => new Set([...prev, suggestion.id]))
      onApplied()
    } catch {
      setErrorModal({ title: 'Erro de ligação', message: 'Não foi possível contactar o servidor. Tenta novamente.' })
    } finally {
      setApplying(null)
    }
  }

  // ── Tab badge counts ──────────────────────────────────────────────────────

  const tabDef: { key: Tab; label: string; icon: React.ReactNode; badge?: number; badgeColour?: string }[] = [
    { key: 'resumo',    label: 'Resumo',    icon: <ClipboardList size={13} />, badge: undefined },
    { key: 'problemas', label: 'Problemas', icon: <AlertTriangle size={13} />, badge: totalProblems,    badgeColour: (activeReport?.problems.critical.length ?? 0) > 0 ? C.red : C.amber },
    { key: 'sugestoes', label: 'Sugestões', icon: <Lightbulb size={13} />,     badge: pendingSuggestions, badgeColour: '#5B21B6' },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      width: expanded ? 380 : 'auto',
      zIndex: 200,
      fontFamily: "'IBM Plex Sans', sans-serif",
      filter: 'drop-shadow(0 4px 24px rgba(0,58,93,0.22))',
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => !expanded && setExpanded(true)}
        style={{
          background: 'linear-gradient(135deg, #003A5D 0%, #0066A1 100%)',
          borderRadius: expanded ? '12px 12px 0 0' : '20px',
          padding: expanded ? '10px 14px' : '7px 11px',
          display: 'flex', alignItems: 'center', gap: expanded ? 8 : 6,
          cursor: expanded ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Sparkles size={expanded ? 15 : 13} color="#7DD3FC" style={{ flexShrink: 0 }} />

        {expanded ? (
          <>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.white, flex: 1 }}>
              Relatório IA
            </span>

            {/* Quality badge */}
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: qualityBg, color: qualityColour,
            }}>
              {quality.toUpperCase()}
            </span>

            {/* Refresh suggestions */}
            <button
              onClick={refreshSuggestions}
              disabled={isRefreshing}
              title="Atualizar sugestões"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', padding: 2 }}
            >
              {isRefreshing
                ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: C.white, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <RefreshCw size={12} />
              }
            </button>
          </>
        ) : (
          <>
            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: C.white }}>IA</span>
            {(totalProblems + pendingSuggestions) > 0 && (
              <span style={{
                background: (activeReport?.problems.critical.length ?? 0) > 0 ? C.red : '#5B21B6',
                color: C.white, borderRadius: 10, padding: '1px 5px',
                fontSize: '0.62rem', fontWeight: 700, minWidth: 14, textAlign: 'center',
              }}>
                {totalProblems + pendingSuggestions}
              </span>
            )}
          </>
        )}

        {/* Expand/collapse */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', padding: 2 }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* ── Body ── */}
      {expanded && (
        <div style={{ background: C.white, borderRadius: '0 0 12px 12px', border: `1px solid ${C.border}`, borderTop: 'none' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            {tabDef.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '8px 4px', border: 'none', borderBottom: tab === t.key ? `2px solid ${C.primary}` : '2px solid transparent',
                  background: 'transparent', cursor: 'pointer', fontSize: '0.73rem', fontWeight: tab === t.key ? 700 : 400,
                  color: tab === t.key ? C.primary : C.muted, fontFamily: "'IBM Plex Sans', sans-serif",
                  transition: 'color 0.15s',
                }}
              >
                {t.icon}
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span style={{ background: t.badgeColour, color: C.white, borderRadius: 8, padding: '1px 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {!activeReport ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>
                {isRefreshing
                  ? <><div style={{ display: 'inline-block', width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 8 }} /><br />A analisar escala...</>
                  : 'Gera a escala para ver o relatório IA.'}
              </div>
            ) : (
              <>
                {tab === 'resumo' && <ResumoTab summary={activeReport.summary} evaluation={activeReport.evaluation} managerNotes={activeReport.managerNotes} />}
                {tab === 'problemas' && <ProblemasTab problems={activeReport.problems} />}
                {tab === 'sugestoes' && (
                  <SugestoesTab
                    suggestions={visibleSuggestions}
                    applying={applying}
                    onAccept={applySuggestion}
                    onDismiss={id => setDismissed(prev => new Set([...prev, id]))}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Error modal */}
      {errorModal && (
        <div
          onClick={() => setErrorModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.white, borderRadius: 16, padding: '28px 28px 24px',
              width: 340, boxShadow: '0 20px 60px rgba(0,58,93,0.22)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}
          >
            {/* Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: C.redBg, border: `2px solid ${C.redBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={24} color={C.red} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: C.primary, marginBottom: 6 }}>
                {errorModal.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: C.slate, lineHeight: 1.5 }}>
                {errorModal.message}
              </div>
            </div>

            <button
              onClick={() => setErrorModal(null)}
              style={{
                marginTop: 4, padding: '9px 32px', borderRadius: 9,
                border: 'none', background: C.primary, color: C.white,
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Resumo ───────────────────────────────────────────────────────────────

function ResumoTab({ summary, evaluation, managerNotes }: { summary: string; evaluation: EvaluationItem[]; managerNotes: string }) {
  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      {summary && (
        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
          {summary}
        </div>
      )}

      {/* Per-employee hours */}
      {evaluation.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            <BarChart3 size={11} style={{ display: 'inline', marginRight: 4 }} />Horas por colaborador
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {evaluation.map(emp => {
              const delta = emp.deltaHours
              const bar = Math.min(100, Math.round((emp.workedHours / emp.targetHours) * 100))
              const barColour = delta >= -5 && delta <= 5 ? C.green : delta < -10 ? C.red : C.amber
              return (
                <div key={emp.employeeId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.73rem', color: '#334155', fontWeight: 500 }}>{emp.employeeName}</span>
                    <span style={{ fontSize: '0.7rem', color: delta >= -5 && delta <= 5 ? C.green : delta < 0 ? C.red : C.amber, fontWeight: 700 }}>
                      {emp.workedHours.toFixed(1)}h / {emp.targetHours.toFixed(1)}h
                      {' '}({delta >= 0 ? '+' : ''}{delta.toFixed(1)})
                    </span>
                  </div>
                  <div style={{ height: 4, background: C.bg, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${bar}%`, background: barColour, borderRadius: 2, transition: 'width 0.4s' }} />
                  </div>
                  {emp.alerts.length > 0 && (
                    <div style={{ fontSize: '0.65rem', color: C.amber, marginTop: 1 }}>
                      ⚠ {emp.alerts.join(' · ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Manager notes */}
      {managerNotes && (
        <div style={{ background: '#F0F9FF', border: `1px solid #BAE6FD`, borderRadius: 8, padding: '8px 10px', fontSize: '0.75rem', color: '#0369A1' }}>
          <div style={{ fontWeight: 700, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Info size={12} /> Notas para o manager
          </div>
          {managerNotes}
        </div>
      )}
    </div>
  )
}

// ── Tab: Problemas ────────────────────────────────────────────────────────────

function ProblemasTab({ problems }: { problems: GenerationReport['problems'] }) {
  const sections: { key: keyof typeof problems; label: string; colour: string; bg: string; border: string; icon: React.ReactNode }[] = [
    { key: 'critical', label: 'Críticos',   colour: C.red,   bg: C.redBg,   border: C.redBorder,   icon: <AlertCircle size={13} /> },
    { key: 'important', label: 'Importantes', colour: C.amber, bg: C.amberBg, border: C.amberBorder, icon: <AlertTriangle size={13} /> },
    { key: 'moderate',  label: 'Moderados',   colour: C.blue,  bg: C.blueBg,  border: C.blueBorder,  icon: <Info size={13} /> },
  ]

  const total = problems.critical.length + problems.important.length + problems.moderate.length

  if (total === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>
        Nenhum problema detectado.
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sections.map(s => {
        const items = problems[s.key]
        if (items.length === 0) return null
        return (
          <div key={s.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, color: s.colour, fontSize: '0.72rem', fontWeight: 700 }}>
              {s.icon} {s.label.toUpperCase()} ({items.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((p, i) => (
                <div key={i} style={{
                  background: s.bg, border: `1px solid ${s.border}`, borderRadius: 7,
                  padding: '7px 10px', fontSize: '0.77rem', color: '#1E293B',
                }}>
                  <div style={{ fontWeight: 500 }}>{p.description}</div>
                  {p.affected && <div style={{ fontSize: '0.7rem', color: s.colour, marginTop: 2 }}>{p.affected}</div>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab: Sugestões ────────────────────────────────────────────────────────────

function SugestoesTab({ suggestions, applying, onAccept, onDismiss }: {
  suggestions: Suggestion[]
  applying: string | null
  onAccept: (s: Suggestion) => void
  onDismiss: (id: string) => void
}) {
  if (suggestions.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>
        Nenhuma sugestão pendente.
      </div>
    )
  }

  const dateLabel = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })

  return (
    <div>
      {suggestions.map(sug => {
        const isSwap = sug.type === 'SWAP'
        const isApplying = applying === sug.id
        return (
          <div key={sug.id} style={{ padding: '11px 14px', borderBottom: `1px solid ${C.bg}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 7px', borderRadius: 5, fontSize: '0.67rem', fontWeight: 700, flexShrink: 0, marginTop: 1,
                background: isSwap ? C.blueBg : C.greenBg, color: isSwap ? C.blue : C.green,
                border: `1px solid ${isSwap ? C.blueBorder : C.greenBorder}`,
              }}>
                {isSwap ? <ArrowRightLeft size={10} /> : <PlusCircle size={10} />}
                {isSwap ? 'TROCA' : 'ADIÇÃO'}
              </span>
              <span style={{ fontSize: '0.81rem', fontWeight: 600, color: C.primary, lineHeight: 1.35 }}>
                {sug.description}
              </span>
            </div>

            <div style={{ fontSize: '0.73rem', color: C.muted, marginBottom: 3 }}>
              {isSwap ? (
                <>
                  <b style={{ color: '#475569' }}>{(sug as SwapSuggestion).fromEmployeeName}</b>
                  {' cede '}<b style={{ color: C.primary }}>{(sug as SwapSuggestion).fromShiftCode}</b>
                  {' ('}{dateLabel((sug as SwapSuggestion).fromDate)}{') → '}
                  <b style={{ color: '#475569' }}>{(sug as SwapSuggestion).toEmployeeName}</b>
                </>
              ) : (
                <>
                  <b style={{ color: '#475569' }}>{(sug as AddSuggestion).employeeName}</b>
                  {' · '}<b style={{ color: C.primary }}>{(sug as AddSuggestion).shiftCode}</b>
                  {' · '}{dateLabel((sug as AddSuggestion).date)}
                </>
              )}
            </div>

            <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontStyle: 'italic', marginBottom: 9 }}>
              {sug.reason}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onAccept(sug)}
                disabled={isApplying}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '6px 0', borderRadius: 7, border: 'none',
                  background: isApplying ? '#D1FAE5' : C.greenBg, color: C.green,
                  fontSize: '0.78rem', fontWeight: 600, cursor: isApplying ? 'wait' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {isApplying
                  ? <><Loader size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> A aplicar...</>
                  : <><Check size={12} /> Aceitar</>
                }
              </button>
              <button
                onClick={() => onDismiss(sug.id)}
                disabled={isApplying}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '6px 0', borderRadius: 7, border: `1px solid ${C.border}`,
                  background: C.white, color: C.slate,
                  fontSize: '0.78rem', fontWeight: 500, cursor: isApplying ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <X size={12} /> Ignorar
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
