'use client'

import { useState, useEffect } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

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

const STATUS_COLORS: Record<ReqStatus, { bg: string; color: string; label: { pt: string; de: string } }> = {
  PENDING:   { bg: '#FEF3C7', color: '#D97706', label: { pt: 'Pendente', de: 'Ausstehend' } },
  APPROVED:  { bg: '#D1FAE5', color: '#059669', label: { pt: 'Aprovado', de: 'Genehmigt' } },
  REJECTED:  { bg: '#FEE2E2', color: '#DC2626', label: { pt: 'Rejeitado', de: 'Abgelehnt' } },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: { pt: 'Cancelado', de: 'Abgebrochen' } },
}

const t = {
  pt: {
    title: 'Os Meus Pedidos',
    subtitle: 'Férias e trocas de turno',
    vacationBalance: 'Saldo de Férias',
    entitlement: 'Direito', approved: 'Gozadas', pending: 'Pendentes', remaining: 'Restantes',
    days: 'dias',
    vacation: 'Férias', swap: 'Troca de Turno',
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
  },
  de: {
    title: 'Meine Anfragen',
    subtitle: 'Urlaub und Schichttausch',
    vacationBalance: 'Urlaubskonto',
    entitlement: 'Anspruch', approved: 'Genommen', pending: 'Ausstehend', remaining: 'Verbleibend',
    days: 'Tage',
    vacation: 'Urlaub', swap: 'Schichttausch',
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
  },
}

type ActiveTab = 'vacation' | 'swap'
type FormMode = null | 'vacation' | 'swap'

interface Props { employeeId: string; colleagues: Colleague[] }

