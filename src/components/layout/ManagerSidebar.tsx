'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, Users, Clock, ShieldCheck, BarChart3, CheckSquare, LogOut, Globe } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/schedule', labelPt: 'Escala', labelDe: 'Dienstplan', icon: CalendarDays },
  { href: '/staff', labelPt: 'Colaboradores', labelDe: 'Mitarbeiter', icon: Users },
  { href: '/shifts', labelPt: 'Turnos', labelDe: 'Schichten', icon: Clock },
  { href: '/coverage', labelPt: 'Cobertura', labelDe: 'Abdeckung', icon: ShieldCheck },
  { href: '/fairness', labelPt: 'Equidade', labelDe: 'Gerechtigkeit', icon: BarChart3 },
  { href: '/gerente/pedidos', labelPt: 'Aprovações', labelDe: 'Genehmigungen', icon: CheckSquare },
]

export default function ManagerSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [lang, setLang] = useState<'pt' | 'de'>('pt')
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      className="w-52 shrink-0 flex flex-col h-full border-r"
      style={{
        background: '#1C3F72',
        borderColor: '#163460',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <div
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '1.5rem',
            color: '#FAF8F4',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Turnos
        </div>
        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Tertianum · Gestor
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#163460', margin: '0 20px' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ href, labelPt, labelDe, icon: Icon }) => {
          const active = pathname === href || (href !== '/schedule' && pathname.startsWith(href))
          const label = lang === 'de' ? labelDe : labelPt
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: active ? 500 : 400,
                color: active ? '#FAF8F4' : '#888',
                background: active ? '#1A5DAD' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = '#163460'
                  ;(e.currentTarget as HTMLElement).style.color = '#FAF8F4'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#888'
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
        {/* Language toggle */}
        <button
          onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: '0.8rem',
            color: '#666',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#163460'
            ;(e.currentTarget as HTMLElement).style.color = '#FAF8F4'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#666'
          }}
        >
          <Globe size={15} strokeWidth={1.8} />
          {lang === 'pt' ? 'Português' : 'Deutsch'}
        </button>

        {/* Logout */}
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
            color: '#666',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            opacity: loggingOut ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#163460'
            ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#666'
          }}
        >
          <LogOut size={15} strokeWidth={1.8} />
          {lang === 'pt' ? 'Sair' : 'Abmelden'}
        </button>
      </div>
    </aside>
  )
}
