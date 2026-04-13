'use client'

import { useState, useEffect } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'

type Lang = 'pt' | 'de'
type ReqStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
type TabType = 'vacation' | 'swap' | 'saldos'

interface EmployeeVacSummary {
  id: string; name: string; shortName: string; workPercentage: number;
  entitlement: number; approved: number; pending: number; remaining: number;
}
interface VacationRequest {
  id: string; startDate: string; endDate: string; status: ReqStatus;
  notes: string | null; managerNote: string | null; createdAt: string;
  employee: { name: string; shortName: string }
}
interface SwapRequest {
  id: string; requesterDate: string; targetDate: string; status: ReqStatus;
  requesterMessage: string | null; managerNote: string | null; createdAt: string;
  requester: { name: string; shortName: string };
  targetEmployee: { name: string; shortName: string };
}

const STATUS_COLORS: Record<ReqStatus, { bg: string; color: string; label: { pt: string; de: string } }> = {
  PENDING:   { bg: '#FEF3C7', color: '#D97706', label: { pt: 'Pendente', de: 'Ausstehend' } },
  APPROVED:  { bg: '#D1FAE5', color: '#059669', label: { pt: 'Aprovado', de: 'Genehmigt' } },
  REJECTED:  { bg: '#FEE2E2', color: '#DC2626', label: { pt: 'Rejeitado', de: 'Abgelehnt' } },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: { pt: 'Cancelado', de: 'Abgebrochen' } },
}

const t = {
  pt: {
    title: 'Aprovações', subtitle: 'Pedidos de férias e trocas de turno',
    vacation: 'Férias', swap: 'Trocas', saldos: 'Saldos',
    approve: 'Aprovar', reject: 'Rejeitar',
    noteLabel: 'Nota (opcional)', noteBtn: 'Adicionar nota',
    empty: 'Sem pedidos pendentes.', allEmpty: 'Sem pedidos.',
    from: 'de', to: 'a', for: 'para',
    managerNote: 'Nota do gestor', lang: 'DE',
    filterAll: 'Todos', filterPending: 'Pendentes',
    entitlement: 'Direito', approved: 'Gozadas', pending: 'Pendentes', remaining: 'Restantes', days: 'dias',
  },
  de: {
    title: 'Genehmigungen', subtitle: 'Urlaubs- und Schichttauschanfragen',
    vacation: 'Urlaub', swap: 'Schichttausch',
    approve: 'Genehmigen', reject: 'Ablehnen',
    noteLabel: 'Notiz (optional)', noteBtn: 'Notiz hinzufügen',
    empty: 'Keine ausstehenden Anfragen.', allEmpty: 'Keine Anfragen.',
    from: 'von', to: 'bis', for: 'für',
    managerNote: 'Manager-Notiz', lang: 'PT',
    filterAll: 'Alle', filterPending: 'Ausstehend',
    saldos: 'Salden',
    entitlement: 'Anspruch', approved: 'Genommen', pending: 'Ausstehend', remaining: 'Verbleibend', days: 'Tage',
  },
}