export default function EmployeePedidosClient({ employeeId, colleagues }: Props) {
  const [lang, setLang] = useState<Lang>('pt')
  const [tab, setTab] = useState<ActiveTab>('vacation')
  const [form, setForm] = useState<FormMode>(null)
  const [vacations, setVacations] = useState<VacationRequest[]>([])
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<VacationSummary | null>(null)
  const tx = t[lang]
  const currentYear = new Date().getFullYear()

  // Vacation form state
  const [vStartDate, setVStartDate] = useState('')
  const [vEndDate, setVEndDate] = useState('')
  const [vMessage, setVMessage] = useState('')

  // Swap form state
  const [sTarget, setSTarget] = useState('')
  const [sMyDate, setSMyDate] = useState('')
  const [sTheirDate, setSTheirDate] = useState('')
  const [sMessage, setSMessage] = useState('')

  useEffect(() => { loadVacations(); loadSwaps(); loadSummary() }, [])

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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', background: 'white',
    border: '1px solid #E8E0D0', borderRadius: 6,
    color: '#1A1816', fontSize: '0.85rem', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto', background: '#FAF8F4', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '1.75rem', color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
            {tx.title}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#9A8F80' }}>{tx.subtitle}</p>
        </div>
        <button
          onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')}
          style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #D8D0C4', borderRadius: 6, color: '#6B6056', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          {tx.lang}
        </button>
      </div>

      {/* Vacation balance card */}
      {summary && (
        <div style={{ background: 'white', border: '1px solid #E8E0D0', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: '0.68rem', color: '#9A8F80', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            {tx.vacationBalance} · {currentYear}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {([
              { label: tx.entitlement, value: summary.entitlement, color: '#6B6056', bg: '#F5F0E8' },
              { label: tx.approved,    value: summary.approved,    color: '#059669', bg: '#D1FAE5' },
              { label: tx.pending,     value: summary.pending,     color: '#D97706', bg: '#FEF3C7' },
              { label: tx.remaining,   value: summary.remaining,   color: summary.remaining <= 2 ? '#DC2626' : '#C1440E', bg: summary.remaining <= 2 ? '#FEE2E2' : '#FFF0EB' },
            ] as { label: string; value: number; color: string; bg: string }[]).map(item => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color, lineHeight: 1, fontFamily: "'Instrument Serif', Georgia, serif" }}>
                  {item.value}
                </div>
                <div style={{ fontSize: '0.65rem', color: item.color, marginTop: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#9A8F80', marginTop: 1 }}>{tx.days}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E8E0D0', marginBottom: 24 }}>
        {(['vacation', 'swap'] as ActiveTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid #C1440E' : '2px solid transparent',
              color: tab === t ? '#1A1816' : '#9A8F80',
              fontSize: '0.82rem', fontWeight: tab === t ? 500 : 400,
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {t === 'vacation' ? tx.vacation : tx.swap}
          </button>
        ))}
      </div>

      {/* New request button */}
      {form === null && (
        <button
          onClick={() => setForm(tab)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', background: '#C1440E', border: 'none',
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
        <div style={{ background: 'white', border: '1px solid #E8E0D0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1A1816' }}>{tx.newVacation}</h3>
            <button onClick={() => { setForm(null); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A8F80' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitVacation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#9A8F80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.startDate}</label>
                <input type="date" value={vStartDate} onChange={e => setVStartDate(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#9A8F80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.endDate}</label>
                <input type="date" value={vEndDate} onChange={e => setVEndDate(e.target.value)} required style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#9A8F80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.message}</label>
              <textarea value={vMessage} onChange={e => setVMessage(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            {error && <div style={{ color: '#C1440E', fontSize: '0.78rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setForm(null); setError('') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #E8E0D0', borderRadius: 6, color: '#6B6056', fontSize: '0.8rem', cursor: 'pointer' }}>
                {tx.cancel}
              </button>
              <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#C1440E', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.8rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? tx.submitting : tx.submit}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Swap Form */}
      {form === 'swap' && tab === 'swap' && (
        <div style={{ background: 'white', border: '1px solid #E8E0D0', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1A1816' }}>{tx.newSwap}</h3>
            <button onClick={() => { setForm(null); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A8F80' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={submitSwap} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#9A8F80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.targetEmployee}</label>
              <select value={sTarget} onChange={e => setSTarget(e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">—</option>
                {colleagues.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#9A8F80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.myDate}</label>
                <input type="date" value={sMyDate} onChange={e => setSMyDate(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#9A8F80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.theirDate}</label>
                <input type="date" value={sTheirDate} onChange={e => setSTheirDate(e.target.value)} required style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', color: '#9A8F80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tx.message}</label>
              <textarea value={sMessage} onChange={e => setSMessage(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            {error && <div style={{ color: '#C1440E', fontSize: '0.78rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setForm(null); setError('') }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #E8E0D0', borderRadius: 6, color: '#6B6056', fontSize: '0.8rem', cursor: 'pointer' }}>
                {tx.cancel}
              </button>
              <button type="submit" disabled={submitting} style={{ padding: '8px 16px', background: '#C1440E', border: 'none', borderRadius: 6, color: 'white', fontSize: '0.8rem', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? tx.submitting : tx.submit}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vacation list */}
      {tab === 'vacation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vacations.length === 0 && (
            <p style={{ color: '#9A8F80', fontSize: '0.82rem', padding: '20px 0' }}>{tx.empty}</p>
          )}
          {vacations.map(v => {
            const s = STATUS_COLORS[v.status]
            return (
              <div key={v.id} style={{ background: 'white', border: '1px solid #E8E0D0', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1A1816' }}>
                      {v.startDate} {tx.to} {v.endDate}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                      {s.label[lang]}
                    </span>
                  </div>
                  {v.notes && <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B6056' }}>{v.notes}</p>}
                  {v.managerNote && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#9A8F80' }}><em>{tx.managerNote}:</em> {v.managerNote}</p>}
                </div>
                {v.status === 'PENDING' && (
                  <button
                    onClick={() => cancelVacation(v.id)}
                    style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #E8E0D0', borderRadius: 6, color: '#9A8F80', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {swaps.length === 0 && (
            <p style={{ color: '#9A8F80', fontSize: '0.82rem', padding: '20px 0' }}>{tx.empty}</p>
          )}
          {swaps.map(sw => {
            const s = STATUS_COLORS[sw.status]
            const iAmRequester = sw.requesterId === employeeId
            return (
              <div key={sw.id} style={{ background: 'white', border: '1px solid #E8E0D0', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '0.68rem', fontWeight: 500 }}>
                      {s.label[lang]}
                    </span>
                    {iAmRequester
                      ? <span style={{ fontSize: '0.72rem', color: '#9A8F80' }}>{lang === 'pt' ? 'Pediste a' : 'Angefragt bei'} {sw.targetEmployee.name}</span>
                      : <span style={{ fontSize: '0.72rem', color: '#9A8F80' }}>{lang === 'pt' ? 'Pedido de' : 'Anfrage von'} {sw.requester.name}</span>
                    }
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#3A3530' }}>
                    {iAmRequester
                      ? <>{lang === 'pt' ? 'O teu turno' : 'Deine Schicht'}: <strong>{sw.requesterDate}</strong> ↔ {lang === 'pt' ? 'Turno deles' : 'Ihre Schicht'}: <strong>{sw.targetDate}</strong></>
                      : <>{lang === 'pt' ? 'Turno deles' : 'Ihre Schicht'}: <strong>{sw.requesterDate}</strong> ↔ {lang === 'pt' ? 'O teu turno' : 'Deine Schicht'}: <strong>{sw.targetDate}</strong></>
                    }
                  </div>
                  {sw.requesterMessage && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#6B6056' }}>{sw.requesterMessage}</p>}
                  {sw.managerNote && <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#9A8F80' }}><em>{tx.managerNote}:</em> {sw.managerNote}</p>}
                </div>
                {sw.status === 'PENDING' && iAmRequester && (
                  <button
                    onClick={() => cancelSwap(sw.id)}
                    style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #E8E0D0', borderRadius: 6, color: '#9A8F80', fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {tx.cancelRequest}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
