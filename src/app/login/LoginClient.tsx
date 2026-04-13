'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'manager' | 'employee'
type Lang = 'pt' | 'de'

const t = {
  pt: {
    tagline: 'Sistema de Turnos',
    org: 'Tertianum · 2.OG',
    tabManager: 'Gestor',
    tabEmployee: 'Colaborador',
    password: 'Palavra-passe',
    pin: 'PIN de 4 dígitos',
    selectEmployee: 'Selecionar colaborador...',
    enter: 'Entrar',
    entering: 'A entrar...',
    error: 'Credenciais inválidas',
    lang: 'DE',
  },
  de: {
    tagline: 'Dienstplan-System',
    org: 'Tertianum · 2.OG',
    tabManager: 'Manager',
    tabEmployee: 'Mitarbeiter',
    password: 'Passwort',
    pin: '4-stellige PIN',
    selectEmployee: 'Mitarbeiter auswählen...',
    enter: 'Anmelden',
    entering: 'Wird angemeldet...',
    error: 'Ungültige Anmeldedaten',
    lang: 'PT',
  },
}

interface Employee {
  id: string
  name: string
  shortName: string
}

export default function LoginClient() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('pt')
  const [tab, setTab] = useState<Tab>('manager')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState(['', '', '', ''])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => {
    fetch('/api/auth/employees').then(r => r.json()).then(setEmployees).catch(() => {})
  }, [])

  const tx = t[lang]

  function handlePinChange(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...pin]
    next[i] = digit
    setPin(next)
    if (digit && i < 3) pinRefs[i + 1].current?.focus()
    if (!digit && i > 0 && val === '') pinRefs[i - 1].current?.focus()
  }

  function handlePinKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      pinRefs[i - 1].current?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body = tab === 'manager'
      ? { role: 'MANAGER', password }
      : { role: 'EMPLOYEE', employeeId: selectedEmployee, pin: pin.join('') }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || tx.error)
        setLoading(false)
        return
      }

      const data = await res.json()
      if (data.role === 'MANAGER') router.push('/schedule')
      else router.push('/colaborador/calendario')
    } catch {
      setError(tx.error)
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0E0D0C',
        display: 'flex',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(193,68,14,0.07) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(193,68,14,0.04) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Left panel — large typographic statement */}
      <div
        style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '48px 52px',
          position: 'relative',
        }}
      >
        {/* Top-left org label */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 52,
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#555',
          }}
        >
          {tx.org}
        </div>

        {/* Lang toggle */}
        <button
          onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')}
          style={{
            position: 'absolute',
            top: 36,
            right: 40,
            padding: '6px 14px',
            borderRadius: 4,
            border: '1px solid #333',
            background: 'transparent',
            color: '#666',
            fontSize: '0.72rem',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {tx.lang}
        </button>

        {/* Hero text */}
        <div>
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 'clamp(5rem, 12vw, 9rem)',
              color: '#FAF8F4',
              lineHeight: 0.9,
              letterSpacing: '-0.03em',
              marginBottom: 24,
            }}
          >
            Turnos
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#444',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              paddingLeft: 4,
            }}
          >
            {tx.tagline}
          </div>
        </div>

        {/* Decorative accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 52,
            width: 1,
            height: '35%',
            background: 'linear-gradient(to bottom, #C1440E, transparent)',
          }}
        />
      </div>

      {/* Right panel — login form */}
      <div
        style={{
          width: 380,
          flexShrink: 0,
          background: '#141312',
          borderLeft: '1px solid #1E1D1B',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 40px',
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 32,
            borderBottom: '1px solid #222',
          }}
        >
          {(['manager', 'employee'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? '2px solid #C1440E' : '2px solid transparent',
                color: tab === t ? '#FAF8F4' : '#555',
                fontSize: '0.78rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'color 0.15s',
                marginBottom: -1,
              }}
            >
              {t === 'manager' ? tx.tabManager : tx.tabEmployee}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tab === 'manager' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                {tx.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: '#1A1917',
                  border: '1px solid #2A2826',
                  borderRadius: 6,
                  color: '#FAF8F4',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#C1440E' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#2A2826' }}
              />
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {tx.tabEmployee}
                </label>
                <select
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: '#1A1917',
                    border: '1px solid #2A2826',
                    borderRadius: 6,
                    color: selectedEmployee ? '#FAF8F4' : '#555',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#C1440E' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#2A2826' }}
                >
                  <option value="">{tx.selectEmployee}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {tx.pin}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={pinRefs[i]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handlePinChange(i, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(i, e)}
                      style={{
                        width: 52,
                        height: 52,
                        textAlign: 'center',
                        background: '#1A1917',
                        border: '1px solid #2A2826',
                        borderRadius: 6,
                        color: '#FAF8F4',
                        fontSize: '1.2rem',
                        fontWeight: 500,
                        outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#C1440E' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#2A2826' }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(193,68,14,0.1)',
                border: '1px solid rgba(193,68,14,0.3)',
                borderRadius: 6,
                color: '#E06040',
                fontSize: '0.78rem',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              background: loading ? '#333' : '#C1440E',
              border: 'none',
              borderRadius: 6,
              color: '#FAF8F4',
              fontSize: '0.82rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#A83A0C' }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#C1440E' }}
          >
            {loading ? tx.entering : tx.enter}
          </button>
        </form>

        {/* Bottom version */}
        <div style={{ marginTop: 'auto', paddingTop: 40, fontSize: '0.65rem', color: '#333', letterSpacing: '0.06em' }}>
          v1.0 · 2026
        </div>
      </div>
    </div>
  )
}
