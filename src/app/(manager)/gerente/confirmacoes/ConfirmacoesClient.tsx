'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

import type { Lang } from '@/hooks/useLang'

type ConfType = 'WORKED' | 'EARLY_DEPARTURE' | 'ABSENT'

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
  WORKED:          { icon: CheckCircle2,  color: '#059669', bg: '#D1FAE5', label: { pt: 'Trabalhou',      de: 'Gearbeitet',   en: 'Worked',          fr: 'A travaillé',   it: 'Ha lavorato'     } },
  EARLY_DEPARTURE: { icon: Clock,         color: '#D97706', bg: '#FEF3C7', label: { pt: 'Saiu mais cedo', de: 'Früh gegangen', en: 'Left early',      fr: 'Parti tôt',     it: 'Partito prima'   } },
  ABSENT:          { icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2', label: { pt: 'Faltou',          de: 'Abwesend',     en: 'Absent',          fr: 'Absent',        it: 'Assente'         } },
}

const MONTHS: Record<Lang, string[]> = {
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  it: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
}

const CONF_TX: Record<Lang, {
  title: string; subtitle: string; allEmployees: string; allMonths: string; allTypes: string;
  worked: string; leftEarly: string; absent: string;
  records: (n: number, total: number) => string; loading: string; empty: string; leftAt: string;
}> = {
  pt: { title: 'Registo de Turnos', subtitle: 'Confirmações registadas pelos colaboradores', allEmployees: 'Todos os colaboradores', allMonths: 'Todos os meses', allTypes: 'Todos os tipos', worked: 'Trabalhou', leftEarly: 'Saiu mais cedo', absent: 'Faltou', records: (n, t) => `${n} de ${t} registos`, loading: 'A carregar...', empty: 'Sem registos.', leftAt: 'Saiu às' },
  de: { title: 'Schichtprotokoll', subtitle: 'Von Mitarbeitern erfasste Bestätigungen', allEmployees: 'Alle Mitarbeiter', allMonths: 'Alle Monate', allTypes: 'Alle Typen', worked: 'Gearbeitet', leftEarly: 'Früh gegangen', absent: 'Abwesend', records: (n, t) => `${n} von ${t} Einträgen`, loading: 'Lädt...', empty: 'Keine Einträge.', leftAt: 'Weg um' },
  en: { title: 'Shift Log', subtitle: 'Confirmations registered by employees', allEmployees: 'All employees', allMonths: 'All months', allTypes: 'All types', worked: 'Worked', leftEarly: 'Left early', absent: 'Absent', records: (n, t) => `${n} of ${t} records`, loading: 'Loading...', empty: 'No records.', leftAt: 'Left at' },
  fr: { title: 'Registre des postes', subtitle: 'Confirmations enregistrées par les collaborateurs', allEmployees: 'Tous les collaborateurs', allMonths: 'Tous les mois', allTypes: 'Tous les types', worked: 'A travaillé', leftEarly: 'Parti tôt', absent: 'Absent', records: (n, t) => `${n} sur ${t} enregistrements`, loading: 'Chargement...', empty: 'Aucun enregistrement.', leftAt: 'Parti à' },
  it: { title: 'Registro Turni', subtitle: 'Conferme registrate dai collaboratori', allEmployees: 'Tutti i collaboratori', allMonths: 'Tutti i mesi', allTypes: 'Tutti i tipi', worked: 'Ha lavorato', leftEarly: 'Partito prima', absent: 'Assente', records: (n, t) => `${n} di ${t} registrazioni`, loading: 'Caricamento...', empty: 'Nessun registro.', leftAt: 'Partito alle' },
}

function monthLabel(ym: string, lang: Lang): string {
  const [y, m] = ym.split('-')
  const names = MONTHS[lang]
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
  const [lang] = useLang()
  const ctx = CONF_TX[lang]
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
            {ctx.title}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
            {ctx.subtitle}
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
              {ctx.allEmployees}
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
                {ctx.allMonths}
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
            <option value="ALL" style={{ background: '#003A5D' }}>{ctx.allTypes}</option>
            <option value="WORKED" style={{ background: '#003A5D' }}>{ctx.worked}</option>
            <option value="EARLY_DEPARTURE" style={{ background: '#003A5D' }}>{ctx.leftEarly}</option>
            <option value="ABSENT" style={{ background: '#003A5D' }}>{ctx.absent}</option>
          </select>

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
              {ctx.records(filtered.length, items.length)}
            </div>
          )}
        </div>

        {loading && <p style={{ color: '#7A9BAD', fontSize: '0.82rem' }}>{ctx.loading}</p>}

        {!loading && filtered.length === 0 && (
          <p style={{ color: '#7A9BAD', fontSize: '0.82rem', padding: '20px 0' }}>
            {ctx.empty}
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
                        {ctx.leftAt} {item.actualEnd}
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <div style={{ marginTop: 6, padding: '6px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: '3px solid #94A3B8', borderRadius: 6, fontSize: '0.75rem', color: '#3A4A5C', lineHeight: 1.5 }}>
                      {item.reason}
                    </div>
                  )}
                  <div style={{ fontSize: '0.65rem', color: '#B0C4CE', marginTop: 5 }}>
                    {new Date(item.createdAt).toLocaleString({ pt: 'pt-PT', de: 'de-DE', en: 'en-GB', fr: 'fr-FR', it: 'it-IT' }[lang])}
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
