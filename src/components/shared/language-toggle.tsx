import { ChevronDown, Languages } from 'lucide-react'
import { useI18n } from '@/i18n/i18n-context'
import type { Locale } from '@/lib/supabase/database.types'
import { cn } from '@/utils/cn'

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <label
      className={cn(
        'group relative inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-transparent pl-2.5 pr-2 text-ink-soft transition hover:border-border hover:bg-white/70 focus-within:border-coral-300 focus-within:bg-white/80',
        className,
      )}
      title={t('nav.language')}
    >
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="hidden text-xs font-bold sm:inline">
        {locale === 'en' ? t('nav.languageEn') : t('nav.languageVi')}
      </span>
      <span className="text-xs font-bold sm:hidden">{locale.toUpperCase()}</span>
      <ChevronDown
        className="h-3.5 w-3.5 shrink-0 text-ink-muted transition group-hover:text-ink-soft"
        aria-hidden="true"
      />
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={t('nav.language')}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 focus-visible:outline-none"
      >
        <option value="en">{t('nav.languageEn')}</option>
        <option value="vi">{t('nav.languageVi')}</option>
      </select>
    </label>
  )
}
