'use client'

import { useState, useEffect } from 'react'
import { Check, X, ChevronDown, Trash2, AlertTriangle } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

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
  const [lang, toggleLang] = useLang()
  const [tab, setTab] = useState<TabType>('vacation')
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')
  const [vacations, setVacations] = useState<VacationRequest[]>([])
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [empSummaries, setEmpSummaries] = useState<EmployeeVacSummary[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState('')
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


  function openDeleteConfirm(id: string, label: string) {
    setConfirmDeleteId(id)
    setConfirmDeleteLabel(label)
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return
    setDeleteLoading(confirmDeleteId)
    setConfirmDeleteId(null)
    await fetch(`/api/requests/vacation/${confirmDeleteId}`, { method: 'DELETE' })
    setDeleteLoading(null)
    await Promise.all([load(), loadSummaries()])
  }

  const filteredVacations = filter === 'pending' ? vacations.filter(v => v.status === 'PENDING') : vacations
  const filteredSwaps = filter === 'pending' ? swaps.filter(s => s.status === 'PENDING') : swaps

  const pendingVacCount = vacations.filter(v => v.status === 'PENDING').length
  const pendingSwapCount = swaps.filter(s => s.status === 'PENDING').length

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Page header */}
      <div style={{ background: '#003A5D', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {tx.title}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>{tx.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={filter} onChange={e => setFilter(e.target.value as 'all' | 'pending')} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, color: 'white', fontSize: '0.72rem', cursor: 'pointer' }}>
            <option value="pending" style={{ background: '#003A5D' }}>{tx.filterPending}</option>
            <option value="all" style={{ background: '#003A5D' }}>{tx.filterAll}</option>
          </select>
          <button onClick={toggleLang} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {tx.lang}
          </button>
        </div>
      </div>
      <div style={{ padding: '20px 28px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #D8E2E8', marginBottom: 24 }}>
        {(['vacation', 'swap', 'saldos'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid #003A5D' : '2px solid transparent',
              color: tab === t ? '#001E30' : '#7A9BAD',
              fontSize: '0.82rem', fontWeight: tab === t ? 500 : 400,
              cursor: 'pointer', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t === 'vacation' ? tx.vacation : t === 'swap' ? tx.swap : tx.saldos}
            {t === 'vacation' && pendingVacCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#003A5D', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{pendingVacCount}</span>
            )}
            {t === 'swap' && pendingSwapCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#003A5D', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{pendingSwapCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'vacation' && (
        <div key="vacation" className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredVacations.length === 0 && (
            <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>{filter === 'pending' ? tx.empty : tx.allEmpty}</p>
          )}
          {filteredVacations.map(v => {
            const s = STATUS_COLORS[v.status]
            const isPending = v.status === 'PENDING'
            return (
              <div key={v.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#001E30' }}>{v.employee.name}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                        {s.label[lang]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#3A3530' }}>
                      {v.startDate} → {v.endDate}
                    </div>
                    {v.notes && (
                      <div style={{ margin: '8px 0 0', padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '3px solid #94A3B8', borderRadius: 6, fontSize: '0.78rem', color: '#3A4A5C', lineHeight: 1.5 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>{lang === 'pt' ? 'Mensagem' : 'Nachricht'}</span>
                        {v.notes}
                      </div>
                    )}
                    {v.managerNote && !isPending && (
                      <div style={{ margin: '6px 0 0', padding: '6px 10px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 6, fontSize: '0.75rem', color: '#0369A1' }}>
                        <em>{tx.managerNote}:</em> {v.managerNote}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                    {isPending && (
                      <>
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
                          style={{ padding: '6px 10px', border: '1px solid #D8E2E8', borderRadius: 6, fontSize: '0.75rem', color: '#001E30', outline: 'none', width: 200, background: 'white' }}
                        />
                      </>
                    )}
                    <button
                      onClick={() => openDeleteConfirm(v.id, `${v.employee.name} · ${v.startDate} → ${v.endDate}`)}
                      disabled={deleteLoading === v.id}
                      title={lang === 'pt' ? 'Apagar pedido' : 'Antrag löschen'}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', border: '1px solid #F87171', borderRadius: 6, color: '#DC2626', fontSize: '0.72rem', cursor: 'pointer', opacity: deleteLoading === v.id ? 0.5 : 1 }}
                    >
                      <Trash2 size={12} /> {lang === 'pt' ? 'Apagar' : 'Löschen'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Swap requests */}
      {tab === 'swap' && (
        <div key="swap" className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredSwaps.length === 0 && (
            <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>{filter === 'pending' ? tx.empty : tx.allEmpty}</p>
          )}
          {filteredSwaps.map(sw => {
            const s = STATUS_COLORS[sw.status]
            const isPending = sw.status === 'PENDING'
            return (
              <div key={sw.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#001E30' }}>
                        {sw.requester.name} ↔ {sw.targetEmployee.name}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                        {s.label[lang]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#3A3530' }}>
                      <span style={{ color: '#4A6878' }}>{sw.requester.shortName}:</span> <strong>{sw.requesterDate}</strong>
                      {'  ↔  '}
                      <span style={{ color: '#4A6878' }}>{sw.targetEmployee.shortName}:</span> <strong>{sw.targetDate}</strong>
                    </div>
                    {sw.requesterMessage && (
                      <div style={{ margin: '8px 0 0', padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '3px solid #94A3B8', borderRadius: 6, fontSize: '0.78rem', color: '#3A4A5C', lineHeight: 1.5 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>{lang === 'pt' ? 'Mensagem' : 'Nachricht'}</span>
                        {sw.requesterMessage}
                      </div>
                    )}
                    {sw.managerNote && !isPending && (
                      <div style={{ margin: '6px 0 0', padding: '6px 10px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 6, fontSize: '0.75rem', color: '#0369A1' }}>
                        <em>{tx.managerNote}:</em> {sw.managerNote}
                      </div>
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
                        style={{ padding: '6px 10px', border: '1px solid #D8E2E8', borderRadius: 6, fontSize: '0.75rem', color: '#001E30', outline: 'none', width: 200, background: 'white' }}
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
        <div key="saldos" className="tab-content">
          <div style={{ marginBottom: 12, fontSize: '0.72rem', color: '#7A9BAD', letterSpacing: '0.06em' }}>
            {currentYear} · {lang === 'pt' ? 'Dias úteis (seg–sáb). Direito: 25 dias × % contrato.' : 'Werktage (Mo–Sa). Anspruch: 25 Tage × Vertragsprozent.'}
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 70px 70px 80px', gap: 0, padding: '6px 14px', borderBottom: '1px solid #D8E2E8', marginBottom: 4 }}>
            {[lang === 'de' ? 'Mitarbeiter' : 'Colaborador', tx.entitlement, tx.approved, tx.pending, tx.remaining, '%'].map(h => (
              <div key={h} style={{ fontSize: '0.65rem', color: '#7A9BAD', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: (h === 'Colaborador' || h === 'Mitarbeiter') ? 'left' : 'center' }}>{h}</div>
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
                    border: '1px solid #D8E2E8',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#001E30' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#7A9BAD' }}>{emp.workPercentage}%</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#4A6878' }}>{emp.entitlement}</div>
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
                    <span style={{ padding: '2px 8px', borderRadius: 12, background: low ? '#FEE2E2' : '#F4F6F8', color: low ? '#DC2626' : '#4A6878', fontSize: '0.78rem', fontWeight: 500 }}>{emp.remaining}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ height: 6, background: '#F0EBE3', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#059669', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#7A9BAD', marginTop: 2, textAlign: 'right' }}>{pct}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </div>{/* /padding wrapper */}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 28px', maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="#DC2626" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#001E30' }}>
                  {lang === 'pt' ? 'Apagar pedido de férias?' : 'Urlaubsantrag löschen?'}
                </h3>
                <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#7A9BAD', lineHeight: 1.5 }}>
                  {confirmDeleteLabel}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  {lang === 'pt' ? 'Esta ação não pode ser desfeita.' : 'Diese Aktion kann nicht rückgängig gemacht werden.'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ flex: 1, padding: '10px 0', background: '#F4F6F8', border: '1px solid #D8E2E8', borderRadius: 8, color: '#4A6878', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
              >
                {lang === 'pt' ? 'Cancelar' : 'Abbrechen'}
              </button>
              <button
                onClick={confirmDelete}
                style={{ flex: 1, padding: '10px 0', background: '#DC2626', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {lang === 'pt' ? 'Apagar' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
