'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, FileText, User, LogOut, ClipboardList, Globe } from 'lucide-react'
import { useLang, setGlobalLang, LANGS, type Lang } from '@/hooks/useLang'

type NavLabel = Record<Lang, string>

const NAV_ITEMS: { href: string; labels: NavLabel; icon: React.ElementType }[] = [
  { href: '/colaborador/calendario', labels: { pt: 'O Meu Calendário', de: 'Mein Kalender',       en: 'My Calendar',   fr: 'Mon Calendrier',  it: 'Il Mio Calendario'  }, icon: Calendar },
  { href: '/colaborador/registo',    labels: { pt: 'Registo de Turnos', de: 'Schichtprotokoll',    en: 'Shift Log',     fr: 'Registre',        it: 'Registro Turni'     }, icon: ClipboardList },
  { href: '/colaborador/pedidos',    labels: { pt: 'Os Meus Pedidos',   de: 'Meine Anfragen',      en: 'My Requests',   fr: 'Mes Demandes',    it: 'Le Mie Richieste'   }, icon: FileText },
  { href: '/colaborador/perfil',     labels: { pt: 'O Meu Perfil',      de: 'Mein Profil',         en: 'My Profile',    fr: 'Mon Profil',      it: 'Il Mio Profilo'     }, icon: User },
]

const SESSION_LABELS: NavLabel = { pt: 'Sessão iniciada como', de: 'Angemeldet als', en: 'Signed in as', fr: 'Connecté en tant que', it: 'Accesso come' }
const LOGOUT_LABELS: NavLabel = { pt: 'Sair', de: 'Abmelden', en: 'Log out', fr: 'Se déconnecter', it: 'Esci' }
const LANG_NAMES: Record<Lang, string> = { pt: 'Português', de: 'Deutsch', en: 'English', fr: 'Français', it: 'Italiano' }

interface Props {
  employeeName: string
}

export default function EmployeeSidebar({ employeeName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [lang] = useLang()
  const [loggingOut, setLoggingOut] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const firstName = employeeName.split(' ')[0]

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '7px 10px 7px 9px',
    borderRadius: 7,
    fontSize: '0.8rem',
    fontWeight: active ? 500 : 400,
    color: active ? '#FAFAF9' : '#6AA3BF',
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    borderLeft: `2px solid ${active ? 'rgba(255,255,255,0.5)' : 'transparent'}`,
    transition: 'background 0.14s, color 0.14s, border-color 0.14s',
    textDecoration: 'none',
  })

  return (
    <aside
      className="w-52 shrink-0 flex flex-col h-full"
      style={{ background: '#003A5D', borderRight: '1px solid #002040', fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 15px' }}>
        <img
          src="/240513_tertianum_branding_marco-simonetti_2@2x.png"
          alt="Tertianum"
          style={{ width: '100%', maxWidth: 148, display: 'block' }}
        />
        <div style={{ fontSize: '0.59rem', color: 'rgba(255,255,255,0.27)', marginTop: 7, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
          Dienstplan · Colaborador
        </div>
      </div>

      {/* Employee greeting */}
      <div style={{ margin: '0 10px 12px', padding: '10px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
          {SESSION_LABELS[lang]}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>
          {firstName || employeeName}
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 14px 8px' }} />

      {/* Nav */}
      <nav className="flex-1" style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_ITEMS.map(({ href, labels, icon: Icon }, i) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                ...linkStyle(active),
                animation: `t-slideUp 0.22s cubic-bezier(0.16,1,0.3,1) ${i * 35}ms both`,
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                  ;(e.currentTarget as HTMLElement).style.color = '#FFFFFF'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#6AA3BF'
                }
              }}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
              {labels[lang]}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '0 10px 18px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 4px 8px' }} />

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
