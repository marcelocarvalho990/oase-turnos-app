'use client'

import { useState } from 'react'
import { User, Lock, Building2, CheckCircle, AlertCircle } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useLang } from '@/hooks/useLang'
import type { Lang } from '@/hooks/useLang'

const PROF_TX: Record<Lang, {
  title: string; infoTab: string; pinTab: string;
  role: string; workPct: string; team: string;
  floorsTitle: string; main: string; onlyMain: string; contactManager: string;
  changePinTitle: string; changePinSub: string;
  currentPin: string; newPin: string; confirmPin: string;
  pinOk: string; loading: string; confirm: string;
  errMismatch: string; errFormat: string; errNetwork: string;
}> = {
  pt: { title: 'O Meu Perfil', infoTab: 'Informações', pinTab: 'Alterar PIN', role: 'Função', workPct: 'Percentagem contratual', team: 'Equipa / Andar base', floorsTitle: 'Andares / Cobertura', main: 'principal', onlyMain: 'Apenas equipa principal', contactManager: 'Para alterar os andares de cobertura, contacte o seu responsável.', changePinTitle: 'Alterar PIN de acesso', changePinSub: 'Mínimo 4 dígitos numéricos', currentPin: 'PIN atual', newPin: 'Novo PIN', confirmPin: 'Confirmar novo PIN', pinOk: 'PIN alterado com sucesso!', loading: 'A guardar...', confirm: 'Confirmar alteração', errMismatch: 'Os PINs não coincidem', errFormat: 'O PIN deve ter 4 a 6 dígitos numéricos', errNetwork: 'Erro de rede. Tente novamente.' },
  de: { title: 'Mein Profil', infoTab: 'Informationen', pinTab: 'PIN ändern', role: 'Funktion', workPct: 'Vertragsanteil', team: 'Team / Hauptetage', floorsTitle: 'Etagen / Abdeckung', main: 'Haupt', onlyMain: 'Nur Hauptteam', contactManager: 'Um die Abdeckungsetagen zu ändern, wenden Sie sich an Ihren Vorgesetzten.', changePinTitle: 'Zugangs-PIN ändern', changePinSub: 'Mindestens 4 numerische Stellen', currentPin: 'Aktueller PIN', newPin: 'Neuer PIN', confirmPin: 'Neuen PIN bestätigen', pinOk: 'PIN erfolgreich geändert!', loading: 'Wird gespeichert...', confirm: 'Änderung bestätigen', errMismatch: 'PINs stimmen nicht überein', errFormat: 'PIN muss 4–6 Ziffern haben', errNetwork: 'Netzwerkfehler. Erneut versuchen.' },
  en: { title: 'My Profile', infoTab: 'Information', pinTab: 'Change PIN', role: 'Role', workPct: 'Contract percentage', team: 'Team / Home floor', floorsTitle: 'Floors / Coverage', main: 'main', onlyMain: 'Home team only', contactManager: 'To change coverage floors, contact your manager.', changePinTitle: 'Change access PIN', changePinSub: 'Minimum 4 numeric digits', currentPin: 'Current PIN', newPin: 'New PIN', confirmPin: 'Confirm new PIN', pinOk: 'PIN changed successfully!', loading: 'Saving...', confirm: 'Confirm change', errMismatch: 'PINs do not match', errFormat: 'PIN must be 4–6 digits', errNetwork: 'Network error. Please try again.' },
  fr: { title: 'Mon profil', infoTab: 'Informations', pinTab: 'Changer le PIN', role: 'Fonction', workPct: 'Pourcentage contractuel', team: 'Équipe / Étage principal', floorsTitle: 'Étages / Couverture', main: 'principal', onlyMain: 'Équipe principale uniquement', contactManager: 'Pour modifier les étages de couverture, contactez votre responsable.', changePinTitle: 'Modifier le PIN d\'accès', changePinSub: 'Minimum 4 chiffres numériques', currentPin: 'PIN actuel', newPin: 'Nouveau PIN', confirmPin: 'Confirmer le nouveau PIN', pinOk: 'PIN modifié avec succès !', loading: 'Enregistrement...', confirm: 'Confirmer la modification', errMismatch: 'Les PINs ne correspondent pas', errFormat: 'Le PIN doit comporter 4 à 6 chiffres', errNetwork: 'Erreur réseau. Réessayez.' },
  it: { title: 'Il mio profilo', infoTab: 'Informazioni', pinTab: 'Cambia PIN', role: 'Funzione', workPct: 'Percentuale contrattuale', team: 'Team / Piano principale', floorsTitle: 'Piani / Copertura', main: 'principale', onlyMain: 'Solo team principale', contactManager: 'Per modificare i piani di copertura, contattare il responsabile.', changePinTitle: 'Modifica PIN di accesso', changePinSub: 'Minimo 4 cifre numeriche', currentPin: 'PIN attuale', newPin: 'Nuovo PIN', confirmPin: 'Conferma nuovo PIN', pinOk: 'PIN modificato con successo!', loading: 'Salvataggio...', confirm: 'Conferma modifica', errMismatch: 'I PIN non coincidono', errFormat: 'Il PIN deve avere 4–6 cifre', errNetwork: 'Errore di rete. Riprova.' },
}

