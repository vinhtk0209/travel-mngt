import { Database, ExternalLink, KeyRound } from 'lucide-react'
import { Logo } from './logo'
import { useI18n } from '@/i18n/i18n-context'

export function SetupNotice() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-xl">
        <Logo to="/" className="mb-8 justify-center" />
        <div className="surface-card p-7 sm:p-9">
          <span className="mb-4 inline-flex rounded-2xl bg-butter-100 p-3 text-amber-600">
            <KeyRound className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-extrabold">{t('setup.title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t('setup.body')}</p>

          <div className="mt-5 space-y-2 rounded-2xl bg-ink p-4 font-mono text-xs text-cream/90">
            <p>VITE_SUPABASE_URL=https://your-project.supabase.co</p>
            <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-mint-50 p-4 text-sm text-ink-soft">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-mint-500" />
            <p>{t('setup.migrations')}</p>
          </div>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-coral-600 hover:text-coral-700"
          >
            {t('setup.openDashboard')} <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
