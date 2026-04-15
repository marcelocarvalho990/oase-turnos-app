'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, Users, Clock, ShieldCheck, BarChart3, CheckSquare, LogOut, Globe, SlidersHorizontal, Sparkles, ClipboardList } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

const NAV_GROUPS = [
  {
    group: null,
    items: [
      { href: '/schedule',  labelPt: 'Escala',        labelDe: 'Dienstplan',    icon: CalendarDays },
      { href: '/staff',     labelPt: 'Colaboradores', labelDe: 'Mitarbeiter',   icon: Users },
      { href: '/shifts',    labelPt: 'Turnos',        labelDe: 'Schichten',     icon: Clock },
      { href: '/coverage',  labelPt: 'Cobertura',     labelDe: 'Abdeckung',     icon: ShieldCheck },
      { href: '/fairness',  labelPt: 'Equidade',      labelDe: 'Gerechtigkeit', icon: BarChart3 },
    ],
  },
  {
    group: { pt: 'Gestão', de: 'Verwaltung' },
    items: [
      { href: '/gerente/pedidos',      labelPt: 'Aprovações',    labelDe: 'Genehmigungen', icon: CheckSquare },
      { href: '/gerente/confirmacoes', labelPt: 'Registo',       labelDe: 'Protokoll',     icon: ClipboardList },
      { href: '/gerente/chat',         labelPt: 'Assistente AI', labelDe: 'KI-Assistent',  icon: Sparkles },
    ],
  },
]

const SETTINGS_ITEM = { href: '/definicoes', labelPt: 'Definições', labelDe: 'Einstellungen', icon: SlidersHorizontal }

// Pre-compute stagger indices
const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)
const itemIndex = new Map(ALL_ITEMS.map((item, i) => [item.href, i]))

export default function ManagerSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [lang, toggleLang] = useLang()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/schedule' ? pathname === href : pathname.startsWith(href)

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '7px 10px 7px 9px',
    borderRadius: 7,
    fontSize: '0.8rem',
    fontWeight: active ? 500 : 400,
    color: active ? '#FAFAF9' : 'rgba(255,255,255,0.45)',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    borderLeft: `2px solid ${active ? 'rgba(255,255,255,0.5)' : 'transparent'}`,
    transition: 'background 0.14s, color 0.14s, border-color 0.14s',
    textDecoration: 'none',
  })

  const hoverOn = (el: HTMLElement) => {
    el.style.background = 'rgba(255,255,255,0.07)'
    el.style.color = 'rgba(255,255,255,0.85)'
  }
  const hoverOff = (el: HTMLElement, active: boolean) => {
    el.style.background = active ? 'rgba(255,255,255,0.1)' : 'transparent'
    el.style.color = active ? '#FAFAF9' : 'rgba(255,255,255,0.45)'
  }

  return (
    <aside
      className="w-52 shrink-0 flex flex-col h-full border-r"
      style={{ background: '#003A5D', borderColor: '#002040', fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 15px' }}>
        <img
          src="/240513_tertianum_branding_marco-simonetti_2@2x.png"
          alt="Tertianum"
          style={{ width: '100%', maxWidth: 148, display: 'block' }}
        />
        <div style={{ fontSize: '0.59rem', color: 'rgba(255,255,255,0.27)', marginTop: 7, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
          Dienstplan · Gestor
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 14px' }} />

      {/* Nav */}
      <nav className="flex-1 py-3" style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
        {NAV_GROUPS.map(({ group, items }, gi) => (
          <div key={gi}>
            {group && (
              <div style={{
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.26)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
                padding: '0 10px',
                marginBottom: 5,
              }}>
                {lang === 'de' ? group.de : group.pt}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {items.map(({ href, labelPt, labelDe, icon: Icon }) => {
                const active = isActive(href)
                const idx = itemIndex.get(href) ?? 0
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      ...linkStyle(active),
                      animation: `t-slideUp 0.22s cubic-bezier(0.16,1,0.3,1) ${idx * 28}ms both`,
                    }}
                    onMouseEnter={e => { if (!active) hoverOn(e.currentTarget as HTMLElement) }}
                    onMouseLeave={e => { if (!active) hoverOff(e.currentTarget as HTMLElement, false) }}
                  >
                    <Icon size={14} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                    {lang === 'de' ? labelDe : labelPt}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '0 10px 18px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 4px 8px' }} />

        {/* Settings */}
        {(() => {
          const active = isActive(SETTINGS_ITEM.href)
          return (
            <Link
              href={SETTINGS_ITEM.href}
              style={linkStyle(active)}
              onMouseEnter={e => { if (!active) hoverOn(e.currentTarget as HTMLElement) }}
              onMouseLeave={e => { if (!active) hoverOff(e.currentTarget as HTMLElement, false) }}
            >
              <SlidersHorizontal size={14} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
              {lang === 'de' ? SETTINGS_ITEM.labelDe : SETTINGS_ITEM.labelPt}
            </Link>
          )
        })()}

        {/* Language */}
        <button
          onClick={toggleLang}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px 7px 11px', borderRadius: 7,
            fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left',
            transition: 'background 0.14s, color 0.14s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#FAF8F4' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}
        >
          <Globe size={14} strokeWidth={1.8} />
          {lang === 'pt' ? 'Português' : 'Deutsch'}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px 7px 11px', borderRadius: 7,
            fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left', opacity: loggingOut ? 0.5 : 1,
            transition: 'background 0.14s, color 0.14s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}
        >
          <LogOut size={14} strokeWidth={1.8} />
          {lang === 'pt' ? 'Sair' : 'Abmelden'}
        </button>
      </div>
    </aside>
  )
}
