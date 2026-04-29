'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Pencil, Trash2, X, Check, KeyRound } from 'lucide-react'
import { Employee, Role, ROLE_LABELS, ROLE_ORDER } from '@/types'
import { useLang } from '@/hooks/useLang'

import type { Lang } from '@/hooks/useLang'

const TX: Record<Lang, {
  title: string; activeOf: (a: number, t: number) => string;
  showActive: string; showAll: string; newEmp: string;
  colName: string; colShort: string; colPct: string; colTeam: string; colRole: string;
  colMulti: string; colStatus: string; colActions: string; empty: string;
  active: string; inactive: string; editTitle: string; newTitle: string;
  fullName: string; shortName: string; pct: string; team: string; role: string;
  multiTeam: string; activeLabel: string; cancel: string; saving: string; save: string; create: string;
  pinGenerated: string; pinShare: (name: string) => string; close: string;
  tooltipPin: string; tooltipEdit: string; tooltipDel: string;
}> = {
  pt: {
    title: 'Colaboradores', activeOf: (a, t) => `${a} ativos · ${t} total`,
    showActive: 'Mostrar apenas ativos', showAll: 'Mostrar todos', newEmp: 'Novo Colaborador',
    colName: 'Nome', colShort: 'Abrev.', colPct: '%', colTeam: 'Equipa', colRole: 'Função',
    colMulti: 'Multi-Equipa', colStatus: 'Estado', colActions: 'Ações',
    empty: 'Nenhum colaborador encontrado.',
    active: 'Ativo', inactive: 'Inativo',
    editTitle: 'Editar Colaborador', newTitle: 'Novo Colaborador',
    fullName: 'Nome completo', shortName: 'Abreviatura', pct: 'Percentagem',
    team: 'Equipa', role: 'Função',
    multiTeam: 'Pode cobrir outras equipas', activeLabel: 'Ativo',
    cancel: 'Cancelar', saving: 'A guardar…', save: 'Guardar alterações', create: 'Criar colaborador',
    pinGenerated: 'PIN gerado', pinShare: (name) => `Partilha este PIN com ${name}. Só é mostrado uma vez.`,
    close: 'Fechar', tooltipPin: 'Gerar PIN', tooltipEdit: 'Editar', tooltipDel: 'Eliminar',
  },
  de: {
    title: 'Mitarbeiter', activeOf: (a, t) => `${a} aktiv · ${t} gesamt`,
    showActive: 'Nur aktive anzeigen', showAll: 'Alle anzeigen', newEmp: 'Neuer Mitarbeiter',
    colName: 'Name', colShort: 'Abkürz.', colPct: '%', colTeam: 'Team', colRole: 'Funktion',
    colMulti: 'Multi-Team', colStatus: 'Status', colActions: 'Aktionen',
    empty: 'Keine Mitarbeiter gefunden.',
    active: 'Aktiv', inactive: 'Inaktiv',
    editTitle: 'Mitarbeiter bearbeiten', newTitle: 'Neuer Mitarbeiter',
    fullName: 'Vollständiger Name', shortName: 'Abkürzung', pct: 'Prozentsatz',
    team: 'Team', role: 'Funktion',
    multiTeam: 'Kann andere Teams abdecken', activeLabel: 'Aktiv',
    cancel: 'Abbrechen', saving: 'Wird gespeichert…', save: 'Änderungen speichern', create: 'Mitarbeiter erstellen',
    pinGenerated: 'PIN generiert', pinShare: (name) => `Teile diesen PIN mit ${name}. Wird nur einmal angezeigt.`,
    close: 'Schließen', tooltipPin: 'PIN generieren', tooltipEdit: 'Bearbeiten', tooltipDel: 'Löschen',
  },
  en: {
    title: 'Staff', activeOf: (a, t) => `${a} active · ${t} total`,
    showActive: 'Show active only', showAll: 'Show all', newEmp: 'New Employee',
    colName: 'Name', colShort: 'Short', colPct: '%', colTeam: 'Team', colRole: 'Role',
    colMulti: 'Multi-Team', colStatus: 'Status', colActions: 'Actions',
    empty: 'No employees found.',
    active: 'Active', inactive: 'Inactive',
    editTitle: 'Edit Employee', newTitle: 'New Employee',
    fullName: 'Full name', shortName: 'Abbreviation', pct: 'Percentage',
    team: 'Team', role: 'Role',
    multiTeam: 'Can cover other teams', activeLabel: 'Active',
    cancel: 'Cancel', saving: 'Saving…', save: 'Save changes', create: 'Create employee',
    pinGenerated: 'PIN generated', pinShare: (name) => `Share this PIN with ${name}. Only shown once.`,
    close: 'Close', tooltipPin: 'Generate PIN', tooltipEdit: 'Edit', tooltipDel: 'Delete',
  },
  fr: {
    title: 'Collaborateurs', activeOf: (a, t) => `${a} actifs · ${t} total`,
    showActive: 'Afficher les actifs seulement', showAll: 'Afficher tous', newEmp: 'Nouveau collaborateur',
    colName: 'Nom', colShort: 'Abrév.', colPct: '%', colTeam: 'Équipe', colRole: 'Rôle',
    colMulti: 'Multi-équipe', colStatus: 'Statut', colActions: 'Actions',
    empty: 'Aucun collaborateur trouvé.',
    active: 'Actif', inactive: 'Inactif',
    editTitle: 'Modifier le collaborateur', newTitle: 'Nouveau collaborateur',
    fullName: 'Nom complet', shortName: 'Abréviation', pct: 'Pourcentage',
    team: 'Équipe', role: 'Rôle',
    multiTeam: 'Peut couvrir d\'autres équipes', activeLabel: 'Actif',
    cancel: 'Annuler', saving: 'Enregistrement…', save: 'Enregistrer les modifications', create: 'Créer le collaborateur',
    pinGenerated: 'NIP généré', pinShare: (name) => `Partage ce NIP avec ${name}. Affiché une seule fois.`,
    close: 'Fermer', tooltipPin: 'Générer NIP', tooltipEdit: 'Modifier', tooltipDel: 'Supprimer',
  },
  it: {
    title: 'Collaboratori', activeOf: (a, t) => `${a} attivi · ${t} totale`,
    showActive: 'Mostra solo attivi', showAll: 'Mostra tutti', newEmp: 'Nuovo collaboratore',
    colName: 'Nome', colShort: 'Abbrev.', colPct: '%', colTeam: 'Team', colRole: 'Ruolo',
    colMulti: 'Multi-team', colStatus: 'Stato', colActions: 'Azioni',
    empty: 'Nessun collaboratore trovato.',
    active: 'Attivo', inactive: 'Inattivo',
    editTitle: 'Modifica collaboratore', newTitle: 'Nuovo collaboratore',
    fullName: 'Nome completo', shortName: 'Abbreviazione', pct: 'Percentuale',
    team: 'Team', role: 'Ruolo',
    multiTeam: 'Può coprire altri team', activeLabel: 'Attivo',
    cancel: 'Annulla', saving: 'Salvataggio…', save: 'Salva modifiche', create: 'Crea collaboratore',
    pinGenerated: 'PIN generato', pinShare: (name) => `Condividi questo PIN con ${name}. Mostrato solo una volta.`,
    close: 'Chiudi', tooltipPin: 'Genera PIN', tooltipEdit: 'Modifica', tooltipDel: 'Elimina',
  },
}

