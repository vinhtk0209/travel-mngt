import { AlertCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getSafeRedirectPath } from '@/utils/redirect'
import { useAuth } from '../auth-context'

export function AuthCallbackPage() {
  const { session, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = getSafeRedirectPath(searchParams.get('redirect'))
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (!isLoading && session) {
      navigate(redirect, { replace: true })
    }
  }, [isLoading, navigate, redirect, session])

  useEffect(() => {
    if (isLoading || session) return
    const timer = window.setTimeout(() => setShowError(true), 1500)
    return () => window.clearTimeout(timer)
  }, [isLoading, session])

  if (isLoading || (!session && !showError)) {
    return (
      <AuthShell title="One moment" subtitle="Completing your sign-in.">
        <div className="flex justify-center py-10">
          <Spinner className="h-8 w-8" />
        </div>
      </AuthShell>
    )
  }

  if (session) {
    return (
      <AuthShell title="You're in" subtitle="Taking you to your trips…">
        <div className="flex justify-center py-10">
          <Spinner className="h-8 w-8" />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Sign-in could not be completed"
      subtitle="The sign-in attempt failed or expired. Please try again."
    >
      <div className="flex flex-col items-center py-4 text-center">
        <span className="mb-4 rounded-3xl bg-coral-100 p-4 text-coral-500">
          <AlertCircle className="h-8 w-8" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
          Make sure the provider is enabled for this project and try signing in again.
        </p>
        <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="mt-6 w-full">
          <Button className="w-full" size="lg" leftIcon={<RefreshCw className="h-4 w-4" />}>
            Back to sign in
          </Button>
        </Link>
      </div>
    </AuthShell>
  )
}
