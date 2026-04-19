'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Calendar, FileText, ClipboardCheck, User } from 'lucide-react'

const TABS = [
  { href: '/colaborador',           label: 'Home',      icon: House          },
  { href: '/colaborador/calendario', label: 'Calendário', icon: Calendar       },
  { href: '/colaborador/pedidos',    label: 'Pedidos',   icon: FileText       },
  { href: '/colaborador/registo',    label: 'Registo',   icon: ClipboardCheck },
  { href: '/colaborador/perfil',     label: 'Perfil',    icon: User           },
]

export default function EmployeeMobileNav() {
  const pathname = usePathname()

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
      {TABS.map(({ href, label, icon: Icon }) => {
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
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
