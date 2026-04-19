'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

type Lang = 'pt' | 'de'
type ReqStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

interface Colleague { id: string; name: string; shortName: string }
interface VacationSummary { entitlement: number; approved: number; pending: number; remaining: number }
interface VacationRequest {
  id: string; startDate: string; endDate: string; status: ReqStatus; notes: string | null; managerNote: string | null; createdAt: string
}
interface SwapRequest {
  id: string; requesterDate: string; targetDate: string; status: ReqStatus;
  requesterMessage: string | null; managerNote: string | null; createdAt: string;
  requester: { name: string; shortName: string };
  targetEmployee: { name: string; shortName: string };
  requesterId: string; targetEmployeeId: string;
}
interface WunschfreiRequest {
  id: string; date: string; year: number; month: number; status: ReqStatus;
  managerNote: string | null; createdAt: string;
}

const STATUS_COLORS: Record<ReqStatus, { bg: string; color: string; label: { pt: string; de: string } }> = {
  PENDING:   { bg: '#FEF3C7', color: '#D97706', label: { pt: 'Pendente', de: 'Ausstehend' } },
  APPROVED:  { bg: '#D1FAE5', color: '#059669', label: { pt: 'Aprovado', de: 'Genehmigt' } },
  REJECTED:  { bg: '#FEE2E2', color: '#DC2626', label: { pt: 'Rejeitado', de: 'Abgelehnt' } },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: { pt: 'Cancelado', de: 'Abgebrochen' } },
}

const t = {
  pt: {
    title: 'Os Meus Pedidos',
    subtitle: 'Férias, trocas de turno e Wunschfrei',
    vacationBalance: 'Saldo de Férias',
    entitlement: 'Direito', approved: 'Gozadas', pending: 'Pendentes', remaining: 'Restantes',
    days: 'dias',
    vacation: 'Férias', swap: 'Troca de Turno', wunschfrei: 'Wunschfrei',
    newVacation: 'Pedir Férias', newSwap: 'Pedir Troca',
    startDate: 'Data de início', endDate: 'Data de fim',
    message: 'Mensagem (opcional)', submit: 'Submeter',
    submitting: 'A submeter...', cancel: 'Cancelar',
    cancelRequest: 'Cancelar pedido',
    targetEmployee: 'Colaborador', myDate: 'O meu turno (data)', theirDate: 'Turno deles (data)',
    managerNote: 'Nota do gestor', empty: 'Sem pedidos para mostrar.',
    from: 'de', to: 'a', lang: 'DE',
    you: '(tu)', them: 'deles',
    confirmCancel: 'Cancelar este pedido?',
    wunschfreiLabel: 'Dias Livres (Wunschfrei)',
    wunschfreiCounter: (n: number) => `${n} / 4 dias selecionados este mês`,
    wunschfreiAddDate: 'Adicionar data',
    wunschfreiAdd: 'Adicionar',
    wunschfreiEmpty: 'Nenhum dia Wunschfrei pedido este mês.',
    wunschfreiMaxError: 'Limite de 4 dias Wunschfrei por mês atingido.',
    wunschfreiPickDate: 'Escolhe uma data',
  },
  de: {
    title: 'Meine Anfragen',
    subtitle: 'Urlaub, Schichttausch und Wunschfrei',
    vacationBalance: 'Urlaubskonto',
    entitlement: 'Anspruch', approved: 'Genommen', pending: 'Ausstehend', remaining: 'Verbleibend',
    days: 'Tage',
    vacation: 'Urlaub', swap: 'Schichttausch', wunschfrei: 'Wunschfrei',
    newVacation: 'Urlaub beantragen', newSwap: 'Tausch beantragen',
    startDate: 'Startdatum', endDate: 'Enddatum',
    message: 'Nachricht (optional)', submit: 'Einreichen',
    submitting: 'Wird eingereicht...', cancel: 'Abbrechen',
    cancelRequest: 'Anfrage abbrechen',
    targetEmployee: 'Mitarbeiter', myDate: 'Meine Schicht (Datum)', theirDate: 'Ihre Schicht (Datum)',
    managerNote: 'Manager-Notiz', empty: 'Keine Anfragen vorhanden.',
    from: 'von', to: 'bis', lang: 'PT',
    you: '(du)', them: 'von ihnen',
    confirmCancel: 'Diese Anfrage abbrechen?',
    wunschfreiLabel: 'Wunschtage',
    wunschfreiCounter: (n: number) => `${n} / 4 Tage diesen Monat ausgewählt`,
    wunschfreiAddDate: 'Datum hinzufügen',
    wunschfreiAdd: 'Hinzufügen',
    wunschfreiEmpty: 'Keine Wunschtage diesen Monat beantragt.',
    wunschfreiMaxError: 'Limit von 4 Wunschtagen pro Monat erreicht.',
    wunschfreiPickDate: 'Datum wählen',
  },
}

