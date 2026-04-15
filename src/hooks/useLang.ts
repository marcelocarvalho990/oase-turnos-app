'use client'

import { useState, useEffect } from 'react'

export type Lang = 'pt' | 'de'
const KEY = 'app_lang'
const EVENT = 'app-lang-change'

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'pt'
  return (localStorage.getItem(KEY) as Lang) ?? 'pt'
}

export function setGlobalLang(lang: Lang) {
  localStorage.setItem(KEY, lang)
  window.dispatchEvent(new CustomEvent(EVENT, { detail: lang }))
}

export function useLang(): [Lang, () => void] {
  const [lang, setLang] = useState<Lang>(getLang)

  useEffect(() => {
    function handler(e: Event) {
      setLang((e as CustomEvent<Lang>).detail)
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  function toggle() {
    const next: Lang = lang === 'pt' ? 'de' : 'pt'
    setGlobalLang(next)
  }

  return [lang, toggle]
}
