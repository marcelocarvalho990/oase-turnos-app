'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { useLang } from '@/hooks/useLang'
import type { Lang } from '@/hooks/useLang'

interface Action {
  type: 'UPSERT' | 'REMOVE'
  scheduleId: string
  employeeId: string
  date: string
  shiftCode: string
  employeeName: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: Action[]
  actionsApplied?: boolean
  actionsCancelled?: boolean
}

const SUGGESTIONS: Record<Lang, string[]> = {
  pt: [
    'Quem trabalhou mais fins de semana este mês?',
    'Quais colaboradores têm pedidos pendentes?',
    'Quem tem menos horas trabalhadas em relação ao alvo?',
    'Quantas horas deve trabalhar alguém a 80%?',
    'Quem são os colaboradores FAGE da equipa?',
    'Qual a diferença entre turno F e turno S?',
  ],
  de: [
    'Wer hat diesen Monat am meisten Wochenenden gearbeitet?',
    'Welche Mitarbeiter haben ausstehende Anfragen?',
    'Wer hat die wenigsten Stunden im Verhältnis zum Ziel?',
    'Wie viele Stunden soll jemand mit 80% arbeiten?',
    'Wer sind die FAGE-Mitarbeiter im Team?',
    'Was ist der Unterschied zwischen Schicht F und Schicht S?',
  ],
  en: [
    'Who worked the most weekends this month?',
    'Which employees have pending requests?',
    'Who has the fewest hours worked relative to their target?',
    'How many hours should someone at 80% work?',
    'Who are the FAGE employees on the team?',
    'What is the difference between shift F and shift S?',
  ],
  fr: [
    'Qui a travaillé le plus de week-ends ce mois-ci ?',
    'Quels collaborateurs ont des demandes en attente ?',
    'Qui a le moins d\'heures travaillées par rapport à l\'objectif ?',
    'Combien d\'heures doit travailler quelqu\'un à 80 % ?',
    'Qui sont les collaborateurs FAGE de l\'équipe ?',
    'Quelle est la différence entre le poste F et le poste S ?',
  ],
  it: [
    'Chi ha lavorato più weekend questo mese?',
    'Quali collaboratori hanno richieste in sospeso?',
    'Chi ha meno ore lavorate rispetto all\'obiettivo?',
    'Quante ore deve lavorare qualcuno all\'80%?',
    'Chi sono i collaboratori FAGE del team?',
    'Qual è la differenza tra il turno F e il turno S?',
  ],
}

