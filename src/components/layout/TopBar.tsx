'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Zap, CheckCircle, AlertCircle, Trash2, X, Send, TriangleAlert, Users, Phone } from 'lucide-react'
import { formatMonthYear, addMonths } from '@/lib/date-utils'
import { useLang } from '@/hooks/useLang'

interface Props {
  year: number
  month: number
  team: string
  scheduleStatus: string
  scheduleId: string
  onMonthChange: (year: number, month: number) => void
  onGenerate: (instructions?: string) => void
  onClear: () => void
  onPublish: () => Promise<void>
  isGenerating: boolean
  generateResult: { status: string; count?: number; parsedConstraints?: number } | null
  hideMonthNav?: boolean
  violationCount?: number
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#F1F5F9', color: '#64748B' },
  GENERATED: { bg: '#E6EEF3', color: '#9B7353' },
  PUBLISHED: { bg: '#DCFCE7', color: '#16A34A' },
  LOCKED:    { bg: '#FEF3C7', color: '#D97706' },
}

import type { Lang } from '@/hooks/useLang'

const STATUS_LABELS: Record<string, Record<Lang, string>> = {
  DRAFT:     { pt: 'Rascunho',  de: 'Entwurf',        en: 'Draft',      fr: 'Brouillon',    it: 'Bozza'        },
  GENERATED: { pt: 'Gerado',    de: 'Generiert',      en: 'Generated',  fr: 'Généré',       it: 'Generato'     },
  PUBLISHED: { pt: 'Publicado', de: 'Veröffentlicht', en: 'Published',  fr: 'Publié',       it: 'Pubblicato'   },
  LOCKED:    { pt: 'Bloqueado', de: 'Gesperrt',       en: 'Locked',     fr: 'Verrouillé',   it: 'Bloccato'     },
}

