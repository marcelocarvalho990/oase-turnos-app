'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, Users, Clock, ShieldCheck, BarChart3, CheckSquare, LogOut, SlidersHorizontal, Sparkles, ClipboardList, Globe } from 'lucide-react'
import { useLang, setGlobalLang, LANGS, type Lang } from '@/hooks/useLang'

type NavLabel = Record<Lang, string>

const NAV_GROUPS: { group: NavLabel | null; items: { href: string; labels: NavLabel; icon: React.ElementType }[] }[] = [
  {
    group: null,
    items: [
      { href: '/schedule',  labels: { pt: 'Escala',        de: 'Dienstplan',    en: 'Schedule',  fr: 'Planning',      it: 'Turni'          }, icon: CalendarDays },
      { href: '/staff',     labels: { pt: 'Colaboradores', de: 'Mitarbeiter',   en: 'Staff',     fr: 'Collaborateurs', it: 'Collaboratori'  }, icon: Users },
      { href: '/shifts',    labels: { pt: 'Turnos',        de: 'Schichten',     en: 'Shifts',    fr: 'Postes',        it: 'Turni'          }, icon: Clock },
      { href: '/coverage',  labels: { pt: 'Cobertura',     de: 'Abdeckung',     en: 'Coverage',  fr: 'Couverture',    it: 'Copertura'      }, icon: ShieldCheck },
      { href: '/fairness',  labels: { pt: 'Equidade',      de: 'Gerechtigkeit', en: 'Fairness',  fr: 'Équité',        it: 'Equità'         }, icon: BarChart3 },
    ],
  },
  {
    group: { pt: 'Gestão', de: 'Verwaltung', en: 'Management', fr: 'Gestion', it: 'Gestione' },
    items: [
      { href: '/gerente/pedidos',      labels: { pt: 'Aprovações',    de: 'Genehmigungen', en: 'Approvals',  fr: 'Approbations', it: 'Approvazioni'  }, icon: CheckSquare },
      { href: '/gerente/confirmacoes', labels: { pt: 'Registo',       de: 'Protokoll',     en: 'Log',        fr: 'Registre',     it: 'Registro'      }, icon: ClipboardList },
      { href: '/gerente/chat',         labels: { pt: 'Assistente AI', de: 'KI-Assistent',  en: 'AI Assistant', fr: 'Assistant IA', it: 'Assistente AI' }, icon: Sparkles },
    ],
  },
]

const SETTINGS_ITEM = {
  href: '/definicoes',
  labels: { pt: 'Definições', de: 'Einstellungen', en: 'Settings', fr: 'Paramètres', it: 'Impostazioni' } as NavLabel,
  icon: SlidersHorizontal,
}

const LOGOUT_LABELS: NavLabel = { pt: 'Sair', de: 'Abmelden', en: 'Log out', fr: 'Se déconnecter', it: 'Esci' }
const SESSION_LABELS: NavLabel = { pt: 'Sessão: Gestor', de: 'Sitzung: Manager', en: 'Session: Manager', fr: 'Session: Gérant', it: 'Sessione: Manager' }

const LANG_NAMES: Record<Lang, string> = { pt: 'Português', de: 'Deutsch', en: 'English', fr: 'Français', it: 'Italiano' }

// Pre-compute stagger indices
const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)
const itemIndex = new Map(ALL_ITEMS.map((item, i) => [item.href, i]))

export default function ManagerSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [lang] = useLang()
  const [loggingOut, setLoggingOut] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

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
          {SESSION_LABELS[lang]}
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
                {group[lang]}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {items.map(({ href, labels, icon: Icon }) => {
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
                    {labels[lang]}
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
              {SETTINGS_ITEM.labels[lang]}
            </Link>
          )
        })()}

        {/* Language selector */}
        <div style={{ position: 'relative', padding: '2px 0' }}>
          <button
            onClick={() => setLangOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              width: '100%', padding: '7px 10px 7px 9px', borderRadius: 7,
              background: langOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem',
              transition: 'background 0.14s, color 0.14s',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' }}
            onMouseLeave={e => { if (!langOpen) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' } }}
          >
            <Globe size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{LANG_NAMES[lang]}</span>
            <span style={{ fontSize: '0.62rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, opacity: 0.6 }}>{lang.toUpperCase()}</span>
          </button>

          {langOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setLangOpen(false)} />
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0,
                background: '#002D47', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                overflow: 'hidden', zIndex: 50,
              }}>
                {LANGS.map(l => (
                  <button
                    key={l}
                    onClick={() => { setGlobalLang(l); setLangOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '8px 12px',
                      background: lang === l ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      color: lang === l ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                      fontSize: '0.8rem', transition: 'background 0.12s',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}
                    onMouseEnter={e => { if (lang !== l) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={e => { if (lang !== l) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: '0.62rem', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, width: 22, color: lang === l ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }}>{l.toUpperCase()}</span>
                    <span style={{ flex: 1 }}>{LANG_NAMES[l]}</span>
                    {lang === l && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

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
          {LOGOUT_LABELS[lang]}
        </button>
      </div>
    </aside>
  )
}
