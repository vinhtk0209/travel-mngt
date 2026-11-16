import { ArrowLeft, MailQuestion, RefreshCw } from 'lucide-react'
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
      <AuthShell title="One moment" subtitle="We're checking your sign-in link.">
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
      title="This link has expired"
      subtitle="Sign-in links can only be used once. Request a fresh one and we'll try again."
      footer={
        <Link
          to={`/login/email?redirect=${encodeURIComponent(redirect)}`}
          className="inline-flex items-center gap-1 font-bold text-coral-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to email sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center py-4 text-center">
        <span className="mb-4 rounded-3xl bg-coral-100 p-4 text-coral-500">
          <MailQuestion className="h-8 w-8" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
          The link may have expired, already been used, or been opened in a different browser.
        </p>
        <Link to={`/login/email?redirect=${encodeURIComponent(redirect)}`} className="mt-6 w-full">
          <Button className="w-full" size="lg" leftIcon={<RefreshCw className="h-4 w-4" />}>
            Send a new link
          </Button>
        </Link>
        <Link to="/login" className="mt-4 text-sm font-bold text-ink-soft hover:text-coral-600">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  )
}
