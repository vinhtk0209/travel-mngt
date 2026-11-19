import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Locale } from '@/lib/supabase/database.types'
import { useAuth } from '@/features/auth/auth-context'
import { useProfile } from '@/features/auth/hooks'
import { queryKeys } from '@/lib/query-keys'
import { setDateLocale } from '@/utils/date'
import { setActiveLocale, translate, type TranslationKey } from './translate'

const STORAGE_KEY = 'wanderlist.locale'
const SUPPORTED: Locale[] = ['en', 'vi']

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && (SUPPORTED as string[]).includes(stored)) return stored as Locale
  } catch {
    // Storage can be unavailable in private modes.
  }
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !profile || syncedUserId === user.id) return
    setLocaleState(profile.locale)
    setSyncedUserId(user.id)
  }, [user, profile, syncedUserId])

  useEffect(() => {
    setActiveLocale(locale)
    setDateLocale(locale)
    document.documentElement.lang = locale
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Ignore storage failures.
    }
  }, [locale])

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      if (!user) return
      void supabase
        .from('profiles')
        .update({ locale: next })
        .eq('id', user.id)
        .then(({ error }) => {
          if (!error) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) })
          }
        })
    },
    [queryClient, user],
  )

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(key, vars, locale),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
