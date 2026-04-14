'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, FileText, User, LogOut, Globe } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/colaborador/calendario', labelPt: 'O Meu Calendário', labelDe: 'Mein Kalender', icon: Calendar },
  { href: '/colaborador/pedidos',    labelPt: 'Os Meus Pedidos',  labelDe: 'Meine Anfragen', icon: FileText },
  { href: '/colaborador/perfil',     labelPt: 'O Meu Perfil',     labelDe: 'Mein Profil',    icon: User },
]

interface Props {
  employeeName: string
}

export default function EmployeeSidebar({ employeeName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [lang, setLang] = useState<'pt' | 'de'>('pt')
  const [loggingOut, setLoggingOut] = useState(false)

  const firstName = employeeName.split(' ')[0]

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      className="w-52 shrink-0 flex flex-col h-full"
      style={{
        background: '#003A5D',
        borderRight: '1px solid #002D47',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-5">
        <img
          src="/240513_tertianum_branding_marco-simonetti_2@2x.png"
          alt="Tertianum"
          style={{ width: '100%', maxWidth: 148, display: 'block' }}
        />
        <div style={{ fontSize: '0.62rem', color: '#6AA3BF', marginTop: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Dienstplan · Colaborador
        </div>
      </div>

      {/* Employee greeting */}
      <div style={{ margin: '0 12px 12px', padding: '10px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '0.68rem', color: '#6AA3BF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
          {lang === 'pt' ? 'Sessão iniciada como' : 'Angemeldet als'}
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#FFFFFF' }}>
          {firstName || employeeName}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#002D47', margin: '0 20px 8px' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ href, labelPt, labelDe, icon: Icon }) => {
          const active = pathname.startsWith(href)
          const label = lang === 'de' ? labelDe : labelPt
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: active ? 500 : 400,
                color: active ? '#FFFFFF' : '#6AA3BF',
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                textDecoration: 'none',
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
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: '0.8rem',
            color: '#6AA3BF',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = '#FFFFFF'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#6AA3BF'
          }}
        >
          <Globe size={15} strokeWidth={1.8} />
          {lang === 'pt' ? 'Português' : 'Deutsch'}
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: '0.8rem',
            color: '#6AA3BF',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            opacity: loggingOut ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#6AA3BF'
          }}
        >
          <LogOut size={15} strokeWidth={1.8} />
          {lang === 'pt' ? 'Sair' : 'Abmelden'}
        </button>
      </div>
    </aside>
  )
}
