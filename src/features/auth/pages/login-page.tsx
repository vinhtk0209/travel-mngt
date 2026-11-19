import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import { buildAuthCallbackUrl, getSafeRedirectPath } from '@/utils/redirect'
import { signInWithOAuth } from '../api'

export function LoginPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const redirect = getSafeRedirectPath(searchParams.get('redirect'))
  const [serverError, setServerError] = useState<string | null>(null)
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null)

  const handleOAuth = async (provider: 'google' | 'github') => {
    setServerError(null)
    setLoadingProvider(provider)
    try {
      const redirectTo = buildAuthCallbackUrl(window.location.origin, redirect)
      await signInWithOAuth(provider, redirectTo)
    } catch (error) {
      setServerError(getErrorMessage(error, t('auth.couldNotStart')))
      setLoadingProvider(null)
    }
  }

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
    >
      <div className="space-y-3">
        {serverError ? (
          <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          size="lg"
          onClick={() => void handleOAuth('google')}
          isLoading={loadingProvider === 'google'}
          disabled={loadingProvider !== null}
        >
          {t('auth.continueGoogle')}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          size="lg"
          onClick={() => void handleOAuth('github')}
          isLoading={loadingProvider === 'github'}
          disabled={loadingProvider !== null}
        >
          {t('auth.continueGitHub')}
        </Button>
      </div>
    </AuthShell>
  )
}
