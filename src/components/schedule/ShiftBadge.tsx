import type { ShiftType } from '@/types'

interface Props {
  code: string
  shiftTypes: ShiftType[]
  size?: 'sm' | 'md'
}

export default function ShiftBadge({ code, shiftTypes, size = 'sm' }: Props) {
  const st = shiftTypes.find(s => s.code === code)
  const style = st
    ? { backgroundColor: st.bgColor, color: st.textColor, borderColor: st.borderColor }
    : { backgroundColor: '#F9FAFB', color: '#6B7280', borderColor: '#E5E7EB' }

  return (
    <span
      className={`inline-flex items-center justify-center border font-semibold rounded select-none
        ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5 min-w-[26px]' : 'text-xs px-2 py-0.5 min-w-[32px]'}
      `}
      style={style}
      title={st?.name ?? code}
    >
      {code}
    </span>
  )
}
