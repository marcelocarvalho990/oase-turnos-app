'use client'

import { useState, useEffect } from 'react'
import { Check, X, Trash2, AlertTriangle } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import { useIsMobile } from '@/hooks/useIsMobile'

import type { Lang } from '@/hooks/useLang'
type ReqStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
type TabType = 'vacation' | 'swap' | 'saldos' | 'wunschfrei'

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
interface WunschfreiRequest {
  id: string; date: string; year: number; month: number; status: ReqStatus;
  managerNote: string | null; createdAt: string;
  employee: { name: string; shortName: string };
}

const STATUS_COLORS: Record<ReqStatus, { bg: string; color: string; label: Record<Lang, string> }> = {
  PENDING:   { bg: '#FEF3C7', color: '#D97706', label: { pt: 'Pendente',  de: 'Ausstehend', en: 'Pending',   fr: 'En attente', it: 'In attesa'  } },
  APPROVED:  { bg: '#D1FAE5', color: '#059669', label: { pt: 'Aprovado',  de: 'Genehmigt',  en: 'Approved',  fr: 'Approuvé',   it: 'Approvato'  } },
  REJECTED:  { bg: '#FEE2E2', color: '#DC2626', label: { pt: 'Rejeitado', de: 'Abgelehnt',  en: 'Rejected',  fr: 'Refusé',     it: 'Rifiutato'  } },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: { pt: 'Cancelado', de: 'Abgebrochen',en: 'Cancelled', fr: 'Annulé',     it: 'Annullato'  } },
}

