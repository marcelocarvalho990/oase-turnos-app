'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Quem trabalhou mais fins de semana este mês?',
  'Quais colaboradores têm pedidos pendentes?',
  'Quem tem menos horas trabalhadas em relação ao alvo?',
  'Quantas horas deve trabalhar alguém a 80%?',
  'Quem são os colaboradores FAGE da equipa?',
  'Qual a diferença entre turno F e turno S?',
]

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isUser ? '#003A5D' : '#E8F0F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {isUser
          ? <User size={15} color="#fff" />
          : <Bot size={15} color="#003A5D" />
        }
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '72%',
          padding: '10px 14px',
          borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
          background: isUser ? '#003A5D' : '#fff',
          color: isUser ? '#fff' : '#001E30',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          fontFamily: "'IBM Plex Sans', sans-serif",
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          whiteSpace: 'pre-wrap',
          border: isUser ? 'none' : '1px solid #E0E8EE',
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput('')
    setLoading(true)

    try {
      // Get current year/month for schedule context
      const now = new Date()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages, // send history without the new message (route appends it)
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          team: '2.OG',
        }),
      })

      const data = await res.json() as { reply?: string; error?: string }

      if (!res.ok || data.error) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Ocorreu um erro ao contactar o assistente. Tenta novamente.' },
        ])
      } else {
        // Strip markdown bold/italic asterisks and hashes so output is plain text
        const plain = (data.reply ?? '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/^#{1,6}\s+/gm, '')
        setMessages(prev => [...prev, { role: 'assistant', content: plain }])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Não foi possível conectar ao assistente.' },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#F4F6F8',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#003A5D',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Sparkles size={20} color="#7BBFE0" strokeWidth={1.8} />
        <div>
          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: '1.1rem',
            color: '#fff',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            Assistente AI
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6AA3BF', marginTop: 1 }}>
            Pergunta qualquer coisa sobre a equipa, turnos e escalas
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {isEmpty ? (
          <div style={{ margin: 'auto', width: '100%', maxWidth: 560 }}>
            {/* Intro */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#003A5D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Bot size={26} color="#fff" />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#001E30', marginBottom: 6 }}>
                Como posso ajudar?
              </div>
              <div style={{ fontSize: '0.82rem', color: '#7A9BAD', lineHeight: 1.5 }}>
                Tenho acesso a todos os colaboradores, turnos, pedidos de ausência<br />e a escala do mês atual.
              </div>
            </div>

            {/* Suggestion chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    background: '#fff',
                    border: '1px solid #D8E2E8',
                    color: '#003A5D',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#003A5D'
                    ;(e.currentTarget as HTMLElement).style.color = '#fff'
                    ;(e.currentTarget as HTMLElement).style.borderColor = '#003A5D'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '#fff'
                    ;(e.currentTarget as HTMLElement).style.color = '#003A5D'
                    ;(e.currentTarget as HTMLElement).style.borderColor = '#D8E2E8'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#E8F0F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bot size={15} color="#003A5D" />
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '4px 14px 14px 14px',
                background: '#fff',
                border: '1px solid #E0E8EE',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Loader2 size={14} color="#7A9BAD" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.82rem', color: '#7A9BAD' }}>A pensar…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '16px 28px 20px',
          background: '#fff',
          borderTop: '1px solid #D8E2E8',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            background: '#F4F6F8',
            border: '1.5px solid #D8E2E8',
            borderRadius: 12,
            padding: '10px 12px 10px 16px',
            transition: 'border-color 0.15s',
          }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = '#003A5D')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = '#D8E2E8')}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escreve a tua pergunta… (Enter para enviar)"
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '0.875rem',
              color: '#001E30',
              lineHeight: 1.5,
              maxHeight: 120,
              overflowY: 'auto',
            }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: loading || !input.trim() ? '#D8E2E8' : '#003A5D',
              border: 'none',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            <Send size={15} color="#fff" />
          </button>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#B0C4CE', marginTop: 6, textAlign: 'center' }}>
          Shift+Enter para nova linha
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
