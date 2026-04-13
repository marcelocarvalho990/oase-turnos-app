export type Lang = 'pt' | 'de'

export const translations = {
  pt: {
    nav: {
      schedule: 'Escala',
      staff: 'Colaboradores',
      shifts: 'Turnos',
      coverage: 'Cobertura',
      fairness: 'Equidade',
      approvals: 'Aprovações',
      myCalendar: 'O Meu Calendário',
      myRequests: 'Os Meus Pedidos',
      logout: 'Sair',
    },
    auth: {
      manager: 'Gerente',
      employee: 'Colaborador',
      login: 'Entrar',
      selectEmployee: 'Selecionar colaborador',
      pin: 'PIN (4 dígitos)',
      password: 'Palavra-passe',
      invalidCredentials: 'Credenciais inválidas. Tente novamente.',
      welcome: 'Bem-vindo ao sistema de turnos',
      subtitle: 'Faça login para continuar',
    },
    schedule: {
      generate: 'Gerar Escala',
      generating: 'A gerar...',
      draft: 'Rascunho',
      generated: 'Gerado',
      published: 'Publicado',
      locked: 'Bloqueado',
      coverage: 'Cobertura',
      hours: 'Horas',
    },
    requests: {
      vacation: 'Férias',
      swap: 'Troca de Turno',
      pending: 'Pendente',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      cancelled: 'Cancelado',
      newVacation: 'Pedir Férias',
      newSwap: 'Pedir Troca',
      startDate: 'Data de início',
      endDate: 'Data de fim',
      message: 'Mensagem (opcional)',
      targetEmployee: 'Colaborador alvo',
      myDate: 'O meu turno (data)',
      theirDate: 'Turno do outro (data)',
      submit: 'Submeter pedido',
      managerNote: 'Nota do gestor',
    },
    actions: {
      approve: 'Aprovar',
      reject: 'Rejeitar',
      cancel: 'Cancelar',
      save: 'Guardar',
      close: 'Fechar',
      generatePin: 'Gerar PIN',
      pinCopied: 'PIN gerado',
    },
    calendar: {
      today: 'Hoje',
      free: 'Folga',
      noShift: 'Sem turno',
    },
    employee: {
      mySchedule: 'O Meu Horário',
      hello: 'Olá',
    },
  },
  de: {
    nav: {
      schedule: 'Dienstplan',
      staff: 'Mitarbeiter',
      shifts: 'Schichten',
      coverage: 'Abdeckung',
      fairness: 'Gerechtigkeit',
      approvals: 'Genehmigungen',
      myCalendar: 'Mein Kalender',
      myRequests: 'Meine Anfragen',
      logout: 'Abmelden',
    },
    auth: {
      manager: 'Manager',
      employee: 'Mitarbeiter',
      login: 'Anmelden',
      selectEmployee: 'Mitarbeiter auswählen',
      pin: 'PIN (4 Ziffern)',
      password: 'Passwort',
      invalidCredentials: 'Ungültige Anmeldedaten. Erneut versuchen.',
      welcome: 'Willkommen beim Dienstplan-System',
      subtitle: 'Bitte anmelden um fortzufahren',
    },
    schedule: {
      generate: 'Dienstplan generieren',
      generating: 'Wird generiert...',
      draft: 'Entwurf',
      generated: 'Generiert',
      published: 'Veröffentlicht',
      locked: 'Gesperrt',
      coverage: 'Abdeckung',
      hours: 'Stunden',
    },
    requests: {
      vacation: 'Ferien',
      swap: 'Schichttausch',
      pending: 'Ausstehend',
      approved: 'Genehmigt',
      rejected: 'Abgelehnt',
      cancelled: 'Abgebrochen',
      newVacation: 'Urlaub beantragen',
      newSwap: 'Tausch beantragen',
      startDate: 'Startdatum',
      endDate: 'Enddatum',
      message: 'Nachricht (optional)',
      targetEmployee: 'Zielmitarbeiter',
      myDate: 'Meine Schicht (Datum)',
      theirDate: 'Ihre Schicht (Datum)',
      submit: 'Anfrage einreichen',
      managerNote: 'Manager-Notiz',
    },
    actions: {
      approve: 'Genehmigen',
      reject: 'Ablehnen',
      cancel: 'Abbrechen',
      save: 'Speichern',
      close: 'Schließen',
      generatePin: 'PIN generieren',
      pinCopied: 'PIN generiert',
    },
    calendar: {
      today: 'Heute',
      free: 'Frei',
      noShift: 'Kein Dienst',
    },
    employee: {
      mySchedule: 'Mein Dienstplan',
      hello: 'Hallo',
    },
  },
} as const

export type T = typeof translations.pt

export function getT(lang: Lang): T {
  return translations[lang] as unknown as T
}

export function langFromCookie(cookieValue: string | undefined): Lang {
  if (cookieValue === 'de') return 'de'
  return 'pt'
}
