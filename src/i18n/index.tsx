import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Language } from '@/types'
import { en } from './en'
import { de } from './de'

export type Dict = Record<string, string>

const dictionaries: Record<Language, Dict> = { en, de }

const localeByLang: Record<Language, string> = { en: 'en-GB', de: 'de-DE' }

type TParams = Record<string, string | number>

interface I18nContextValue {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: (key: string, params?: TParams) => string
  formatCurrency: (amount: number, currency?: string) => string
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (iso: string, style?: 'short' | 'medium' | 'long') => string
  formatDateTime: (iso: string) => string
  formatRelative: (iso: string, now?: number) => string
  locale: string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'sh-invoice-lang'

function interpolate(template: string, params?: TParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  )
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return stored === 'de' || stored === 'en' ? stored : 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Language) => setLangState(next), [])
  const toggleLang = useCallback(() => setLangState((p) => (p === 'en' ? 'de' : 'en')), [])

  const value = useMemo<I18nContextValue>(() => {
    const locale = localeByLang[lang]
    const dict = dictionaries[lang]
    const fallback = dictionaries.en

    const t = (key: string, params?: TParams) => {
      const template = dict[key] ?? fallback[key] ?? key
      return interpolate(template, params)
    }

    const formatCurrency = (amount: number, currency = 'EUR') =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount)

    const formatNumber = (n: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(n)

    const formatDate = (iso: string, style: 'short' | 'medium' | 'long' = 'medium') => {
      if (!iso) return '—'
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return '—'
      const opts: Intl.DateTimeFormatOptions =
        style === 'short'
          ? { day: '2-digit', month: '2-digit', year: '2-digit' }
          : style === 'long'
            ? { day: 'numeric', month: 'long', year: 'numeric' }
            : { day: '2-digit', month: 'short', year: 'numeric' }
      return new Intl.DateTimeFormat(locale, opts).format(d)
    }

    const formatDateTime = (iso: string) => {
      if (!iso) return '—'
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return '—'
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    }

    const formatRelative = (iso: string, now = Date.now()) => {
      if (!iso) return '—'
      const then = new Date(iso).getTime()
      if (Number.isNaN(then)) return '—'
      const diffMs = then - now
      const abs = Math.abs(diffMs)
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      const min = 60_000
      const hour = 60 * min
      const day = 24 * hour
      if (abs < hour) return rtf.format(Math.round(diffMs / min), 'minute')
      if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour')
      if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), 'day')
      return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(
        new Date(iso),
      )
    }

    return {
      lang,
      setLang,
      toggleLang,
      t,
      formatCurrency,
      formatNumber,
      formatDate,
      formatDateTime,
      formatRelative,
      locale,
    }
  }, [lang, setLang, toggleLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

// Shorthand hook returning just the translate function.
export function useT() {
  return useI18n().t
}
