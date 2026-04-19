'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Calendar, FileText, ClipboardCheck, User } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import type { Lang } from '@/hooks/useLang'

const TAB_LABELS: Record<string, Record<Lang, string>> = {
  '/colaborador':            { pt: 'Home',      de: 'Start',    en: 'Home',     fr: 'Accueil',  it: 'Home'    },
  '/colaborador/calendario': { pt: 'Calendário',de: 'Kalender', en: 'Calendar', fr: 'Calendrier', it: 'Calendario' },
  '/colaborador/pedidos':    { pt: 'Pedidos',   de: 'Anträge',  en: 'Requests', fr: 'Demandes', it: 'Richieste' },
  '/colaborador/registo':    { pt: 'Registo',   de: 'Protokoll',en: 'Log',      fr: 'Registre', it: 'Registro' },
  '/colaborador/perfil':     { pt: 'Perfil',    de: 'Profil',   en: 'Profile',  fr: 'Profil',   it: 'Profilo' },
}

const TABS = [
  { href: '/colaborador',            icon: House          },
  { href: '/colaborador/calendario', icon: Calendar       },
  { href: '/colaborador/pedidos',    icon: FileText       },
  { href: '/colaborador/registo',    icon: ClipboardCheck },
  { href: '/colaborador/perfil',     icon: User           },
]

export default function EmployeeMobileNav() {
  const pathname = usePathname()
  const [lang] = useLang()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'white',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 100,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {TABS.map(({ href, icon: Icon }) => {
        const isActive = href === '/colaborador'
          ? pathname === href || pathname === '/colaborador/'
          : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: isActive ? '#003A5D' : '#94A3B8',
              minWidth: 0,
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400, letterSpacing: '0.02em' }}>
              {TAB_LABELS[href][lang]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