export default function ManagerPedidosClient() {
  const [lang, setLang] = useState<Lang>('pt')
  const [tab, setTab] = useState<TabType>('vacation')
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')
  const [vacations, setVacations] = useState<VacationRequest[]>([])
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [empSummaries, setEmpSummaries] = useState<EmployeeVacSummary[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const currentYear = new Date().getFullYear()

  const tx = t[lang]

  useEffect(() => { load(); loadSummaries() }, [])

  async function loadSummaries() {
    const r = await fetch(`/api/manager/vacation-summary?year=${new Date().getFullYear()}`)
    if (r.ok) setEmpSummaries(await r.json())
  }

  async function load() {
    const [vr, sr] = await Promise.all([
      fetch('/api/requests/vacation').then(r => r.json()),
      fetch('/api/requests/swap').then(r => r.json()),
    ])
    if (Array.isArray(vr)) setVacations(vr)
    if (Array.isArray(sr)) setSwaps(sr)
  }

  async function actVacation(id: string, status: 'APPROVED' | 'REJECTED') {
    setActionLoading(id)
    await fetch(`/api/requests/vacation/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, managerNote: notes[id] || null }),
    })
    setActionLoading(null)
    await Promise.all([load(), loadSummaries()])
  }

  async function actSwap(id: string, status: 'APPROVED' | 'REJECTED') {
    setActionLoading(id)
    await fetch(`/api/requests/swap/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, managerNote: notes[id] || null }),
    })
    setActionLoading(null)
    await load()
  }

  const filteredVacations = filter === 'pending' ? vacations.filter(v => v.status === 'PENDING') : vacations
  const filteredSwaps = filter === 'pending' ? swaps.filter(s => s.status === 'PENDING') : swaps

  const pendingVacCount = vacations.filter(v => v.status === 'PENDING').length
  const pendingSwapCount = swaps.filter(s => s.status === 'PENDING').length

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto', background: '#F9F7F3', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '1.75rem', color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
            {tx.title}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#9A8F80' }}>{tx.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Filter */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as 'all' | 'pending')}
            style={{ padding: '6px 10px', background: 'white', border: '1px solid #E0D8CC', borderRadius: 6, color: '#6B6056', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            <option value="pending">{tx.filterPending}</option>
            <option value="all">{tx.filterAll}</option>
          </select>
          <button
            onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')}
            style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #D8D0C4', borderRadius: 6, color: '#6B6056', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {tx.lang}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E8E0D0', marginBottom: 24 }}>
        {(['vacation', 'swap', 'saldos'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid #C1440E' : '2px solid transparent',
              color: tab === t ? '#1A1816' : '#9A8F80',
              fontSize: '0.82rem', fontWeight: tab === t ? 500 : 400,
              cursor: 'pointer', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t === 'vacation' ? tx.vacation : t === 'swap' ? tx.swap : tx.saldos}
            {t === 'vacation' && pendingVacCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#C1440E', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{pendingVacCount}</span>
            )}
            {t === 'swap' && pendingSwapCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#C1440E', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{pendingSwapCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Vacation requests */}
      {tab === 'vacation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredVacations.length === 0 && (
            <p style={{ color: '#9A8F80', fontSize: '0.82rem', padding: '20px 0' }}>{filter === 'pending' ? tx.empty : tx.allEmpty}</p>
          )}
          {filteredVacations.map(v => {
            const s = STATUS_COLORS[v.status]
            const isPending = v.status === 'PENDING'
            return (
              <div key={v.id} style={{ background: 'white', border: '1px solid #E8E0D0', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1A1816' }}>{v.employee.name}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                        {s.label[lang]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#3A3530' }}>
                      {v.startDate} → {v.endDate}
                    </div>
                    {v.notes && <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#6B6056' }}>{v.notes}</p>}
                    {v.managerNote && !isPending && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#9A8F80' }}><em>{tx.managerNote}:</em> {v.managerNote}</p>
                    )}
                  </div>

                  {isPending && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => actVacation(v.id, 'APPROVED')}
                          disabled={actionLoading === v.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: '#059669', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.75rem', cursor: 'pointer', opacity: actionLoading === v.id ? 0.5 : 1 }}
                        >
                          <Check size={13} /> {tx.approve}
                        </button>
                        <button
                          onClick={() => actVacation(v.id, 'REJECTED')}
                          disabled={actionLoading === v.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: '#DC2626', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.75rem', cursor: 'pointer', opacity: actionLoading === v.id ? 0.5 : 1 }}
                        >
                          <X size={13} /> {tx.reject}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder={tx.noteLabel}
                        value={notes[v.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [v.id]: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid #E8E0D0', borderRadius: 6, fontSize: '0.75rem', color: '#1A1816', outline: 'none', width: 200, background: 'white' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Swap requests */}
      {tab === 'swap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredSwaps.length === 0 && (
            <p style={{ color: '#9A8F80', fontSize: '0.82rem', padding: '20px 0' }}>{filter === 'pending' ? tx.empty : tx.allEmpty}</p>
          )}
          {filteredSwaps.map(sw => {
            const s = STATUS_COLORS[sw.status]
            const isPending = sw.status === 'PENDING'
            return (
              <div key={sw.id} style={{ background: 'white', border: '1px solid #E8E0D0', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1A1816' }}>
                        {sw.requester.name} ↔ {sw.targetEmployee.name}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                        {s.label[lang]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#3A3530' }}>
                      <span style={{ color: '#6B6056' }}>{sw.requester.shortName}:</span> <strong>{sw.requesterDate}</strong>
                      {'  ↔  '}
                      <span style={{ color: '#6B6056' }}>{sw.targetEmployee.shortName}:</span> <strong>{sw.targetDate}</strong>
                    </div>
                    {sw.requesterMessage && <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#6B6056' }}>{sw.requesterMessage}</p>}
                    {sw.managerNote && !isPending && (
                      <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#9A8F80' }}><em>{tx.managerNote}:</em> {sw.managerNote}</p>
                    )}
                  </div>

                  {isPending && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => actSwap(sw.id, 'APPROVED')}
                          disabled={actionLoading === sw.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: '#059669', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.75rem', cursor: 'pointer', opacity: actionLoading === sw.id ? 0.5 : 1 }}
                        >
                          <Check size={13} /> {tx.approve}
                        </button>
                        <button
                          onClick={() => actSwap(sw.id, 'REJECTED')}
                          disabled={actionLoading === sw.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: '#DC2626', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.75rem', cursor: 'pointer', opacity: actionLoading === sw.id ? 0.5 : 1 }}
                        >
                          <X size={13} /> {tx.reject}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder={tx.noteLabel}
                        value={notes[sw.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [sw.id]: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid #E8E0D0', borderRadius: 6, fontSize: '0.75rem', color: '#1A1816', outline: 'none', width: 200, background: 'white' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Saldos de férias — all employees */}
      {tab === 'saldos' && (
        <div>
          <div style={{ marginBottom: 12, fontSize: '0.72rem', color: '#9A8F80', letterSpacing: '0.06em' }}>
            {currentYear} · {lang === 'pt' ? 'Dias úteis (seg–sáb). Direito: 25 dias × % contrato.' : 'Werktage (Mo–Sa). Anspruch: 25 Tage × Vertragsprozent.'}
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 70px 70px 80px', gap: 0, padding: '6px 14px', borderBottom: '1px solid #E8E0D0', marginBottom: 4 }}>
            {['Colaborador', tx.entitlement, tx.approved, tx.pending, tx.remaining, '%'].map(h => (
              <div key={h} style={{ fontSize: '0.65rem', color: '#9A8F80', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: h === 'Colaborador' ? 'left' : 'center' }}>{h}</div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {empSummaries.map(emp => {
              const pct = emp.entitlement > 0 ? Math.round((emp.approved / emp.entitlement) * 100) : 0
              const low = emp.remaining <= 2
              return (
                <div
                  key={emp.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 70px 70px 70px 80px',
                    gap: 0,
                    padding: '10px 14px',
                    background: 'white',
                    border: '1px solid #E8E0D0',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1A1816' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#9A8F80' }}>{emp.workPercentage}%</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#6B6056' }}>{emp.entitlement}</div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, background: '#D1FAE5', color: '#059669', fontSize: '0.78rem', fontWeight: 500 }}>{emp.approved}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {emp.pending > 0
                      ? <span style={{ padding: '2px 8px', borderRadius: 12, background: '#FEF3C7', color: '#D97706', fontSize: '0.78rem', fontWeight: 500 }}>{emp.pending}</span>
                      : <span style={{ color: '#C8C0B4', fontSize: '0.78rem' }}>—</span>
                    }
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, background: low ? '#FEE2E2' : '#F5F0E8', color: low ? '#DC2626' : '#6B6056', fontSize: '0.78rem', fontWeight: 500 }}>{emp.remaining}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ height: 6, background: '#F0EBE3', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#059669', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#9A8F80', marginTop: 2, textAlign: 'right' }}>{pct}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