interface Props {
  employees: Employee[]
}

const ROLE_BADGE: Record<Role, string> = {
  TEAMLEITUNG: 'bg-[#E6EEF3] text-[#9B7353] border border-[#C5D9E3]',
  FUNKTIONSSTUFE_3: 'bg-purple-100 text-purple-800 border border-purple-200',
  FUNKTIONSSTUFE_2: 'bg-green-100 text-green-800 border border-green-200',
  FUNKTIONSSTUFE_1: 'bg-amber-100 text-amber-800 border border-amber-200',
  LERNENDE: 'bg-slate-100 text-slate-700 border border-slate-200',
}

const ROLE_AVATAR_COLOR: Record<Role, { bg: string; color: string }> = {
  TEAMLEITUNG:     { bg: '#9B7353', color: '#fff' },
  FUNKTIONSSTUFE_3:{ bg: '#7C3AED', color: '#fff' },
  FUNKTIONSSTUFE_2:{ bg: '#059669', color: '#fff' },
  FUNKTIONSSTUFE_1:{ bg: '#D97706', color: '#fff' },
  LERNENDE:        { bg: '#64748B', color: '#fff' },
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const PERCENTAGE_OPTIONS = [60, 70, 80, 90, 100]

interface FormState {
  name: string
  shortName: string
  workPercentage: number
  team: string
  role: Role
  canCoverOtherTeams: boolean
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  shortName: '',
  workPercentage: 100,
  team: '2.OG',
  role: 'FUNKTIONSSTUFE_1',
  canCoverOtherTeams: false,
  isActive: true,
}

export default function StaffPageClient({ employees: initialEmployees }: Props) {
  const router = useRouter()
  const [lang] = useLang()
  const t = TX[lang]
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [showAll, setShowAll] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pinResult, setPinResult] = useState<{ empName: string; pin: string } | null>(null)
  const [generatingPinFor, setGeneratingPinFor] = useState<string | null>(null)

  const displayed = showAll
    ? employees
    : employees.filter((e) => e.isActive)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(emp: Employee) {
    setForm({
      name: emp.name,
      shortName: emp.shortName,
      workPercentage: emp.workPercentage,
      team: emp.team,
      role: emp.role,
      canCoverOtherTeams: emp.canCoverOtherTeams,
      isActive: emp.isActive,
    })
    setEditingId(emp.id)
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url = editingId ? `/api/staff/${editingId}` : '/api/staff'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao guardar colaborador')
      }
      const saved: Employee = await res.json()
      if (editingId) {
        setEmployees((prev) => prev.map((e) => (e.id === editingId ? saved : e)))
      } else {
        setEmployees((prev) => [...prev, saved])
      }
      closeModal()
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Eliminar "${emp.name}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(emp.id)
    try {
      const res = await fetch(`/api/staff/${emp.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao eliminar')
      }
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id))
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao eliminar colaborador')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleGeneratePin(emp: Employee) {
    setGeneratingPinFor(emp.id)
    try {
      const res = await fetch(`/api/staff/${emp.id}/pin`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao gerar PIN')
      const data = await res.json()
      setPinResult({ empName: emp.name, pin: data.pin })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar PIN')
    } finally {
      setGeneratingPinFor(null)
    }
  }

  const activeCount = employees.filter((e) => e.isActive).length

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#9B7353] flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{t.activeOf(activeCount, employees.length)}</p>
            </div>
            <span className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E6EEF3] text-[#9B7353] text-xs font-bold">
              {activeCount}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
            >
              {showAll ? t.showActive : t.showAll}
            </button>
            <button
              onClick={openCreate}
              className="bg-[#9B7353] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#7A5A3A] flex items-center gap-2"
            >
              <Plus size={16} />
              {t.newEmp}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colName}</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colShort}</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colPct}</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colTeam}</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colRole}</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colMulti}</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colStatus}</th>
                <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Users size={22} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">{t.empty}</p>
                    </div>
                  </td>
                </tr>
              )}
              {displayed.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: ROLE_AVATAR_COLOR[emp.role].bg, color: ROLE_AVATAR_COLOR[emp.role].color }}
                      >
                        {getInitials(emp.name)}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {emp.shortName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-700">{emp.workPercentage}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{emp.team}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[emp.role]}`}>
                      {ROLE_LABELS[emp.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {emp.canCoverOtherTeams ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                        <Check size={11} className="text-green-600" />
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      emp.isActive
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {emp.isActive ? t.active : t.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleGeneratePin(emp)}
                        disabled={generatingPinFor === emp.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                        title={t.tooltipPin}
                      >
                        <KeyRound size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#9B7353] hover:bg-[#F0F5F8] transition-colors"
                        title={t.tooltipEdit}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(emp)}
                        disabled={deletingId === emp.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title={t.tooltipDel}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                {editingId ? t.editTitle : t.newTitle}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.fullName}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B7353]"
                    placeholder="Maria Silva"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.shortName}</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={form.shortName}
                    onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B7353] font-mono"
                    placeholder="MSil"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.pct}</label>
                  <select
                    value={form.workPercentage}
                    onChange={(e) => setForm((f) => ({ ...f, workPercentage: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B7353]"
                  >
                    {PERCENTAGE_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}%</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.team}</label>
                  <input
                    type="text"
                    required
                    value={form.team}
                    onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B7353]"
                    placeholder="2.OG"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.role}</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B7353]"
                  >
                    {ROLE_ORDER.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.canCoverOtherTeams}
                    onChange={(e) => setForm((f) => ({ ...f, canCoverOtherTeams: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#9B7353] focus:ring-[#9B7353]"
                  />
                  <span className="text-sm text-slate-700">{t.multiTeam}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#9B7353] focus:ring-[#9B7353]"
                  />
                  <span className="text-sm text-slate-700">{t.activeLabel}</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#9B7353] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#7A5A3A] disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.saving}
                    </>
                  ) : editingId ? t.save : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN result modal */}
      {pinResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <KeyRound size={20} className="text-amber-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">{t.pinGenerated}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {t.pinShare(pinResult.empName)}
            </p>
            <div className="bg-slate-900 text-white rounded-xl px-6 py-4 text-3xl font-mono font-bold tracking-widest mb-4">
              {pinResult.pin}
            </div>
            <button
              onClick={() => setPinResult(null)}
              className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
