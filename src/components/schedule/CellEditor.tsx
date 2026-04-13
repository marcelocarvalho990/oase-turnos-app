'use client'

import { useEffect, useRef } from 'react'
import type { ShiftType } from '@/types'
import ShiftBadge from './ShiftBadge'
import { X } from 'lucide-react'

interface Props {
  employeeId: string
  date: string
  currentCode: string | null
  shiftTypes: ShiftType[]
  onSelect: (code: string | null) => void
  onClose: () => void
}

export default function CellEditor({ date, currentCode, shiftTypes, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  const workShifts = shiftTypes.filter(s => !s.isAbsence)
  const absenceShifts = shiftTypes.filter(s => s.isAbsence)

  const dateDisplay = new Date(date + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short'
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        ref={ref}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-80"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">{dateDisplay}</div>
            {currentCode && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-500">Atual:</span>
                <ShiftBadge code={currentCode} shiftTypes={shiftTypes} size="md" />
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Work shifts */}
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Turnos de Trabalho</div>
          <div className="flex flex-wrap gap-1.5">
            {workShifts.map(st => (
              <button
                key={st.code}
                onClick={() => onSelect(st.code)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105
                  ${currentCode === st.code ? 'ring-2 ring-offset-1' : 'hover:shadow-sm'}
                `}
                style={{
                  backgroundColor: st.bgColor,
                  color: st.textColor,
                  borderColor: st.borderColor,
                }}
                title={st.name}
              >
                <span className="font-bold">{st.code}</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">{st.startTime1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Absences */}
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ausências</div>
          <div className="flex flex-wrap gap-1.5">
            {absenceShifts.map(st => (
              <button
                key={st.code}
                onClick={() => onSelect(st.code)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105
                  ${currentCode === st.code ? 'ring-2 ring-offset-1' : 'hover:shadow-sm'}
                `}
                style={{
                  backgroundColor: st.bgColor,
                  color: st.textColor,
                  borderColor: st.borderColor,
                }}
                title={st.name}
              >
                {st.code}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        {currentCode && (
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelect(null)}
              className="w-full text-center text-xs text-slate-500 hover:text-red-500 py-1.5 transition-colors"
            >
              Limpar célula
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