const TX: Record<Lang, {
  delete: string; publish: string; publishing: string; published: string;
  generate: string; generating: string; shiftsGenerated: string; instructionsApplied: string;
  noInstructions: string; genError: string; infeasible: string;
  modalTitle: string; instructionsLabel: string; aiNote: string;
  cancel: string; generate2: string; clearTitle: string; clearBody: string;
  clearing: string; deleteBtn: string; disabledTitle: string; placeholder: string;
  publishWarningTitle: string; publishWarningBody: (n: number) => string; publishAnyway: string;
}> = {
  pt: {
    delete: 'Apagar', publish: 'Publicar', publishing: 'A publicar...', published: 'Publicado',
    generate: 'Gerar Escala', generating: 'A gerar...',
    shiftsGenerated: 'turnos gerados', instructionsApplied: 'instruções aplicadas',
    noInstructions: 'sem instruções', genError: 'Erro na geração', infeasible: 'Restrições impossíveis',
    modalTitle: 'Gerar Escala', instructionsLabel: 'Notas / Instruções adicionais (opcional)',
    aiNote: 'A AI interpreta as instruções automaticamente — não precisas de usar uma sintaxe específica.',
    cancel: 'Cancelar', generate2: 'Gerar',
    clearTitle: 'Apagar escala gerada?',
    clearBody: 'Todos os turnos gerados automaticamente serão removidos. Os turnos inseridos manualmente são mantidos. O estado volta a Rascunho.',
    clearing: 'A apagar...', deleteBtn: 'Apagar',
    disabledTitle: 'Apaga a escala antes de regenerar',
    placeholder: 'Ex: "O Ricardo não trabalha este mês"\n"A Ana faz só turno F"\n"Máximo 2 fins de semana para o João"',
    publishWarningTitle: 'Publicar com erros?',
    publishWarningBody: (n: number) => `Esta escala tem ${n} ${n === 1 ? 'problema' : 'problemas'} de composição de turnos (ex: turnos F incompletos, turno S sem FAGE). Os colaboradores verão uma escala com erros.`,
    publishAnyway: 'Publicar mesmo assim',
  },
  de: {
    delete: 'Löschen', publish: 'Veröffentlichen', publishing: 'Wird veröffentlicht...', published: 'Veröffentlicht',
    generate: 'Dienstplan generieren', generating: 'Wird generiert...',
    shiftsGenerated: 'Schichten generiert', instructionsApplied: 'Anweisungen angewendet',
    noInstructions: 'keine Anweisungen', genError: 'Generierungsfehler', infeasible: 'Unmögliche Einschränkungen',
    modalTitle: 'Dienstplan generieren', instructionsLabel: 'Notizen / Zusätzliche Anweisungen (optional)',
    aiNote: 'Die KI interpretiert die Anweisungen automatisch — keine spezifische Syntax erforderlich.',
    cancel: 'Abbrechen', generate2: 'Generieren',
    clearTitle: 'Generierten Dienstplan löschen?',
    clearBody: 'Alle automatisch generierten Schichten werden entfernt. Manuell eingetragene Schichten bleiben erhalten. Der Status wird auf Entwurf zurückgesetzt.',
    clearing: 'Wird gelöscht...', deleteBtn: 'Löschen',
    disabledTitle: 'Dienstplan erst löschen, bevor neu generiert wird',
    placeholder: 'z.B. "Ricardo arbeitet diesen Monat nicht"\n"Ana macht nur Schicht F"\n"Maximal 2 Wochenenden für João"',
    publishWarningTitle: 'Mit Fehlern veröffentlichen?',
    publishWarningBody: (n: number) => `Dieser Dienstplan hat ${n} ${n === 1 ? 'Problem' : 'Probleme'} bei der Schichtzusammensetzung. Die Mitarbeiter sehen einen Dienstplan mit Fehlern.`,
    publishAnyway: 'Trotzdem veröffentlichen',
  },
  en: {
    delete: 'Delete', publish: 'Publish', publishing: 'Publishing...', published: 'Published',
    generate: 'Generate Schedule', generating: 'Generating...',
    shiftsGenerated: 'shifts generated', instructionsApplied: 'instructions applied',
    noInstructions: 'no instructions', genError: 'Generation error', infeasible: 'Impossible constraints',
    modalTitle: 'Generate Schedule', instructionsLabel: 'Notes / Additional instructions (optional)',
    aiNote: 'AI interprets instructions automatically — no specific syntax required.',
    cancel: 'Cancel', generate2: 'Generate',
    clearTitle: 'Delete generated schedule?',
    clearBody: 'All automatically generated shifts will be removed. Manually entered shifts are kept. Status returns to Draft.',
    clearing: 'Deleting...', deleteBtn: 'Delete',
    disabledTitle: 'Delete the schedule before regenerating',
    placeholder: 'e.g. "Ricardo does not work this month"\n"Ana only does shift F"\n"Max 2 weekends for João"',
    publishWarningTitle: 'Publish with errors?',
    publishWarningBody: (n: number) => `This schedule has ${n} shift composition ${n === 1 ? 'issue' : 'issues'} (e.g. incomplete F shifts, S shift without FAGE). Employees will see a schedule with errors.`,
    publishAnyway: 'Publish anyway',
  },
  fr: {
    delete: 'Supprimer', publish: 'Publier', publishing: 'Publication en cours...', published: 'Publié',
    generate: 'Générer le planning', generating: 'Génération en cours...',
    shiftsGenerated: 'postes générés', instructionsApplied: 'instructions appliquées',
    noInstructions: 'sans instructions', genError: 'Erreur de génération', infeasible: 'Contraintes impossibles',
    modalTitle: 'Générer le planning', instructionsLabel: 'Notes / Instructions supplémentaires (facultatif)',
    aiNote: "L'IA interprète les instructions automatiquement — aucune syntaxe spécifique requise.",
    cancel: 'Annuler', generate2: 'Générer',
    clearTitle: 'Supprimer le planning généré ?',
    clearBody: 'Tous les postes générés automatiquement seront supprimés. Les postes saisis manuellement sont conservés. Le statut revient à Brouillon.',
    clearing: 'Suppression...', deleteBtn: 'Supprimer',
    disabledTitle: 'Supprimez le planning avant de régénérer',
    placeholder: 'Ex : "Ricardo ne travaille pas ce mois-ci"\n"Ana fait uniquement le poste F"\n"Maximum 2 week-ends pour João"',
    publishWarningTitle: 'Publier avec des erreurs ?',
    publishWarningBody: (n: number) => `Ce planning a ${n} ${n === 1 ? 'problème' : 'problèmes'} de composition de postes. Les collaborateurs verront un planning avec des erreurs.`,
    publishAnyway: 'Publier quand même',
  },
  it: {
    delete: 'Elimina', publish: 'Pubblica', publishing: 'Pubblicazione in corso...', published: 'Pubblicato',
    generate: 'Genera turni', generating: 'Generazione in corso...',
    shiftsGenerated: 'turni generati', instructionsApplied: 'istruzioni applicate',
    noInstructions: 'senza istruzioni', genError: 'Errore di generazione', infeasible: 'Vincoli impossibili',
    modalTitle: 'Genera turni', instructionsLabel: 'Note / Istruzioni aggiuntive (opzionale)',
    aiNote: "L'IA interpreta le istruzioni automaticamente — nessuna sintassi specifica richiesta.",
    cancel: 'Annulla', generate2: 'Genera',
    clearTitle: 'Eliminare i turni generati?',
    clearBody: 'Tutti i turni generati automaticamente saranno rimossi. I turni inseriti manualmente vengono conservati. Lo stato torna a Bozza.',
    clearing: 'Eliminazione...', deleteBtn: 'Elimina',
    disabledTitle: 'Elimina i turni prima di rigenerare',
    placeholder: 'Es: "Ricardo non lavora questo mese"\n"Ana fa solo il turno F"\n"Massimo 2 weekend per João"',
    publishWarningTitle: 'Pubblicare con errori?',
    publishWarningBody: (n: number) => `Questo piano ha ${n} ${n === 1 ? 'problema' : 'problemi'} di composizione turni. I collaboratori vedranno un piano con errori.`,
    publishAnyway: 'Pubblica comunque',
  },
}

