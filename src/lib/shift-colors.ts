export interface ShiftColor {
  bg: string
  text: string
  border: string
}

export const SHIFT_COLORS: Record<string, ShiftColor> = {
  // Work shifts
  F:    { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
  F9:   { bg: '#E0E7FF', text: '#4338CA', border: '#A5B4FC' },
  G:    { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' },
  M:    { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  S:    { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  B:    { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  I:    { bg: '#F0FDF4', text: '#166534', border: '#86EFAC' },
  Fr:   { bg: '#CFFAFE', text: '#164E63', border: '#67E8F9' },
  Stv:  { bg: '#FDF2F8', text: '#9D174D', border: '#F9A8D4' },
  LB:   { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
  // Absences
  Ferien:      { bg: '#BBF7D0', text: '#14532D', border: '#4ADE80' },
  Krank30:     { bg: '#FEE2E2', text: '#7F1D1D', border: '#F87171' },
  Krank31:     { bg: '#FECACA', text: '#450A0A', border: '#EF4444' },
  Geburtstag:  { bg: '#FDE68A', text: '#78350F', border: '#FCD34D' },
  WbIntern:    { bg: '#E0F2FE', text: '#0C4A6E', border: '#7DD3FC' },
  WbExtern:    { bg: '#BAE6FD', text: '#0C4A6E', border: '#38BDF8' },
  Berufsschule:{ bg: '#F0F9FF', text: '#0C4A6E', border: '#BAE6FD' },
  UbKurs:      { bg: '#E0F2FE', text: '#075985', border: '#7DD3FC' },
  Wunschfrei:  { bg: '#F5F3FF', text: '#4C1D95', border: '#DDD6FE' },
  Frei:        { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  Kompensation:{ bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  Pikett:      { bg: '#F0F9FF', text: '#0C4A6E', border: '#BAE6FD' },
}

export function getShiftColor(code: string): ShiftColor {
  return SHIFT_COLORS[code] ?? { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' }
}
