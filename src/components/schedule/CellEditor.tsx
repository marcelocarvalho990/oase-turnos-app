'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

const HALF_SHIFT_CODES = ['HF', 'HS']

function HalfShiftButton({
  st,
  isActive,
  onClick,
}: {
  st: ShiftType
  isActive: boolean
  onClick: () => void
}) {
  const isHF = st.code === 'HF'

  const shiftHalf = (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
      background: st.bgColor, borderBottom: isHF ? `1px solid ${st.borderColor}` : undefined,
      borderTop: !isHF ? `1px solid ${st.borderColor}` : undefined,
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: st.textColor }}>{st.code}</span>
      <span style={{ fontSize: 8, color: st.textColor, opacity: 0.7 }}>{st.startTime1}</span>
    </div>
  )

  const emptyHalf = (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC',
    }}>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#94A3B8' }} />
    </div>
  )

  return (
    <button
      onClick={onClick}
      title={st.name}
      style={{
        width: 52,
        height: 38,
        border: `1.5px solid ${st.borderColor}`,
        borderRadius: 7,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        outline: isActive ? `2px solid ${st.borderColor}` : undefined,
        outlineOffset: isActive ? 2 : undefined,
        boxShadow: isActive ? `0 0 0 3px ${st.bgColor}` : undefined,
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      {isHF ? shiftHalf : emptyHalf}
      {isHF ? emptyHalf : shiftHalf}
    </button>
  )
}

export default function CellEditor({ date, currentCode, shiftTypes, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)

  const handleClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 130)
  }, [closing, onClose])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handleClose()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [handleClose])

  const workShifts = shiftTypes.filter(s => !s.isAbsence && !HALF_SHIFT_CODES.includes(s.code))
  const halfShifts = shiftTypes.filter(s => HALF_SHIFT_CODES.includes(s.code))
  const absenceShifts = shiftTypes.filter(s => s.isAbsence)

  const dateDisplay = new Date(date + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short'
  })

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/20 ${closing ? 'modal-backdrop-out' : 'modal-backdrop'}`}
      onClick={handleClose}
    >
      <div
        ref={ref}
        className={`bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-80 ${closing ? 'anim-scaleOut' : 'anim-scaleIn'}`}
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
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95
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

        {/* Half shifts */}
        {halfShifts.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Halbe Dienste</div>
            <div className="flex gap-2 items-start">
              {halfShifts.map(st => (
                <div key={st.code} className="flex flex-col items-center gap-1">
                  <HalfShiftButton
                    st={st}
                    isActive={currentCode === st.code}
                    onClick={() => onSelect(st.code)}
                  />
                  <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>{st.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Absences */}
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ausências</div>
          <div className="flex flex-wrap gap-1.5">
            {absenceShifts.map(st => (
              <button
                key={st.code}
                onClick={() => onSelect(st.code)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95
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