const T: Record<string, Record<Lang, string>> = {
  title:        { pt: 'Assistente AI',                                             de: 'KI-Assistent',                                          en: 'AI Assistant',                                              fr: 'Assistant IA',                                              it: 'Assistente AI'                                              },
  subtitle:     { pt: 'Pergunta qualquer coisa sobre a equipa, turnos e escalas',  de: 'Stelle eine Frage zum Team, Schichten und Dienstplänen',  en: 'Ask anything about the team, shifts and schedules',         fr: 'Posez une question sur l\'équipe, les postes et les plannings', it: 'Chiedi qualsiasi cosa sul team, i turni e i turni'          },
  clear:        { pt: 'Limpar',                                                    de: 'Löschen',                                               en: 'Clear',                                                     fr: 'Effacer',                                                   it: 'Cancella'                                                   },
  clearTitle:   { pt: 'Limpar conversa',                                           de: 'Gespräch löschen',                                      en: 'Clear conversation',                                        fr: 'Effacer la conversation',                                   it: 'Cancella conversazione'                                     },
  intro:        { pt: 'Como posso ajudar?',                                        de: 'Wie kann ich helfen?',                                   en: 'How can I help?',                                           fr: 'Comment puis-je aider ?',                                   it: 'Come posso aiutare?'                                        },
  introSub:     { pt: 'Tenho acesso a todos os colaboradores, turnos, pedidos de ausência\ne a escala do mês atual.', de: 'Ich habe Zugang zu allen Mitarbeitern, Schichten, Abwesenheitsanträgen\nund dem aktuellen Dienstplan.', en: 'I have access to all employees, shifts, absence requests\nand the current month\'s schedule.', fr: 'J\'ai accès à tous les collaborateurs, postes, demandes d\'absence\net le planning du mois en cours.', it: 'Ho accesso a tutti i collaboratori, turni, richieste di assenza\ne al turno del mese corrente.' },
  thinking:     { pt: 'A pensar…',                                                 de: 'Denkt nach…',                                           en: 'Thinking…',                                                 fr: 'En train de réfléchir…',                                    it: 'Sto pensando…'                                              },
  placeholder:  { pt: 'Escreve a tua pergunta… (Enter para enviar)',               de: 'Frage eingeben… (Enter zum Senden)',                     en: 'Type your question… (Enter to send)',                        fr: 'Écris ta question… (Entrée pour envoyer)',                   it: 'Scrivi la tua domanda… (Invio per inviare)'                 },
  shift:        { pt: 'Shift+Enter para nova linha',                               de: 'Shift+Enter für neue Zeile',                            en: 'Shift+Enter for new line',                                  fr: 'Shift+Entrée pour nouvelle ligne',                          it: 'Shift+Invio per nuova riga'                                 },
  errContact:   { pt: 'Ocorreu um erro ao contactar o assistente. Tenta novamente.', de: 'Fehler beim Kontaktieren des Assistenten. Erneut versuchen.', en: 'An error occurred contacting the assistant. Please try again.', fr: 'Une erreur s\'est produite. Réessayez.', it: 'Si è verificato un errore. Riprova.' },
  errConnect:   { pt: 'Não foi possível conectar ao assistente.',                  de: 'Verbindung zum Assistenten fehlgeschlagen.',             en: 'Could not connect to the assistant.',                        fr: 'Impossible de se connecter à l\'assistant.',                it: 'Impossibile connettersi all\'assistente.'                   },
  actionsTitle: { pt: 'Alterações propostas',                                      de: 'Vorgeschlagene Änderungen',                             en: 'Proposed changes',                                          fr: 'Modifications proposées',                                   it: 'Modifiche proposte'                                        },
  actionsApply: { pt: 'Aplicar',                                                   de: 'Anwenden',                                              en: 'Apply',                                                     fr: 'Appliquer',                                                 it: 'Applica'                                                   },
  actionsCancel:{ pt: 'Cancelar',                                                  de: 'Abbrechen',                                             en: 'Cancel',                                                    fr: 'Annuler',                                                   it: 'Annulla'                                                   },
  actionsOk:    { pt: 'Alterações aplicadas com sucesso.',                         de: 'Änderungen erfolgreich angewendet.',                    en: 'Changes applied successfully.',                             fr: 'Modifications appliquées avec succès.',                     it: 'Modifiche applicate con successo.'                         },
  actionsErr:   { pt: 'Erro ao aplicar as alterações. Tenta novamente.',           de: 'Fehler beim Anwenden. Erneut versuchen.',               en: 'Error applying changes. Please try again.',                 fr: 'Erreur lors de l\'application. Réessayez.',                 it: 'Errore nell\'applicazione. Riprova.'                       },
  actionUpsert: { pt: 'Atribuir',                                                  de: 'Zuweisen',                                              en: 'Assign',                                                    fr: 'Attribuer',                                                 it: 'Assegna'                                                   },
  actionRemove: { pt: 'Remover',                                                   de: 'Entfernen',                                             en: 'Remove',                                                    fr: 'Supprimer',                                                 it: 'Rimuovi'                                                   },
  actionsDone:  { pt: 'Aplicado',                                                  de: 'Angewendet',                                            en: 'Applied',                                                   fr: 'Appliqué',                                                  it: 'Applicato'                                                 },
}

function formatActionDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function ActionCard({
  actions,
  applied,
  cancelled,
  lang,
  onApply,
  onCancel,
}: {
  actions: Action[]
  applied?: boolean
  cancelled?: boolean
  lang: Lang
  onApply: () => void
  onCancel: () => void
}) {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  if (cancelled) return null

  async function handleApply() {
    setApplying(true)
    setError('')
    try {
      const res = await fetch('/api/chat/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions }),
      })
      if (res.ok) {
        onApply()
      } else {
        setError(T.actionsErr[lang])
      }
    } catch {
      setError(T.actionsErr[lang])
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{
      border: `1.5px solid ${applied ? '#16a34a' : '#C8D8E2'}`,
      borderRadius: 10,
      background: applied ? '#f0fdf4' : '#FAFCFD',
      overflow: 'hidden',
      fontSize: '0.8rem',
    }}>
      {/* Header */}
      <div style={{
        padding: '7px 12px',
        background: applied ? '#16a34a' : '#EEF3F6',
        borderBottom: applied ? 'none' : '1px solid #D8E2E8',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {applied
          ? <CheckCircle2 size={13} color="#fff" />
          : <Sparkles size={13} color="#003A5D" strokeWidth={1.8} />
        }
        <span style={{ fontWeight: 700, color: applied ? '#fff' : '#003A5D', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>
          {applied ? T.actionsDone[lang] : T.actionsTitle[lang]}
        </span>
      </div>

      {!applied && (
        <>
          {/* Actions list */}
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {actions.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#001E30' }}>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: a.type === 'UPSERT' ? '#dcfce7' : '#fee2e2',
                  color: a.type === 'UPSERT' ? '#15803d' : '#dc2626',
                  flexShrink: 0,
                }}>
                  {a.type === 'UPSERT' ? T.actionUpsert[lang] : T.actionRemove[lang]}
                </span>
                <span style={{ fontWeight: 700, color: '#003A5D' }}>{a.shiftCode}</span>
                <span style={{ color: '#7A9BAD' }}>→</span>
                <span>{a.employeeName}</span>
                <span style={{ color: '#7A9BAD', marginLeft: 'auto', flexShrink: 0 }}>{formatActionDate(a.date)}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '2px 12px 6px', color: '#dc2626', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <XCircle size={11} />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: 7, borderTop: '1px solid #E0E8EE' }}>
            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 7,
                border: 'none',
                background: applying ? '#86efac' : '#16a34a',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: applying ? 'default' : 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
                transition: 'background 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              {applying
                ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> …</>
                : <><CheckCircle2 size={12} /> {T.actionsApply[lang]}</>
              }
            </button>
            <button
              onClick={onCancel}
              disabled={applying}
              style={{
                padding: '7px 12px',
                borderRadius: 7,
                border: '1.5px solid #D8E2E8',
                background: 'transparent',
                color: '#7A9BAD',
                fontSize: '0.78rem',
                cursor: applying ? 'default' : 'pointer',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {T.actionsCancel[lang]}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MessageBubble({
  msg,
  lang,
  onApply,
  onCancel,
}: {
  msg: Message
  lang: Lang
  onApply?: () => void
  onCancel?: () => void
}) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', gap: 12, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: isUser ? '#003A5D' : '#E8F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        {isUser ? <User size={15} color="#fff" /> : <Bot size={15} color="#003A5D" />}
      </div>
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ padding: '10px 14px', borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: isUser ? '#003A5D' : '#fff', color: isUser ? '#fff' : '#001E30', fontSize: '0.875rem', lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif", boxShadow: '0 1px 3px rgba(0,0,0,0.06)', whiteSpace: 'pre-wrap', border: isUser ? 'none' : '1px solid #E0E8EE' }}>
          {msg.content}
        </div>
        {!isUser && msg.actions && msg.actions.length > 0 && onApply && onCancel && (
          <ActionCard
            actions={msg.actions}
            applied={msg.actionsApplied}
            cancelled={msg.actionsCancelled}
            lang={lang}
            onApply={onApply}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const STORAGE_KEY = 'manager_chat_history'

  const [lang] = useLang()
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? (JSON.parse(saved) as Message[]) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)) } catch { /* quota */ }
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)

    try {
      const now = new Date()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          team: '2.OG',
          lang,
        }),
      })

      const data = await res.json() as { reply?: string; actions?: Action[]; error?: string }

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: T.errContact[lang] }])
      } else {
        const plain = (data.reply ?? '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/^#{1,6}\s+/gm, '')
        const assistantMsg: Message = { role: 'assistant', content: plain }
        if (data.actions && data.actions.length > 0) {
          assistantMsg.actions = data.actions
        }
        setMessages(prev => [...prev, assistantMsg])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: T.errConnect[lang] }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F6F8', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#003A5D', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Sparkles size={20} color="#7BBFE0" strokeWidth={1.8} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {T.title[lang]}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6AA3BF', marginTop: 1 }}>
            {T.subtitle[lang]}
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY) }}
            title={T.clearTitle[lang]}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
          >
            <Trash2 size={13} />
            {T.clear[lang]}
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isEmpty ? (
          <div style={{ margin: 'auto', width: '100%', maxWidth: 560 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#003A5D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Bot size={26} color="#fff" />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#001E30', marginBottom: 6 }}>
                {T.intro[lang]}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#7A9BAD', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {T.introSub[lang]}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTIONS[lang].map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{ padding: '8px 14px', borderRadius: 20, background: '#fff', border: '1px solid #D8E2E8', color: '#003A5D', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#003A5D'; (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#003A5D' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#003A5D'; (e.currentTarget as HTMLElement).style.borderColor = '#D8E2E8' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              lang={lang}
              onApply={() => {
                setMessages(prev => {
                  const updated = prev.map((m, idx) =>
                    idx === i ? { ...m, actionsApplied: true } : m
                  )
                  return [...updated, { role: 'assistant' as const, content: T.actionsOk[lang] }]
                })
              }}
              onCancel={() => {
                setMessages(prev =>
                  prev.map((m, idx) =>
                    idx === i ? { ...m, actionsCancelled: true } : m
                  )
                )
              }}
            />
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={15} color="#003A5D" />
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: '#fff', border: '1px solid #E0E8EE', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} color="#7A9BAD" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.82rem', color: '#7A9BAD' }}>{T.thinking[lang]}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '16px 28px 20px', background: '#fff', borderTop: '1px solid #D8E2E8', flexShrink: 0 }}>
        <div
          style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#F4F6F8', border: '1.5px solid #D8E2E8', borderRadius: 12, padding: '10px 12px 10px 16px', transition: 'border-color 0.15s' }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = '#003A5D')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = '#D8E2E8')}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={T.placeholder[lang]}
            disabled={loading}
            rows={1}
            style={{ flex: 1, resize: 'none', border: 'none', background: 'transparent', outline: 'none', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.875rem', color: '#001E30', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}
            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{ width: 34, height: 34, borderRadius: 8, background: loading || !input.trim() ? '#D8E2E8' : '#003A5D', border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
          >
            <Send size={15} color="#fff" />
          </button>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#B0C4CE', marginTop: 6, textAlign: 'center' }}>
          {T.shift[lang]}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
