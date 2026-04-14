'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'manager' | 'employee'
type Lang = 'pt' | 'de'

const t = {
  pt: {
    system: 'Dienstplan-System',
    subtitle: 'Gestão eficiente de horários e turnos',
    tabManager: 'Leitung',
    tabEmployee: 'Mitarbeiter',
    password: 'Palavra-passe',
    passwordPlaceholder: 'Introduzir palavra-passe...',
    pin: 'PIN de 4 dígitos',
    selectEmployee: 'Selecionar colaborador...',
    enter: 'ANMELDEN',
    entering: 'A entrar...',
    error: 'Credenciais inválidas',
    forgot: 'Esqueceu a palavra-passe?',
    footer: '© 2026 Tertianum AG',
    lang: 'DE',
  },
  de: {
    system: 'Dienstplan-System',
    subtitle: 'Effiziente Verwaltung von Arbeitszeiten und Schichten',
    tabManager: 'Leitung',
    tabEmployee: 'Mitarbeiter',
    password: 'Passwort',
    passwordPlaceholder: 'Passwort eingeben...',
    pin: '4-stellige PIN',
    selectEmployee: 'Mitarbeiter auswählen...',
    enter: 'ANMELDEN',
    entering: 'Wird angemeldet...',
    error: 'Ungültige Anmeldedaten',
    forgot: 'Passwort vergessen?',
    footer: '© 2026 Tertianum AG',
    lang: 'PT',
  },
}

interface Employee { id: string; name: string; shortName: string }


export default function LoginClient() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('de')
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

  // Tertianum primary blue
  const BLUE = '#003A5D'
  const BLUE_BTN = '#003A5D'
  const BLUE_BTN_HOVER = '#002D47'

  function handlePinChange(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...pin]
    next[i] = digit
    setPin(next)
    if (digit && i < 3) pinRefs[i + 1].current?.focus()
  }

  function handlePinKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      const next = [...pin]
      next[i - 1] = ''
      setPin(next)
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
      if (!res.ok) { setError((await res.json()).error || tx.error); setLoading(false); return }
      const data = await res.json()
      if (data.role === 'MANAGER') router.push('/schedule')
      else router.push('/colaborador/calendario')
    } catch {
      setError(tx.error)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Left panel — Tertianum brand */}
      <div
        style={{
          flex: '1 1 0',
          background: `linear-gradient(160deg, #002D47 0%, ${BLUE} 45%, #001E30 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Crect width=\'4\' height=\'4\' fill=\'%231C4280\'/%3E%3Crect width=\'1\' height=\'1\' x=\'0\' y=\'0\' fill=\'%231A3D73\' opacity=\'0.6\'/%3E%3Crect width=\'1\' height=\'1\' x=\'2\' y=\'2\' fill=\'%231E4890\' opacity=\'0.4\'/%3E%3C/svg%3E")',
          opacity: 0.5,
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <img
            src="/240513_tertianum_branding_marco-simonetti_2@2x.png"
            alt="Tertianum"
            style={{ width: 200, display: 'block' }}
          />
        </div>

        {/* Center text */}
        <div style={{ position: 'relative' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 700,
            color: 'white',
            margin: '0 0 12px',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
          }}>
            {tx.system}
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.65)',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 280,
          }}>
            {tx.subtitle}
          </p>
        </div>

        {/* Footer / lang toggle */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{tx.footer}</span>
          <button
            onClick={() => setLang(l => l === 'pt' ? 'de' : 'pt')}
            style={{
              padding: '5px 12px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {tx.lang}
          </button>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 400,
        flexShrink: 0,
        background: '#F4F6F9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: 10,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          padding: '32px 32px 28px',
          width: '100%',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid #D8E0EA',
            marginBottom: 28,
          }}>
            {(['manager', 'employee'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: tab === t ? BLUE : 'transparent',
                  border: 'none',
                  color: tab === t ? 'white' : '#5A7089',
                  fontSize: '0.82rem',
                  fontWeight: tab === t ? 600 : 400,
                  letterSpacing: '0.03em',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t === 'manager' ? tx.tabManager : tx.tabEmployee}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tab === 'manager' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#1C3050', marginBottom: 6 }}>
                  {tx.password}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tx.passwordPlaceholder}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #C8D6E5',
                    borderRadius: 5,
                    fontSize: '0.9rem',
                    color: '#1C3050',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'white',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = BLUE_BTN }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#C8D6E5' }}
                />
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#1C3050', marginBottom: 6 }}>
                    {tx.tabEmployee}
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #C8D6E5',
                      borderRadius: 5,
                      fontSize: '0.85rem',
                      color: selectedEmployee ? '#1C3050' : '#8A9BB0',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      background: 'white',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = BLUE_BTN }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#C8D6E5' }}
                  >
                    <option value="">{tx.selectEmployee}</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#1C3050', marginBottom: 6 }}>
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
                          border: '1px solid #C8D6E5',
                          borderRadius: 5,
                          fontSize: '1.3rem',
                          fontWeight: 600,
                          color: '#1C3050',
                          outline: 'none',
                          background: 'white',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = BLUE_BTN }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#C8D6E5' }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div style={{
                padding: '8px 12px',
                background: '#FEE2E2',
                borderRadius: 5,
                color: '#B91C1C',
                fontSize: '0.78rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#7AA8C0' : BLUE_BTN,
                border: 'none',
                borderRadius: 5,
                color: 'white',
                fontSize: '0.82rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = BLUE_BTN_HOVER }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = BLUE_BTN }}
            >
              {loading ? tx.entering : tx.enter}
            </button>

            {tab === 'manager' && (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#5A7089', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {tx.forgot}
                </button>
              </div>
            )}
          </form>
        </div>

        <div style={{ marginTop: 20, fontSize: '0.7rem', color: '#9AAABB' }}>{tx.footer}</div>
      </div>
    </div>
  )
}
