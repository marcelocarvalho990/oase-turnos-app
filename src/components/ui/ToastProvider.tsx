'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastEntry {
  id: string
  message: string
  type: ToastType
  exiting: boolean
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

export const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 200)
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type, exiting: false }])
    const timer = setTimeout(() => removeToast(id), 3600)
    timers.current.set(id, timer)
  }, [removeToast])

  useEffect(() => {
    const t = timers.current
    return () => { t.forEach(clearTimeout) }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onRemove }: { toast: ToastEntry; onRemove: () => void }) {
  const variants = {
    success: { border: '#BBF7D0', icon: '#16A34A', iconBg: '#F0FDF4', Component: CheckCircle },
    error:   { border: '#FECACA', icon: '#DC2626', iconBg: '#FEF2F2', Component: AlertCircle },
    info:    { border: '#BFDBFE', icon: '#2563EB', iconBg: '#EFF6FF', Component: Info },
  }
  const v = variants[toast.type]

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff',
        border: `1px solid ${v.border}`,
        borderRadius: 10,
        padding: '10px 12px 10px 10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        fontSize: '0.83rem',
        fontFamily: "'IBM Plex Sans', sans-serif",
        color: '#1E293B',
        pointerEvents: 'all',
        animation: toast.exiting ? 'toastOut 0.18s ease both' : 'toastIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        maxWidth: 340,
        minWidth: 200,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, background: v.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <v.Component size={14} style={{ color: v.icon }} />
      </div>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 2px 2px 4px',
          color: '#CBD5E1', display: 'flex', alignItems: 'center', flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
        onMouseLeave={e => (e.currentTarget.style.color = '#CBD5E1')}
      >
        <X size={13} />
      </button>
    </div>
  )
}
