'use client'

import { useState, useEffect } from 'react'

export type Lang = 'pt' | 'de' | 'en' | 'fr' | 'it'
export const LANGS: Lang[] = ['pt', 'de', 'en', 'fr', 'it']
const KEY = 'app_lang'
const EVENT = 'app-lang-change'

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'pt'
  const stored = localStorage.getItem(KEY) as Lang | null
  if (stored && LANGS.includes(stored)) return stored
  return 'pt'
}

export function setGlobalLang(lang: Lang) {
  localStorage.setItem(KEY, lang)
  window.dispatchEvent(new CustomEvent(EVENT, { detail: lang }))
}

export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(getLang)

  useEffect(() => {
    function handler(e: Event) {
      setLangState((e as CustomEvent<Lang>).detail)
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  function setLang(next: Lang) {
    setGlobalLang(next)
  }

  return [lang, setLang]
}
