'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, FileText, CheckSquare, Users, Clock, BarChart2, Settings } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import type { Lang } from '@/hooks/useLang'

const TAB_LABELS: Record<string, Record<Lang, string>> = {
  '/schedule':             { pt: 'Escala',       de: 'Dienstplan',     en: 'Schedule',    fr: 'Planning',      it: 'Turni'        },
  '/gerente/pedidos':      { pt: 'Pedidos',      de: 'Anträge',        en: 'Requests',    fr: 'Demandes',      it: 'Richieste'    },
  '/gerente/confirmacoes': { pt: 'Confirmações', de: 'Bestätigungen',  en: 'Confirmations', fr: 'Confirmations', it: 'Conferme'   },
  '/staff':                { pt: 'Equipa',       de: 'Team',           en: 'Team',        fr: 'Équipe',        it: 'Team'         },
  '/shifts':               { pt: 'Turnos',       de: 'Schichten',      en: 'Shifts',      fr: 'Postes',        it: 'Turni'        },
  '/coverage':             { pt: 'Cobertura',    de: 'Abdeckung',      en: 'Coverage',    fr: 'Couverture',    it: 'Copertura'    },
  '/definicoes':           { pt: 'Definições',   de: 'Einstellungen',  en: 'Settings',    fr: 'Paramètres',    it: 'Impostazioni' },
}

const TABS = [
  { href: '/schedule',              icon: Calendar    },
  { href: '/gerente/pedidos',       icon: FileText    },
  { href: '/gerente/confirmacoes',  icon: CheckSquare },
  { href: '/staff',                 icon: Users       },
  { href: '/shifts',                icon: Clock       },
  { href: '/coverage',              icon: BarChart2   },
  { href: '/definicoes',            icon: Settings    },
]

export default function ManagerMobileNav() {
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
        overflowX: 'auto',
        scrollbarWidth: 'none',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {TABS.map(({ href, icon: Icon }) => {
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
              color: isActive ? '#9B7353' : '#94A3B8',
              padding: '0 8px',
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              {TAB_LABELS[href][lang]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
