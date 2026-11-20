import { Languages } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/i18n-context'
import type { Locale } from '@/lib/supabase/database.types'
import { cn } from '@/utils/cn'

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])

  const choose = (next: Locale) => { setLocale(next); setOpen(false) }

  return <div ref={root} className={cn('relative shrink-0', className)}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={t('nav.language')}
      aria-haspopup="menu" aria-expanded={open} title={t('nav.language')}
      className="inline-flex h-10 items-center gap-1 rounded-full px-2 text-xs font-bold text-ink-soft hover:bg-surface">
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span>{locale.toUpperCase()}</span>
    </button>
    {open ? <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-40 rounded-2xl border border-border bg-surface p-1 shadow-lift">
      {(['en', 'vi'] as const).map((option) => <button key={option} type="button" role="menuitemradio"
        aria-checked={locale === option} onClick={() => choose(option)}
        className={cn('block w-full rounded-xl px-3 py-2 text-left text-sm text-ink hover:bg-cream', locale === option && 'bg-coral-50 font-bold text-coral-700')}>
        {option === 'en' ? t('nav.languageEn') : t('nav.languageVi')}
      </button>)}
    </div> : null}
  </div>
}
