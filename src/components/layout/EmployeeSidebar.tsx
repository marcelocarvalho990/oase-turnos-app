'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, FileText, User, LogOut, Globe, ClipboardList } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

const NAV_ITEMS = [
  { href: '/colaborador/calendario', labelPt: 'O Meu Calendário', labelDe: 'Mein Kalender',    icon: Calendar },
  { href: '/colaborador/registo',    labelPt: 'Registo de Turnos', labelDe: 'Schichtprotokoll', icon: ClipboardList },
  { href: '/colaborador/pedidos',    labelPt: 'Os Meus Pedidos',   labelDe: 'Meine Anfragen',   icon: FileText },
  { href: '/colaborador/perfil',     labelPt: 'O Meu Perfil',      labelDe: 'Mein Profil',      icon: User },
]

interface Props {
  employeeName: string
}

export default function EmployeeSidebar({ employeeName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [lang, toggleLang] = useLang()
  const [loggingOut, setLoggingOut] = useState(false)

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
          {lang === 'pt' ? 'Sessão iniciada como' : 'Angemeldet als'}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>
          {firstName || employeeName}
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 14px 8px' }} />

      {/* Nav */}
      <nav className="flex-1" style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_ITEMS.map(({ href, labelPt, labelDe, icon: Icon }, i) => {
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
              {lang === 'de' ? labelDe : labelPt}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '0 10px 18px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 4px 8px' }} />

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
