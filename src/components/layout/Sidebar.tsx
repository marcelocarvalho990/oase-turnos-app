'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Users,
  Clock,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/schedule', label: 'Escala', icon: CalendarDays },
  { href: '/staff', label: 'Colaboradores', icon: Users },
  { href: '/shifts', label: 'Turnos', icon: Clock },
  { href: '/coverage', label: 'Cobertura', icon: ShieldCheck },
  { href: '/fairness', label: 'Equidade', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-slate-900 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#003A5D] flex items-center justify-center">
            <CalendarDays size={15} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">Turnos</div>
            <div className="text-slate-400 text-xs">Tertianum 2.OG</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#003A5D] text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">v1.0 · April 2026</p>
      </div>
    </aside>
  )
}
