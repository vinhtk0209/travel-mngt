import { Languages } from 'lucide-react'
import { useI18n } from '@/i18n/i18n-context'
import type { Locale } from '@/lib/supabase/database.types'
import { cn } from '@/utils/cn'

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <label
      className={cn(
        'relative inline-flex h-11 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-ink-soft transition hover:border-border hover:bg-white/70',
        className,
      )}
      title={t('nav.language')}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t('nav.language')}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-xs font-bold text-ink-soft outline-none"
      >
        <option value="en">{t('nav.languageEn')}</option>
        <option value="vi">{t('nav.languageVi')}</option>
      </select>
    </label>
  )
}