const t: Record<Lang, {
  title: string; subtitle: string; vacation: string; swap: string; saldos: string; wunschfrei: string;
  approve: string; reject: string; noteLabel: string; noteBtn: string;
  empty: string; allEmpty: string; from: string; to: string; for: string;
  managerNote: string; filterAll: string; filterPending: string;
  entitlement: string; approved: string; pending: string; remaining: string; days: string;
  wunschfreiDate: string; wunschfreiRequested: string;
  message: string; deleteReq: string; deleteBtn: string; cancel: string;
  deleteConfirm: string; deleteConfirmSub: string; vacationPfx: string; colEmployee: string;
}> = {
  pt: {
    title: 'Aprovações', subtitle: 'Pedidos de férias, trocas de turno e Wunschfrei',
    vacation: 'Férias', swap: 'Trocas', saldos: 'Saldos', wunschfrei: 'Wunschfrei',
    approve: 'Aprovar', reject: 'Rejeitar',
    noteLabel: 'Nota (opcional)', noteBtn: 'Adicionar nota',
    empty: 'Sem pedidos pendentes.', allEmpty: 'Sem pedidos.',
    from: 'de', to: 'a', for: 'para',
    managerNote: 'Nota do gestor',
    filterAll: 'Todos', filterPending: 'Pendentes',
    entitlement: 'Direito', approved: 'Gozadas', pending: 'Pendentes', remaining: 'Restantes', days: 'dias',
    wunschfreiDate: 'Data', wunschfreiRequested: 'Pedido em',
    message: 'Mensagem', deleteReq: 'Apagar pedido', deleteBtn: 'Apagar', cancel: 'Cancelar',
    deleteConfirm: 'Apagar pedido de férias?', deleteConfirmSub: 'Esta ação não pode ser desfeita.',
    vacationPfx: 'Dias úteis (seg–sáb). Direito: 25 dias × % contrato.', colEmployee: 'Colaborador',
  },
  de: {
    title: 'Genehmigungen', subtitle: 'Urlaubs-, Schichttausch- und Wunschfreitag-Anfragen',
    vacation: 'Urlaub', swap: 'Schichttausch', saldos: 'Salden', wunschfrei: 'Wunschfrei',
    approve: 'Genehmigen', reject: 'Ablehnen',
    noteLabel: 'Notiz (optional)', noteBtn: 'Notiz hinzufügen',
    empty: 'Keine ausstehenden Anfragen.', allEmpty: 'Keine Anfragen.',
    from: 'von', to: 'bis', for: 'für',
    managerNote: 'Manager-Notiz',
    filterAll: 'Alle', filterPending: 'Ausstehend',
    entitlement: 'Anspruch', approved: 'Genommen', pending: 'Ausstehend', remaining: 'Verbleibend', days: 'Tage',
    wunschfreiDate: 'Datum', wunschfreiRequested: 'Beantragt am',
    message: 'Nachricht', deleteReq: 'Antrag löschen', deleteBtn: 'Löschen', cancel: 'Abbrechen',
    deleteConfirm: 'Urlaubsantrag löschen?', deleteConfirmSub: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    vacationPfx: 'Werktage (Mo–Sa). Anspruch: 25 Tage × Vertragsprozent.', colEmployee: 'Mitarbeiter',
  },
  en: {
    title: 'Approvals', subtitle: 'Vacation, shift swap and Wunschfrei requests',
    vacation: 'Vacation', swap: 'Swaps', saldos: 'Balances', wunschfrei: 'Wunschfrei',
    approve: 'Approve', reject: 'Reject',
    noteLabel: 'Note (optional)', noteBtn: 'Add note',
    empty: 'No pending requests.', allEmpty: 'No requests.',
    from: 'from', to: 'to', for: 'for',
    managerNote: 'Manager note',
    filterAll: 'All', filterPending: 'Pending',
    entitlement: 'Entitlement', approved: 'Used', pending: 'Pending', remaining: 'Remaining', days: 'days',
    wunschfreiDate: 'Date', wunschfreiRequested: 'Requested on',
    message: 'Message', deleteReq: 'Delete request', deleteBtn: 'Delete', cancel: 'Cancel',
    deleteConfirm: 'Delete vacation request?', deleteConfirmSub: 'This action cannot be undone.',
    vacationPfx: 'Working days (Mon–Sat). Entitlement: 25 days × contract %.', colEmployee: 'Employee',
  },
  fr: {
    title: 'Approbations', subtitle: 'Demandes de congés, échanges de postes et Wunschfrei',
    vacation: 'Congés', swap: 'Échanges', saldos: 'Soldes', wunschfrei: 'Wunschfrei',
    approve: 'Approuver', reject: 'Refuser',
    noteLabel: 'Note (facultatif)', noteBtn: 'Ajouter une note',
    empty: 'Aucune demande en attente.', allEmpty: 'Aucune demande.',
    from: 'du', to: 'au', for: 'pour',
    managerNote: 'Note du responsable',
    filterAll: 'Toutes', filterPending: 'En attente',
    entitlement: 'Droit', approved: 'Pris', pending: 'En attente', remaining: 'Restants', days: 'jours',
    wunschfreiDate: 'Date', wunschfreiRequested: 'Demandé le',
    message: 'Message', deleteReq: 'Supprimer la demande', deleteBtn: 'Supprimer', cancel: 'Annuler',
    deleteConfirm: 'Supprimer la demande de congé ?', deleteConfirmSub: 'Cette action est irréversible.',
    vacationPfx: 'Jours ouvrables (lun–sam). Droit : 25 jours × % contrat.', colEmployee: 'Collaborateur',
  },
  it: {
    title: 'Approvazioni', subtitle: 'Richieste di ferie, scambi di turno e Wunschfrei',
    vacation: 'Ferie', swap: 'Scambi', saldos: 'Saldi', wunschfrei: 'Wunschfrei',
    approve: 'Approva', reject: 'Rifiuta',
    noteLabel: 'Nota (opzionale)', noteBtn: 'Aggiungi nota',
    empty: 'Nessuna richiesta in attesa.', allEmpty: 'Nessuna richiesta.',
    from: 'dal', to: 'al', for: 'per',
    managerNote: 'Nota del responsabile',
    filterAll: 'Tutte', filterPending: 'In attesa',
    entitlement: 'Diritto', approved: 'Usate', pending: 'In attesa', remaining: 'Rimanenti', days: 'giorni',
    wunschfreiDate: 'Data', wunschfreiRequested: 'Richiesto il',
    message: 'Messaggio', deleteReq: 'Elimina richiesta', deleteBtn: 'Elimina', cancel: 'Annulla',
    deleteConfirm: 'Eliminare la richiesta di ferie?', deleteConfirmSub: 'Questa azione non può essere annullata.',
    vacationPfx: 'Giorni lavorativi (lun–sab). Diritto: 25 giorni × % contratto.', colEmployee: 'Collaboratore',
  },
}

