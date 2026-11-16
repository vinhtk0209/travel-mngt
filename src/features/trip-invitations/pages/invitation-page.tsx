import { ArrowLeft, Check, MailQuestion, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthShell } from '@/components/shared/auth-shell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import {
  useAcceptInvitationByToken,
  useRejectInvitationByToken,
} from '../hooks'

export function InvitationPage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const accept = useAcceptInvitationByToken()
  const reject = useRejectInvitationByToken()

  const handleAccept = async () => {
    if (!token) return
    const tripId = await accept.mutateAsync(token)
    navigate(`/trips/${tripId}`, { replace: true })
  }

  const handleReject = async () => {
    if (!token) return
    await reject.mutateAsync(token)
    navigate('/dashboard', { replace: true })
  }

  const hasError = accept.isError || reject.isError

  return (
    <AuthShell
      title="A trip is waiting for you"
      subtitle={`Signed in as ${user?.email ?? 'your account'}. Accepting will add you to the trip instantly.`}
      footer={
        <Link to="/dashboard" className="inline-flex items-center gap-1 font-bold text-coral-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to your trips
        </Link>
      }
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span className="mb-4 rounded-3xl bg-coral-100 p-4 text-coral-500">
          <MailQuestion className="h-8 w-8" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
          Invitations are tied to the email they were sent to. If this one was meant for a different
          address, sign in with that account instead.
        </p>

        {hasError ? (
          <div className="mt-4 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            This invitation could not be used. It may have expired, already been answered, or belong
            to a different email address.
          </div>
        ) : null}

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            size="lg"
            isLoading={accept.isPending}
            onClick={() => void handleAccept()}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Accept and join
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            size="lg"
            isLoading={reject.isPending}
            onClick={() => void handleReject()}
            leftIcon={<X className="h-4 w-4" />}
          >
            Decline
          </Button>
        </div>
      </div>
    </AuthShell>
  )
}