export default function TopBar({
  year, month, team, scheduleStatus, onMonthChange, onGenerate, onClear, onPublish, isGenerating, generateResult,
  hideMonthNav = false, violationCount = 0,
}: Props) {
  const [lang] = useLang()
  const tx = TX[lang] ?? TX.pt
  const prev = addMonths(year, month, -1)
  const next = addMonths(year, month, 1)
  const [showModal, setShowModal] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [showOtherFloors, setShowOtherFloors] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [isClearing, setIsClearing] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  function openGenerateModal() {
    setInstructions('')
    setShowModal(true)
  }

  function handleGenerate() {
    onGenerate(instructions.trim() || undefined)
    setShowModal(false)
  }

  async function handleClear() {
    setIsClearing(true)
    try {
      await onClear()
    } finally {
      setIsClearing(false)
      setShowClearConfirm(false)
    }
  }

  const statusStyle = STATUS_STYLES[scheduleStatus] ?? STATUS_STYLES.DRAFT
  const hasGenerated = scheduleStatus === 'GENERATED' || scheduleStatus === 'PUBLISHED'
  const isPublished = scheduleStatus === 'PUBLISHED'

  function handlePublishClick() {
    if (violationCount > 0) {
      setShowPublishConfirm(true)
    } else {
      void doPublish()
    }
  }

  async function doPublish() {
    setShowPublishConfirm(false)
    setIsPublishing(true)
    try {
      await onPublish()
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <>
      <header
        className="shrink-0 border-b px-5 py-3 flex items-center gap-3"
        style={{ background: '#fff', borderColor: '#D8E2E8', boxShadow: '0 1px 4px rgba(155,115,83,0.06)' }}
      >
        {/* Month navigation — hidden in week/day view (handled in the bar below) */}
        {!hideMonthNav && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onMonthChange(prev.year, prev.month)}
              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#7A9BAD' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F6F8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronLeft size={17} />
            </button>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#5A3A1A', width: 148, textAlign: 'center', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {formatMonthYear(year, month, 'de-DE')}
            </h1>
            <button
              onClick={() => onMonthChange(next.year, next.month)}
              style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#7A9BAD' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F6F8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        )}

        {/* Team badge */}
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#7A9BAD', background: '#F4F6F8', padding: '3px 10px', borderRadius: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
          {team}
        </span>

        {/* Status badge */}
        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {(STATUS_LABELS[scheduleStatus]?.[lang] ?? STATUS_LABELS[scheduleStatus]?.pt ?? scheduleStatus)}
        </span>

        <div className="flex-1" />

        {/* Generate result */}
        {generateResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: generateResult.status === 'ERROR' ? '#DC2626' : '#16A34A' }}>
            {generateResult.status === 'ERROR'
              ? <AlertCircle size={14} />
              : <CheckCircle size={14} />
            }
            {(generateResult.status === 'FEASIBLE' || generateResult.status === 'OPTIMAL') && (
              <>
                {generateResult.count} {tx.shiftsGenerated}
                {generateResult.parsedConstraints !== undefined && generateResult.parsedConstraints > 0 && (
                  <span style={{ marginLeft: 6, padding: '1px 7px', background: '#DCFCE7', color: '#15803D', borderRadius: 10, fontSize: '0.7rem' }}>
                    {generateResult.parsedConstraints} {tx.instructionsApplied}
                  </span>
                )}
                {generateResult.parsedConstraints === 0 && (
                  <span style={{ marginLeft: 6, padding: '1px 7px', background: '#FEF9C3', color: '#B45309', borderRadius: 10, fontSize: '0.7rem' }}>
                    {tx.noInstructions}
                  </span>
                )}
              </>
            )}
            {generateResult.status === 'ERROR' && tx.genError}
            {generateResult.status === 'INFEASIBLE' && tx.infeasible}
          </div>
        )}

        {/* Clear button — only when schedule has generated content */}
        {hasGenerated && (
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing}
            title={tx.clearTitle}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
              background: 'transparent', border: '1px solid #FECACA', borderRadius: 8,
              color: '#EF4444', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Trash2 size={14} />
            {tx.delete}
          </button>
        )}

        {/* Publish button — visible when GENERATED but not yet PUBLISHED */}
        {scheduleStatus === 'GENERATED' && (
          <button
            onClick={handlePublishClick}
            disabled={isPublishing}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
              background: isPublishing ? '#86EFAC' : '#16A34A', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", transition: 'background 0.15s',
              opacity: isPublishing ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!isPublishing) (e.currentTarget as HTMLElement).style.background = '#15803D' }}
            onMouseLeave={e => { if (!isPublishing) (e.currentTarget as HTMLElement).style.background = '#16A34A' }}
          >
            {isPublishing ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                {tx.publishing}
              </>
            ) : (
              <>
                <Send size={14} />
                {tx.publish}
              </>
            )}
          </button>
        )}

        {/* Published badge */}
        {isPublished && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: '#DCFCE7', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, color: '#16A34A' }}>
            <span className="published-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block', flexShrink: 0 }} />
            {tx.published}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={openGenerateModal}
          disabled={isGenerating || isPublished}
          title={isPublished ? tx.disabledTitle : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
            background: isGenerating || isPublished ? '#C4A47A' : '#9B7353', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
            cursor: isGenerating || isPublished ? 'not-allowed' : 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", transition: 'background 0.15s',
            opacity: isGenerating ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#7A5A3A' }}
          onMouseLeave={e => { if (!isGenerating) (e.currentTarget as HTMLElement).style.background = '#9B7353' }}
        >
          {isGenerating ? (
            <>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              {tx.generating}
            </>
          ) : (
            <>
              <Zap size={14} />
              {tx.generate}
            </>
          )}
        </button>
      </header>

      {/* Generate modal */}
      {showModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,30,48,0.45)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="anim-scaleIn"
            style={{
              background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
              padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#9B7353', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {tx.modalTitle}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7A9BAD', marginTop: 2 }}>
                  {formatMonthYear(year, month, 'de-DE')} · {team}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#7A9BAD' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Instructions field */}
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#5A3A1A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {tx.instructionsLabel}
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
              placeholder={tx.placeholder}
              rows={4}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none', border: '1.5px solid #D8E2E8',
                borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: '#5A3A1A',
                fontFamily: "'IBM Plex Sans', sans-serif", outline: 'none', lineHeight: 1.6,
                background: '#F4F6F8',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#9B7353')}
              onBlur={e => (e.currentTarget.style.borderColor = '#D8E2E8')}
            />
            <p style={{ fontSize: '0.7rem', color: '#7A9BAD', marginTop: 6 }}>
              {tx.aiNote}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid #D8E2E8',
                  background: 'transparent', color: '#7A9BAD', fontSize: '0.82rem', fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {tx.cancel}
              </button>
              <button
                onClick={handleGenerate}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
                  background: '#9B7353', color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#7A5A3A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#9B7353')}
              >
                <Zap size={14} />
                {tx.generate2}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,30,48,0.45)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowClearConfirm(false) }}
        >
          <div
            className="anim-scaleIn"
            style={{
              background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400,
              padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#5A3A1A', marginBottom: 10 }}>
              {tx.clearTitle}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#7A9BAD', lineHeight: 1.6, marginBottom: 22 }}>
              {tx.clearBody}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1px solid #D8E2E8',
                  background: 'transparent', color: '#7A9BAD', fontSize: '0.82rem', fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {tx.cancel}
              </button>
              <button
                onClick={handleClear}
                disabled={isClearing}
                style={{
                  padding: '9px 18px', background: '#EF4444', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                  cursor: isClearing ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif", opacity: isClearing ? 0.7 : 1,
                }}
              >
                {isClearing ? tx.clearing : tx.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish-with-violations confirmation modal */}
      {showPublishConfirm && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,30,48,0.45)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) { setShowPublishConfirm(false); setShowOtherFloors(false) } }}
        >
          <div
            className="anim-scaleIn"
            style={{
              background: '#fff', borderRadius: 14, width: '100%',
              maxWidth: showOtherFloors ? 680 : 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              fontFamily: "'IBM Plex Sans', sans-serif",
              display: 'flex', transition: 'max-width 0.2s ease',
            }}
          >
            {/* Left panel — warning */}
            <div style={{ flex: 1, padding: 28, minWidth: 0 }}>
              {/* Warning icon + title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, background: '#FEF2F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <TriangleAlert size={22} color="#EF4444" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#5A3A1A', marginBottom: 6 }}>
                    {tx.publishWarningTitle}
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                    {tx.publishWarningBody(violationCount)}
                  </p>
                </div>
              </div>

              {/* Violation count badge */}
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
                padding: '10px 14px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  background: '#EF4444', color: '#fff', borderRadius: 6,
                  fontSize: 12, fontWeight: 800, padding: '2px 8px', flexShrink: 0,
                }}>
                  {violationCount}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#B91C1C', fontWeight: 500 }}>
                  {violationCount === 1 ? 'problema detetado na escala' : 'problemas detetados na escala'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setShowPublishConfirm(false); setShowOtherFloors(false) }}
                  style={{
                    padding: '9px 14px', borderRadius: 8, border: '1px solid #D8E2E8',
                    background: 'transparent', color: '#7A9BAD', fontSize: '0.8rem', fontWeight: 500,
                    cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {tx.cancel}
                </button>
                <button
                  onClick={() => setShowOtherFloors(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                    background: showOtherFloors ? '#EEF4FF' : 'transparent',
                    border: `1px solid ${showOtherFloors ? '#93C5FD' : '#D8E2E8'}`,
                    borderRadius: 8, fontSize: '0.8rem', fontWeight: 500,
                    color: showOtherFloors ? '#1D4ED8' : '#64748B',
                    cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  <Users size={14} />
                  Ver Outros Pisos
                </button>
                <button
                  onClick={doPublish}
                  disabled={isPublishing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
                    background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'IBM Plex Sans', sans-serif", opacity: isPublishing ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!isPublishing) (e.currentTarget as HTMLElement).style.background = '#DC2626' }}
                  onMouseLeave={e => { if (!isPublishing) (e.currentTarget as HTMLElement).style.background = '#EF4444' }}
                >
                  <Send size={14} />
                  {tx.publishAnyway}
                </button>
              </div>
            </div>

            {/* Right panel — other floors */}
            {showOtherFloors && (
              <div style={{
                width: 240, borderLeft: '1px solid #E2E8F0', padding: '24px 20px',
                background: '#F8FAFC', borderRadius: '0 14px 14px 0', flexShrink: 0,
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Disponíveis noutros pisos
                </div>
                {[
                  { name: 'Maria Santos',  role: 'FAGE', floor: '3.OG', shifts: ['F', 'S'], color: '#0EA5E9', bg: '#E0F2FE' },
                  { name: 'Klaus Weber',   role: 'SRK',  floor: '1.OG', shifts: ['F'],      color: '#8B5CF6', bg: '#EDE9FE' },
                  { name: 'Anna Müller',   role: 'HF',   floor: '3.OG', shifts: ['F', 'S'], color: '#10B981', bg: '#D1FAE5' },
                ].map((emp, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
                      padding: '12px 12px', marginBottom: 10,
                      animation: `t-slideUp 0.2s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`,
                    }}
                  >
                    {/* Name + floor */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: 1 }}>{emp.floor}</div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: emp.bg, color: emp.color, letterSpacing: '0.04em',
                      }}>
                        {emp.role}
                      </span>
                    </div>
                    {/* Available shifts */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Turnos:</span>
                      {emp.shifts.map(s => (
                        <span key={s} style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: s === 'F' ? '#DBEAFE' : '#FEF9C3',
                          color: s === 'F' ? '#1E40AF' : '#92400E',
                        }}>{s}</span>
                      ))}
                    </div>
                    {/* Contact button */}
                    <button
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, width: '100%',
                        padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0',
                        background: 'transparent', cursor: 'pointer', fontSize: '0.72rem',
                        fontWeight: 500, color: '#64748B', fontFamily: "'IBM Plex Sans', sans-serif",
                        justifyContent: 'center',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F1F5F9'; (e.currentTarget as HTMLElement).style.color = '#9B7353' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748B' }}
                    >
                      <Phone size={11} />
                      Contactar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