export default function ManagerPedidosClient() {
  const [lang] = useLang()
  const [tab, setTab] = useState<TabType>('vacation')
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')
  const [vacations, setVacations] = useState<VacationRequest[]>([])
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [empSummaries, setEmpSummaries] = useState<EmployeeVacSummary[]>([])
  const [wunschfreiList, setWunschfreiList] = useState<WunschfreiRequest[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState('')
  const currentYear = new Date().getFullYear()

  const tx = t[lang]
  const isMobile = useIsMobile()

  useEffect(() => { load(); loadSummaries(); loadWunschfrei() }, [])

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

  async function loadWunschfrei() {
    const r = await fetch('/api/manager/wunschfrei')
    if (r.ok) setWunschfreiList(await r.json())
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

  async function actWunschfrei(id: string, status: 'APPROVED' | 'REJECTED') {
    setActionLoading(id)
    await fetch(`/api/requests/wunschfrei/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, managerNote: notes[id] || null }),
    })
    setActionLoading(null)
    await loadWunschfrei()
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
  const filteredWunschfrei = filter === 'pending' ? wunschfreiList.filter(w => w.status === 'PENDING') : wunschfreiList

  const pendingVacCount = vacations.filter(v => v.status === 'PENDING').length
  const pendingSwapCount = swaps.filter(s => s.status === 'PENDING').length
  const pendingWfCount = wunschfreiList.filter(w => w.status === 'PENDING').length

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Page header */}
      <div style={{ background: '#003A5D', padding: isMobile ? '14px 16px' : '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        </div>
      </div>
      <div style={{ padding: isMobile ? '14px 16px' : '20px 28px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #D8E2E8', marginBottom: 24, overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none' }}>
        {(['vacation', 'swap', 'wunschfrei', 'saldos'] as TabType[]).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            style={{
              padding: isMobile ? '10px 12px' : '10px 20px', background: 'transparent', border: 'none',
              borderBottom: tab === tabKey ? '2px solid #003A5D' : '2px solid transparent',
              color: tab === tabKey ? '#001E30' : '#7A9BAD',
              fontSize: '0.82rem', fontWeight: tab === tabKey ? 500 : 400,
              cursor: 'pointer', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            {tabKey === 'vacation' ? tx.vacation : tabKey === 'swap' ? tx.swap : tabKey === 'wunschfrei' ? tx.wunschfrei : tx.saldos}
            {tabKey === 'vacation' && pendingVacCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#003A5D', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{pendingVacCount}</span>
            )}
            {tabKey === 'swap' && pendingSwapCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#003A5D', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{pendingSwapCount}</span>
            )}
            {tabKey === 'wunschfrei' && pendingWfCount > 0 && (
              <span style={{ padding: '1px 7px', background: '#003A5D', color: 'white', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600 }}>{pendingWfCount}</span>
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
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>{tx.message}</span>
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
                          style={{ padding: '6px 10px', border: '1px solid #D8E2E8', borderRadius: 6, fontSize: '0.75rem', color: '#001E30', outline: 'none', width: isMobile ? '100%' : 200, background: 'white' }}
                        />
                      </>
                    )}
                    <button
                      onClick={() => openDeleteConfirm(v.id, `${v.employee.name} · ${v.startDate} → ${v.endDate}`)}
                      disabled={deleteLoading === v.id}
                      title={tx.deleteReq}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', border: '1px solid #F87171', borderRadius: 6, color: '#DC2626', fontSize: '0.72rem', cursor: 'pointer', opacity: deleteLoading === v.id ? 0.5 : 1 }}
                    >
                      <Trash2 size={12} /> {tx.deleteBtn}
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
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>{tx.message}</span>
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
                        style={{ padding: '6px 10px', border: '1px solid #D8E2E8', borderRadius: 6, fontSize: '0.75rem', color: '#001E30', outline: 'none', width: isMobile ? '100%' : 200, background: 'white' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Wunschfrei requests */}
      {tab === 'wunschfrei' && (
        <div key="wunschfrei" className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredWunschfrei.length === 0 && (
            <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>{filter === 'pending' ? tx.empty : tx.allEmpty}</p>
          )}
          {filteredWunschfrei.map(wf => {
            const s = STATUS_COLORS[wf.status]
            const isPending = wf.status === 'PENDING'
            return (
              <div key={wf.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#001E30' }}>{wf.employee.name}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                        {s.label[lang]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#3A3530', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                      {wf.date}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#7A9BAD', marginTop: 2 }}>
                      {tx.wunschfreiRequested} {new Date(wf.createdAt).toLocaleDateString({ pt: 'pt-PT', de: 'de-DE', en: 'en-GB', fr: 'fr-FR', it: 'it-IT' }[lang])}
                    </div>
                    {wf.managerNote && !isPending && (
                      <div style={{ margin: '6px 0 0', padding: '6px 10px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 6, fontSize: '0.75rem', color: '#0369A1' }}>
                        <em>{tx.managerNote}:</em> {wf.managerNote}
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => actWunschfrei(wf.id, 'APPROVED')}
                          disabled={actionLoading === wf.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: '#059669', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.75rem', cursor: 'pointer', opacity: actionLoading === wf.id ? 0.5 : 1 }}
                        >
                          <Check size={13} /> {tx.approve}
                        </button>
                        <button
                          onClick={() => actWunschfrei(wf.id, 'REJECTED')}
                          disabled={actionLoading === wf.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: '#DC2626', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.75rem', cursor: 'pointer', opacity: actionLoading === wf.id ? 0.5 : 1 }}
                        >
                          <X size={13} /> {tx.reject}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder={tx.noteLabel}
                        value={notes[wf.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [wf.id]: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid #D8E2E8', borderRadius: 6, fontSize: '0.75rem', color: '#001E30', outline: 'none', width: isMobile ? '100%' : 200, background: 'white' }}
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
            {currentYear} · {tx.vacationPfx}
          </div>

          {isMobile ? (
            /* Mobile: stacked employee cards */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {empSummaries.map(emp => {
                const pct = emp.entitlement > 0 ? Math.round((emp.approved / emp.entitlement) * 100) : 0
                const low = emp.remaining <= 2
                return (
                  <div key={emp.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#001E30' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#7A9BAD' }}>{emp.workPercentage}%</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 12, background: low ? '#FEE2E2' : '#F4F6F8', color: low ? '#DC2626' : '#4A6878', fontSize: '0.78rem', fontWeight: 600 }}>
                        {emp.remaining} {tx.days}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                      <div style={{ textAlign: 'center', padding: '6px 4px', background: '#F4F6F8', borderRadius: 6 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#4A6878', lineHeight: 1 }}>{emp.entitlement}</div>
                        <div style={{ fontSize: '0.6rem', color: '#7A9BAD', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tx.entitlement}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 4px', background: '#D1FAE5', borderRadius: 6 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669', lineHeight: 1 }}>{emp.approved}</div>
                        <div style={{ fontSize: '0.6rem', color: '#059669', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tx.approved}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 4px', background: emp.pending > 0 ? '#FEF3C7' : '#F4F6F8', borderRadius: 6 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: emp.pending > 0 ? '#D97706' : '#C8C0B4', lineHeight: 1 }}>{emp.pending}</div>
                        <div style={{ fontSize: '0.6rem', color: emp.pending > 0 ? '#D97706' : '#7A9BAD', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tx.pending}</div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#F0EBE3', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#059669', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#7A9BAD', marginTop: 2, textAlign: 'right' }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {/* Desktop: Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 70px 70px 80px', gap: 0, padding: '6px 14px', borderBottom: '1px solid #D8E2E8', marginBottom: 4 }}>
                {[tx.colEmployee, tx.entitlement, tx.approved, tx.pending, tx.remaining, '%'].map(h => (
                  <div key={h} style={{ fontSize: '0.65rem', color: '#7A9BAD', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left' }}>{h}</div>
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
            </>
          )}
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
                  {tx.deleteConfirm}
                </h3>
                <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#7A9BAD', lineHeight: 1.5 }}>
                  {confirmDeleteLabel}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  {tx.deleteConfirmSub}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ flex: 1, padding: '10px 0', background: '#F4F6F8', border: '1px solid #D8E2E8', borderRadius: 8, color: '#4A6878', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
              >
                {tx.cancel}
              </button>
              <button
                onClick={confirmDelete}
                style={{ flex: 1, padding: '10px 0', background: '#DC2626', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {tx.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