type ActiveTab = 'vacation' | 'swap' | 'wunschfrei'
type FormMode = null | 'vacation' | 'swap'

interface Props { employeeId: string; colleagues: Colleague[] }

export default function EmployeePedidosClient({ employeeId, colleagues }: Props) {
  const [lang, toggleLang] = useLang()
  const [tab, setTab] = useState<ActiveTab>('vacation')
  const [form, setForm] = useState<FormMode>(null)
  const [vacations, setVacations] = useState<VacationRequest[]>([])
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [wunschfreiList, setWunschfreiList] = useState<WunschfreiRequest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<VacationSummary | null>(null)
  const tx = t[lang]
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Vacation form state
  const [vStartDate, setVStartDate] = useState('')
  const [vEndDate, setVEndDate] = useState('')
  const [vMessage, setVMessage] = useState('')

  // Swap form state
  const [sTarget, setSTarget] = useState('')
  const [sMyDate, setSMyDate] = useState('')
  const [sTheirDate, setSTheirDate] = useState('')
  const [sMessage, setSMessage] = useState('')

  // Wunschfrei form state
  const [wfDate, setWfDate] = useState('')
  const [wfSubmitting, setWfSubmitting] = useState(false)
  const [wfError, setWfError] = useState('')

  useEffect(() => { loadVacations(); loadSwaps(); loadSummary(); loadWunschfrei() }, [])

  async function loadSummary() {
    const r = await fetch(`/api/employee/vacation-summary?year=${new Date().getFullYear()}`)
    if (r.ok) setSummary(await r.json())
  }

  async function loadVacations() {
    const r = await fetch('/api/requests/vacation')
    if (r.ok) setVacations(await r.json())
  }

  async function loadSwaps() {
    const r = await fetch('/api/requests/swap')
    if (r.ok) setSwaps(await r.json())
  }

  async function loadWunschfrei() {
    const r = await fetch(`/api/requests/wunschfrei?year=${currentYear}&month=${currentMonth}`)
    if (r.ok) setWunschfreiList(await r.json())
  }

  async function submitVacation(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    const r = await fetch('/api/requests/vacation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: vStartDate, endDate: vEndDate, notes: vMessage }),
    })
    setSubmitting(false)
    if (!r.ok) { setError((await r.json()).error || 'Erro'); return }
    setForm(null); setVStartDate(''); setVEndDate(''); setVMessage('')
    await Promise.all([loadVacations(), loadSummary()])
  }

  async function submitSwap(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    const r = await fetch('/api/requests/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmployeeId: sTarget, requesterDate: sMyDate, targetDate: sTheirDate, requesterMessage: sMessage }),
    })
    setSubmitting(false)
    if (!r.ok) { setError((await r.json()).error || 'Erro'); return }
    setForm(null); setSTarget(''); setSMyDate(''); setSTheirDate(''); setSMessage('')
    await loadSwaps()
  }

  async function submitWunschfrei(e: React.FormEvent) {
    e.preventDefault()
    setWfError('')
    if (!wfDate) { setWfError(tx.wunschfreiPickDate); return }

    const activeCount = wunschfreiList.filter(w => w.status === 'PENDING' || w.status === 'APPROVED').length
    if (activeCount >= 4) { setWfError(tx.wunschfreiMaxError); return }

    setWfSubmitting(true)
    const r = await fetch('/api/requests/wunschfrei', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: wfDate, year: currentYear, month: currentMonth }),
    })
    setWfSubmitting(false)
    if (!r.ok) { setWfError((await r.json()).error || 'Erro'); return }
    setWfDate('')
    await loadWunschfrei()
  }

  async function cancelVacation(id: string) {
    if (!confirm(tx.confirmCancel)) return
    await fetch(`/api/requests/vacation/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    })
    await Promise.all([loadVacations(), loadSummary()])
  }

  async function cancelSwap(id: string) {
    if (!confirm(tx.confirmCancel)) return
    await fetch(`/api/requests/swap/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    })
    await loadSwaps()
  }

  async function cancelWunschfrei(id: string) {
    if (!confirm(tx.confirmCancel)) return
    await fetch(`/api/requests/wunschfrei/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    })
    await loadWunschfrei()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: 'white',
    border: '1px solid #D8E2E8', borderRadius: 6,
    color: '#001E30', fontSize: '0.85rem', outline: 'none',
    boxSizing: 'border-box',
  }

  const activeWfCount = wunschfreiList.filter(w => w.status === 'PENDING' || w.status === 'APPROVED').length

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
        <button onClick={toggleLang} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {tx.lang}
        </button>
      </div>

      <div style={{ padding: '20px 28px' }}>

      {/* Vacation balance card */}
      {summary && (
        <div style={{ background: 'white', border: '1px solid #D8E2E8', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: '0.68rem', color: '#7A9BAD', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            {tx.vacationBalance} · {currentYear}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {([
              { label: tx.entitlement, value: summary.entitlement, color: '#4A6878', bg: '#F4F6F8' },
              { label: tx.approved,    value: summary.approved,    color: '#059669', bg: '#D1FAE5' },
              { label: tx.pending,     value: summary.pending,     color: '#D97706', bg: '#FEF3C7' },
              { label: tx.remaining,   value: summary.remaining,   color: summary.remaining <= 2 ? '#DC2626' : '#003A5D', bg: summary.remaining <= 2 ? '#FEE2E2' : '#FFF0EB' },
            ] as { label: string; value: number; color: string; bg: string }[]).map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color, lineHeight: 1, fontFamily: "'Poppins', sans-serif" }}>
                  {item.value}
                </div>
                <div style={{ fontSize: '0.65rem', color: item.color, marginTop: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#7A9BAD', marginTop: 1 }}>{tx.days}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #D8E2E8', marginBottom: 24 }}>
        {(['vacation', 'swap', 'wunschfrei'] as ActiveTab[]).map(tabKey => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: tab === tabKey ? '2px solid #003A5D' : '2px solid transparent',
              color: tab === tabKey ? '#001E30' : '#7A9BAD',
              fontSize: '0.82rem', fontWeight: tab === tabKey ? 500 : 400,
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {tabKey === 'vacation' ? tx.vacation : tabKey === 'swap' ? tx.swap : tx.wunschfrei}
          </button>
        ))}
      </div>

      {/* New request button — only for vacation and swap tabs */}
      {form === null && tab !== 'wunschfrei' && (
        <button
          onClick={() => setForm(tab as 'vacation' | 'swap')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', background: '#003A5D', border: 'none',
            borderRadius: 6, color: 'white', fontSize: '0.8rem',
            cursor: 'pointer', marginBottom: 20,
          }}
        >
          <Plus size={14} />
          {tab === 'vacation' ? tx.newVacation : tx.newSwap}
        </button>
      )}

      {/* Vacation Form */}
      {form === 'vacation' && tab === 'vacation' && (
        <div style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#001E30' }}>{tx.newVacation}</h3>
            <button onClick={() => { setForm(null); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A9BAD' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitVacation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.startDate}</label>
                <input type="date" value={vStartDate} onChange={e => setVStartDate(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.endDate}</label>
                <input type="date" value={vEndDate} onChange={e => setVEndDate(e.target.value)} required style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.message}</label>
              <textarea value={vMessage} onChange={e => setVMessage(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            {error && <div style={{ color: '#003A5D', fontSize: '0.78rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setForm(null); setError('') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #D8E2E8', borderRadius: 6, color: '#4A6878', fontSize: '0.8rem', cursor: 'pointer' }}>
                {tx.cancel}
              </button>
              <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#003A5D', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.8rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? tx.submitting : tx.submit}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Swap Form */}
      {form === 'swap' && tab === 'swap' && (
        <div style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#001E30' }}>{tx.newSwap}</h3>
            <button onClick={() => { setForm(null); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A9BAD' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitSwap} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.targetEmployee}</label>
              <select value={sTarget} onChange={e => setSTarget(e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">—</option>
                {colleagues.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.myDate}</label>
                <input type="date" value={sMyDate} onChange={e => setSMyDate(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.theirDate}</label>
                <input type="date" value={sTheirDate} onChange={e => setSTheirDate(e.target.value)} required style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.message}</label>
              <textarea value={sMessage} onChange={e => setSMessage(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            {error && <div style={{ color: '#003A5D', fontSize: '0.78rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setForm(null); setError('') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #D8E2E8', borderRadius: 6, color: '#4A6878', fontSize: '0.8rem', cursor: 'pointer' }}>
                {tx.cancel}
              </button>
              <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#003A5D', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.8rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? tx.submitting : tx.submit}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vacation list */}
      {tab === 'vacation' && (
        <div key="vacation" className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vacations.length === 0 && (
            <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>{tx.empty}</p>
          )}
          {vacations.map(v => {
            const s = STATUS_COLORS[v.status]
            return (
              <div key={v.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#001E30' }}>
                      {v.startDate} {tx.to} {v.endDate}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                      {s.label[lang]}
                    </span>
                  </div>
                  {v.notes && <p style={{ margin: 0, fontSize: '0.75rem', color: '#4A6878' }}>{v.notes}</p>}
                  {v.managerNote && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#7A9BAD' }}><em>{tx.managerNote}:</em> {v.managerNote}</p>}
                </div>
                {v.status === 'PENDING' && (
                  <button
                    onClick={() => cancelVacation(v.id)}
                    style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #D8E2E8', borderRadius: 6, color: '#7A9BAD', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {tx.cancelRequest}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Swap list */}
      {tab === 'swap' && (
        <div key="swap" className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {swaps.length === 0 && (
            <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>{tx.empty}</p>
          )}
          {swaps.map(sw => {
            const s = STATUS_COLORS[sw.status]
            const iAmRequester = sw.requesterId === employeeId
            return (
              <div key={sw.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                      {s.label[lang]}
                    </span>
                    {iAmRequester
                      ? <span style={{ fontSize: '0.72rem', color: '#7A9BAD' }}>{lang === 'pt' ? 'Pediste a' : 'Angefragt bei'} {sw.targetEmployee.name}</span>
                      : <span style={{ fontSize: '0.72rem', color: '#7A9BAD' }}>{lang === 'pt' ? 'Pedido de' : 'Anfrage von'} {sw.requester.name}</span>
                    }
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#3A3530' }}>
                    {iAmRequester
                      ? <>{lang === 'pt' ? 'O teu turno' : 'Deine Schicht'}: <strong>{sw.requesterDate}</strong> ↔ {lang === 'pt' ? 'Turno deles' : 'Ihre Schicht'}: <strong>{sw.targetDate}</strong></>
                      : <>{lang === 'pt' ? 'Turno deles' : 'Ihre Schicht'}: <strong>{sw.requesterDate}</strong> ↔ {lang === 'pt' ? 'O teu turno' : 'Deine Schicht'}: <strong>{sw.targetDate}</strong></>
                    }
                  </div>
                  {sw.requesterMessage && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#4A6878' }}>{sw.requesterMessage}</p>}
                  {sw.managerNote && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#7A9BAD' }}><em>{tx.managerNote}:</em> {sw.managerNote}</p>}
                </div>
                {sw.status === 'PENDING' && iAmRequester && (
                  <button
                    onClick={() => cancelSwap(sw.id)}
                    style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #D8E2E8', borderRadius: 6, color: '#7A9BAD', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {tx.cancelRequest}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Wunschfrei tab */}
      {tab === 'wunschfrei' && (
        <div key="wunschfrei" className="tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Counter and label */}
          <div style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: '0.68rem', color: '#7A9BAD', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {tx.wunschfreiLabel}
            </div>
            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 8, background: '#F0EBE3', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (activeWfCount / 4) * 100)}%`,
                  background: activeWfCount >= 4 ? '#DC2626' : activeWfCount >= 3 ? '#D97706' : '#003A5D',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: activeWfCount >= 4 ? '#DC2626' : '#001E30', whiteSpace: 'nowrap' }}>
                {tx.wunschfreiCounter(activeWfCount)}
              </span>
            </div>

            {/* Add date form */}
            {activeWfCount < 4 && (
              <form onSubmit={submitWunschfrei} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#7A9BAD', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tx.wunschfreiAddDate}
                  </label>
                  <input
                    type="date"
                    value={wfDate}
                    onChange={e => { setWfDate(e.target.value); setWfError('') }}
                    style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid #D8E2E8', borderRadius: 6, color: '#001E30', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={wfSubmitting || !wfDate}
                  style={{ padding: '8px 16px', background: '#003A5D', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.8rem', cursor: wfSubmitting || !wfDate ? 'not-allowed' : 'pointer', opacity: wfSubmitting || !wfDate ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  {tx.wunschfreiAdd}
                </button>
              </form>
            )}
            {wfError && <div style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: 8 }}>{wfError}</div>}
          </div>

          {/* List of wunschfrei requests */}
          {wunschfreiList.length === 0 && (
            <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '4px 0' }}>{tx.wunschfreiEmpty}</p>
          )}
          {wunschfreiList.map(wf => {
            const s = STATUS_COLORS[wf.status]
            return (
              <div key={wf.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#001E30', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {wf.date}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                      {s.label[lang]}
                    </span>
                  </div>
                  {wf.managerNote && (
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#7A9BAD' }}><em>{tx.managerNote}:</em> {wf.managerNote}</p>
                  )}
                </div>
                {wf.status === 'PENDING' && (
                  <button
                    onClick={() => cancelWunschfrei(wf.id)}
                    style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #D8E2E8', borderRadius: 6, color: '#7A9BAD', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {tx.cancelRequest}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      </div>{/* /padding wrapper */}
    </div>
  )
}
