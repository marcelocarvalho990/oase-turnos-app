'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

type ConfType = 'WORKED' | 'EARLY_DEPARTURE' | 'ABSENT'
type Lang = 'pt' | 'de'

interface Confirmation {
  id: string
  date: string
  shiftCode: string
  type: ConfType
  actualEnd: string | null
  reason: string | null
  status: string
  createdAt: string
  employee: { name: string; shortName: string }
}

const TYPE_CONFIG: Record<ConfType, { icon: typeof Clock; color: string; bg: string; label: Record<Lang, string> }> = {
  WORKED:          { icon: CheckCircle2,  color: '#059669', bg: '#D1FAE5', label: { pt: 'Trabalhou',      de: 'Gearbeitet'   } },
  EARLY_DEPARTURE: { icon: Clock,         color: '#D97706', bg: '#FEF3C7', label: { pt: 'Saiu mais cedo', de: 'Früh gegangen' } },
  ABSENT:          { icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2', label: { pt: 'Faltou',          de: 'Abwesend'     } },
}

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function monthLabel(ym: string, lang: Lang): string {
  const [y, m] = ym.split('-')
  const names = lang === 'pt' ? MONTHS_PT : MONTHS_DE
  return `${names[parseInt(m) - 1]} ${y}`
}

const SELECT_STYLE: React.CSSProperties = {
  padding: '5px 8px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 4,
  color: 'white',
  fontSize: '0.72rem',
  cursor: 'pointer',
  outline: 'none',
  fontFamily: "'IBM Plex Sans', sans-serif",
}

export default function ConfirmacoesClient() {
  const [lang, toggleLang] = useLang()
  const [typeFilter, setTypeFilter] = useState<'ALL' | ConfType>('ALL')
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL')
  const [monthFilter, setMonthFilter] = useState<string>('ALL')
  const [items, setItems] = useState<Confirmation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/confirmations')
      .then(r => r.json())
      .then((data: Confirmation[]) => { if (Array.isArray(data)) setItems(data) })
      .finally(() => setLoading(false))
  }, [])

  // Derive filter options from data
  const employeeOptions = Array.from(
    new Map(items.map(i => [i.employee.name, i.employee.name])).values()
  ).sort()

  const monthOptions = Array.from(
    new Set(items.map(i => i.date.slice(0, 7)))
  ).sort().reverse()

  // Apply all filters
  const filtered = items.filter(i => {
    if (typeFilter !== 'ALL' && i.type !== typeFilter) return false
    if (employeeFilter !== 'ALL' && i.employee.name !== employeeFilter) return false
    if (monthFilter !== 'ALL' && !i.date.startsWith(monthFilter)) return false
    return true
  })

  const counts: Record<ConfType, number> = {
    WORKED: filtered.filter(i => i.type === 'WORKED').length,
    EARLY_DEPARTURE: filtered.filter(i => i.type === 'EARLY_DEPARTURE').length,
    ABSENT: filtered.filter(i => i.type === 'ABSENT').length,
  }

  // Month navigation for monthFilter
  function prevMonth() {
    if (monthFilter === 'ALL') return
    const [y, m] = monthFilter.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    if (monthFilter === 'ALL') return
    const [y, m] = monthFilter.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#003A5D', padding: '20px 28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {lang === 'pt' ? 'Registo de Turnos' : 'Schichtprotokoll'}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
            {lang === 'pt' ? 'Confirmações registadas pelos colaboradores' : 'Von Mitarbeitern erfasste Bestätigungen'}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Employee filter */}
          <select
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="ALL" style={{ background: '#003A5D' }}>
              {lang === 'pt' ? 'Todos os colaboradores' : 'Alle Mitarbeiter'}
            </option>
            {employeeOptions.map(name => (
              <option key={name} value={name} style={{ background: '#003A5D' }}>{name}</option>
            ))}
          </select>

          {/* Month filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {monthFilter !== 'ALL' && (
              <button onClick={prevMonth} style={{ ...SELECT_STYLE, padding: '5px 7px', display: 'flex' }}>
                <ChevronLeft size={13} />
              </button>
            )}
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              style={SELECT_STYLE}
            >
              <option value="ALL" style={{ background: '#003A5D' }}>
                {lang === 'pt' ? 'Todos os meses' : 'Alle Monate'}
              </option>
              {monthOptions.map(ym => (
                <option key={ym} value={ym} style={{ background: '#003A5D' }}>{monthLabel(ym, lang)}</option>
              ))}
            </select>
            {monthFilter !== 'ALL' && (
              <button onClick={nextMonth} style={{ ...SELECT_STYLE, padding: '5px 7px', display: 'flex' }}>
                <ChevronRight size={13} />
              </button>
            )}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            style={SELECT_STYLE}
          >
            <option value="ALL" style={{ background: '#003A5D' }}>{lang === 'pt' ? 'Todos os tipos' : 'Alle Typen'}</option>
            <option value="WORKED" style={{ background: '#003A5D' }}>{lang === 'pt' ? 'Trabalhou' : 'Gearbeitet'}</option>
            <option value="EARLY_DEPARTURE" style={{ background: '#003A5D' }}>{lang === 'pt' ? 'Saiu mais cedo' : 'Früh gegangen'}</option>
            <option value="ABSENT" style={{ background: '#003A5D' }}>{lang === 'pt' ? 'Faltou' : 'Abwesend'}</option>
          </select>

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            {lang === 'pt' ? 'DE' : 'PT'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>
        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(Object.entries(TYPE_CONFIG) as [ConfType, typeof TYPE_CONFIG[ConfType]][]).map(([t, cfg]) => {
            const Icon = cfg.icon
            return (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: cfg.bg, borderRadius: 20, fontSize: '0.75rem', color: cfg.color, fontWeight: 500 }}>
                <Icon size={13} />
                {cfg.label[lang]}: {counts[t]}
              </div>
            )
          })}
          {filtered.length !== items.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#F1F5F9', borderRadius: 20, fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
              {lang === 'pt' ? `${filtered.length} de ${items.length} registos` : `${filtered.length} von ${items.length} Einträgen`}
            </div>
          )}
        </div>

        {loading && <p style={{ color: '#7A9BAD', fontSize: '0.82rem' }}>{lang === 'pt' ? 'A carregar...' : 'Lädt...'}</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>
            {lang === 'pt' ? 'Sem registos.' : 'Keine Einträge.'}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.WORKED
            const Icon = cfg.icon
            return (
              <div key={item.id} style={{ background: 'white', border: '1px solid #D8E2E8', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Type icon */}
                <div style={{ width: 34, height: 34, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={cfg.color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#001E30' }}>{item.employee.name}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: '0.68rem', fontWeight: 500 }}>
                      {cfg.label[lang]}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#3A3530' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>{item.shiftCode}</span>
                    {' · '}
                    <span>{item.date}</span>
                    {item.actualEnd && (
                      <span style={{ color: '#D97706', marginLeft: 8 }}>
                        {lang === 'pt' ? `Saiu às ${item.actualEnd}` : `Weg um ${item.actualEnd}`}
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <div style={{ marginTop: 6, padding: '6px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '3px solid #94A3B8', borderRadius: 6, fontSize: '0.75rem', color: '#3A4A5C', lineHeight: 1.5 }}>
                      {item.reason}
                    </div>
                  )}
                  <div style={{ fontSize: '0.65rem', color: '#B0C4CE', marginTop: 5 }}>
                    {new Date(item.createdAt).toLocaleString(lang === 'pt' ? 'pt-PT' : 'de-DE')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
