'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, FileText, CheckSquare, Users, Clock, BarChart2, Settings } from 'lucide-react'

const TABS = [
  { href: '/schedule',              label: 'Escala',       icon: Calendar    },
  { href: '/gerente/pedidos',       label: 'Pedidos',      icon: FileText    },
  { href: '/gerente/confirmacoes',  label: 'Confirmações', icon: CheckSquare },
  { href: '/staff',                 label: 'Equipa',       icon: Users       },
  { href: '/shifts',                label: 'Turnos',       icon: Clock       },
  { href: '/coverage',              label: 'Cobertura',    icon: BarChart2   },
  { href: '/definicoes',            label: 'Definições',   icon: Settings    },
]

export default function ManagerMobileNav() {
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
        overflowX: 'auto',
        scrollbarWidth: 'none',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/schedule'
          ? pathname === href
          : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: '0 0 auto',
              minWidth: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: isActive ? '#003A5D' : '#94A3B8',
              padding: '0 8px',
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