interface Employee {
  id: string
  name: string
  shortName: string
  role: string
  roleLabel: string
  workPercentage: number
  team: string
  canCoverOtherTeams: boolean
}

interface Props {
  employee: Employee
  otherTeams: string[]
}

const TIER_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  TEAMLEITUNG:      { label: 'HF', bg: '#EFF6FF', color: '#003A5D' },
  FUNKTIONSSTUFE_3: { label: 'FAGE', bg: '#F0FDF4', color: '#15803D' },
  FUNKTIONSSTUFE_2: { label: 'FAGE', bg: '#F0FDF4', color: '#15803D' },
  FUNKTIONSSTUFE_1: { label: 'SRK', bg: '#FFF7ED', color: '#C2410C' },
  LERNENDE:         { label: 'SRK', bg: '#FFF7ED', color: '#C2410C' },
}

export default function EmployeeProfileClient({ employee, otherTeams }: Props) {
  const [tab, setTab] = useState<'info' | 'pin'>('info')
  const isMobile = useIsMobile()
  const [lang] = useLang()
  const tx = PROF_TX[lang]
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinStatus, setPinStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [pinError, setPinError] = useState('')

  const tier = TIER_BADGE[employee.role]

  async function handlePinChange(e: React.FormEvent) {
    e.preventDefault()
    setPinStatus('idle')
    setPinError('')

    if (newPin !== confirmPin) {
      setPinError(tx.errMismatch)
      return
    }
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError(tx.errFormat)
      return
    }

    setPinStatus('loading')

    try {
      const res = await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPinError(data.error ?? 'Erro ao alterar PIN')
        setPinStatus('error')
      } else {
        setPinStatus('ok')
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      }
    } catch {
      setPinError(tx.errNetwork)
      setPinStatus('error')
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Page header */}
      <div style={{ background: '#003A5D', padding: isMobile ? '14px 16px' : '20px 28px' }}>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1rem', fontWeight: 800, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          {tx.title}
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', fontFamily: "'IBM Plex Mono', monospace" }}>
          {employee.name.toUpperCase()}
        </p>
      </div>

      <div style={{ padding: isMobile ? '14px 16px' : '20px 28px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #003A5D' }}>
        {([
          { key: 'info', label: tx.infoTab, icon: User },
          { key: 'pin',  label: tx.pinTab,  icon: Lock },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === key ? '2px solid #003A5D' : '2px solid transparent',
              color: tab === key ? '#003A5D' : '#7A9BAD',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '0.82rem',
              fontWeight: tab === key ? 600 : 400,
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
          {/* Avatar card */}
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #D8E2E8',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #003A5D, #004E7A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.4rem',
                fontFamily: "'Poppins', sans-serif",
                flexShrink: 0,
              }}
            >
              {employee.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#001E30' }}>{employee.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#7A9BAD', marginTop: 2 }}>{employee.shortName}</div>
            </div>
            {tier && (
              <div
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: tier.bg,
                  color: tier.color,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                {tier.label}
              </div>
            )}
          </div>

          {/* Details grid */}
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #D8E2E8',
              overflow: 'hidden',
            }}
          >
            {[
              { label: tx.role, value: employee.roleLabel },
              { label: tx.workPct, value: `${employee.workPercentage}%` },
              { label: tx.team, value: employee.team },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid #F4F6F8' : 'none',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#7A9BAD' }}>{label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#001E30' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Floors / coverage */}
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #D8E2E8',
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Building2 size={15} color="#003A5D" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#001E30' }}>{tx.floorsTitle}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {/* Home team */}
              <span
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  background: '#EFF6FF',
                  color: '#003A5D',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: '1px solid #BFDBFE',
                }}
              >
                {employee.team} · {tx.main}
              </span>

              {/* Other teams if canCoverOtherTeams */}
              {employee.canCoverOtherTeams && otherTeams.map(t => (
                <span
                  key={t}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    background: '#F0FDF4',
                    color: '#15803D',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: '1px solid #BBF7D0',
                  }}
                >
                  {t}
                </span>
              ))}

              {!employee.canCoverOtherTeams && (
                <span style={{ fontSize: '0.75rem', color: '#7A9BAD' }}>
                  {tx.onlyMain}
                </span>
              )}
            </div>

            <p style={{ margin: '12px 0 0', fontSize: '0.72rem', color: '#7A9BAD' }}>
              {tx.contactManager}
            </p>
          </div>
        </div>
      )}

      {/* Tab: PIN */}
      {tab === 'pin' && (
        <div style={{ maxWidth: isMobile ? '100%' : 400, width: '100%' }}>
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #D8E2E8',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={16} color="#003A5D" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#001E30' }}>{tx.changePinTitle}</div>
                <div style={{ fontSize: '0.72rem', color: '#7A9BAD' }}>{tx.changePinSub}</div>
              </div>
            </div>

            <form onSubmit={handlePinChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { id: 'cur', label: tx.currentPin, value: currentPin, setter: setCurrentPin },
                { id: 'new', label: tx.newPin, value: newPin, setter: setNewPin },
                { id: 'conf', label: tx.confirmPin, value: confirmPin, setter: setConfirmPin },
              ].map(({ id, label, value, setter }) => (
                <div key={id}>
                  <label
                    htmlFor={id}
                    style={{ display: 'block', fontSize: '0.75rem', color: '#4A6878', marginBottom: 5, fontWeight: 500 }}
                  >
                    {label}
                  </label>
                  <input
                    id={id}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={value}
                    onChange={e => setter(e.target.value.replace(/\D/g, ''))}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D8E2E8',
                      borderRadius: 8,
                      fontSize: '1rem',
                      letterSpacing: '0.2em',
                      outline: 'none',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#003A5D' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#D8E2E8' }}
                  />
                </div>
              ))}

              {pinStatus === 'error' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: '#FEF2F2',
                    borderRadius: 8,
                    color: '#DC2626',
                    fontSize: '0.78rem',
                  }}
                >
                  <AlertCircle size={14} />
                  {pinError}
                </div>
              )}

              {pinStatus === 'ok' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '10px 14px',
                    background: '#F0FDF4',
                    borderRadius: 8,
                    color: '#15803D',
                    fontSize: '0.78rem',
                  }}
                >
                  <CheckCircle size={14} />
                  {tx.pinOk}
                </div>
              )}

              <button
                type="submit"
                disabled={pinStatus === 'loading'}
                style={{
                  padding: '11px',
                  background: pinStatus === 'loading' ? '#7AA8C0' : '#003A5D',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  cursor: pinStatus === 'loading' ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  marginTop: 4,
                }}
              >
                {pinStatus === 'loading' ? tx.loading : tx.confirm}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>{/* /padding wrapper */}
    </div>
  )
}
