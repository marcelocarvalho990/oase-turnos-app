'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { useLang } from '@/hooks/useLang'

const TEAM = '2.OG'

const DX = {
  pt: {
    title: 'Definições', team: 'Equipa', refresh: 'Atualizar',
    loading: 'A carregar definições…',
    teamSettings: 'Configurações da equipa',
    baseHoursLabel: 'Horas mensais base (100%)',
    baseHoursDesc: 'Usado para calcular o objetivo de horas de cada colaborador. Por defeito: 160h.',
    hoursUnit: 'horas / mês',
    saving: 'A guardar…', save: 'Guardar',
    lastSaved: 'Último valor guardado:',
    vacTitle: 'Dias de férias por colaborador',
    vacDesc: 'Direito anual base (100%). Usado no cálculo de férias proporcionais.',
    noEmployees: 'Nenhum colaborador ativo encontrado.',
    colEmployee: 'Colaborador', colTime: 'Tempo', colVacDays: 'Dias férias',
    successSettings: 'Definições guardadas com sucesso.',
    successVac: 'Dias de férias atualizados.',
    errSettings: 'Erro ao guardar definições',
    errVac: 'Erro ao guardar dias de férias',
    errLoad: 'Erro ao carregar definições',
    errStaff: 'Erro ao carregar colaboradores',
  },
  de: {
    title: 'Einstellungen', team: 'Team', refresh: 'Aktualisieren',
    loading: 'Einstellungen werden geladen…',
    teamSettings: 'Teameinstellungen',
    baseHoursLabel: 'Basis-Monatsstunden (100%)',
    baseHoursDesc: 'Zur Berechnung des Stundenziels jedes Mitarbeiters. Standardwert: 160h.',
    hoursUnit: 'Stunden / Monat',
    saving: 'Wird gespeichert…', save: 'Speichern',
    lastSaved: 'Zuletzt gespeicherter Wert:',
    vacTitle: 'Urlaubstage pro Mitarbeiter',
    vacDesc: 'Jährlicher Grundanspruch (100%). Für die Berechnung anteiliger Urlaubstage verwendet.',
    noEmployees: 'Keine aktiven Mitarbeiter gefunden.',
    colEmployee: 'Mitarbeiter', colTime: 'Zeit', colVacDays: 'Urlaubstage',
    successSettings: 'Einstellungen erfolgreich gespeichert.',
    successVac: 'Urlaubstage aktualisiert.',
    errSettings: 'Fehler beim Speichern der Einstellungen',
    errVac: 'Fehler beim Speichern der Urlaubstage',
    errLoad: 'Fehler beim Laden der Einstellungen',
    errStaff: 'Fehler beim Laden der Mitarbeiter',
  },
}

interface TeamSettings {
  id: string
  team: string
  baseMonthlyHours: number
}

interface EmployeeVacation {
  id: string
  name: string
  shortName: string
  workPercentage: number
  vacationDays: number
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <span className="w-8 h-8 border-4 border-[#C5D9E3] border-t-[#003A5D] rounded-full animate-spin" />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}

export default function DefinicoesPage() {
  const [lang] = useLang()
  const dx = DX[lang]
  const [settings, setSettings] = useState<TeamSettings | null>(null)
  const [employees, setEmployees] = useState<EmployeeVacation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingEmpId, setSavingEmpId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Local editable state
  const [baseHours, setBaseHours] = useState<string>('160')
  const [empVacDays, setEmpVacDays] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [settingsRes, staffRes] = await Promise.all([
        fetch(`/api/manager/settings?team=${encodeURIComponent(TEAM)}`),
        fetch(`/api/staff?team=${encodeURIComponent(TEAM)}`),
      ])
      if (!settingsRes.ok) throw new Error(dx.errLoad)
      if (!staffRes.ok) throw new Error(dx.errStaff)

      const settingsData: TeamSettings = await settingsRes.json()
      const staffData: EmployeeVacation[] = await staffRes.json()

      setSettings(settingsData)
      setBaseHours(String(settingsData.baseMonthlyHours))

      const activeStaff = staffData.filter((e: EmployeeVacation) => (e as EmployeeVacation & { isActive?: boolean }).isActive !== false)
      setEmployees(activeStaff)

      const vacMap: Record<string, string> = {}
      for (const emp of activeStaff) {
        vacMap[emp.id] = String(emp.vacationDays ?? 25)
      }
      setEmpVacDays(vacMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveSettings() {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/manager/settings?team=${encodeURIComponent(TEAM)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseMonthlyHours: Number(baseHours) }),
      })
      if (!res.ok) throw new Error(dx.errSettings)
      const updated: TeamSettings = await res.json()
      setSettings(updated)
      setSuccessMsg(dx.successSettings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  async function saveEmployeeVacDays(empId: string) {
    setSavingEmpId(empId)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/staff/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacationDays: Number(empVacDays[empId] ?? 25) }),
      })
      if (!res.ok) throw new Error(dx.errVac)
      setSuccessMsg(dx.successVac)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSavingEmpId(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#003A5D] flex items-center justify-center">
              <Settings size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{dx.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{dx.team} {TEAM}</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {dx.refresh}
          </button>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
            {successMsg}
          </div>
        )}

        {loading ? <Spinner label={dx.loading} /> : (
          <>
            {/* Team Settings Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-slate-800">{dx.teamSettings}</h2>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  {dx.baseHoursLabel}
                </label>
                <p className="text-xs text-slate-400 -mt-1">
                  {dx.baseHoursDesc}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={80}
                    max={240}
                    step={0.5}
                    value={baseHours}
                    onChange={e => setBaseHours(e.target.value)}
                    className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003A5D]/30 focus:border-[#003A5D]"
                  />
                  <span className="text-sm text-slate-500">{dx.hoursUnit}</span>
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="ml-auto flex items-center gap-2 bg-[#003A5D] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#002D47] disabled:opacity-50 transition-colors"
                  >
                    <Save size={14} />
                    {saving ? dx.saving : dx.save}
                  </button>
                </div>
              </div>

              {settings && (
                <p className="text-xs text-slate-400">
                  {dx.lastSaved} <span className="font-mono font-medium">{settings.baseMonthlyHours}h</span>
                </p>
              )}
            </div>

            {/* Employee Vacation Days Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">{dx.vacTitle}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {dx.vacDesc}
                </p>
              </div>

              {employees.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-400 text-sm">
                  {dx.noEmployees}
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_80px_100px_100px] gap-3 px-6 py-2 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>{dx.colEmployee}</span>
                    <span className="text-center">{dx.colTime}</span>
                    <span className="text-center">{dx.colVacDays}</span>
                    <span />
                  </div>

                  {employees.map(emp => (
                    <div
                      key={emp.id}
                      className="grid grid-cols-[1fr_80px_100px_100px] gap-3 px-6 py-3 items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{emp.shortName}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-sm text-slate-600">{emp.workPercentage}%</span>
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          step={1}
                          value={empVacDays[emp.id] ?? '25'}
                          onChange={e =>
                            setEmpVacDays(prev => ({ ...prev, [emp.id]: e.target.value }))
                          }
                          className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#003A5D]/30 focus:border-[#003A5D]"
                        />
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => saveEmployeeVacDays(emp.id)}
                          disabled={savingEmpId === emp.id}
                          className="flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-[#003A5D] hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                        >
                          <Save size={11} />
                          {savingEmpId === emp.id ? '…' : dx.save}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
