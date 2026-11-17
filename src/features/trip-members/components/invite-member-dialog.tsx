import { AlertCircle, Check, Copy, Link2, MailPlus, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { useInviteMember } from '@/features/trip-invitations/hooks'
import type { InviteRole, InviteResponse } from '@/features/trip-invitations/types'
import { ROLE_DESCRIPTIONS } from '../types'
import { getErrorMessage } from '@/utils/errors'

type InviteMemberDialogProps = {
  open: boolean
  onClose: () => void
  tripId: string
  tripName: string
}

export function InviteMemberDialog({ open, onClose, tripId, tripName }: InviteMemberDialogProps) {
  const invite = useInviteMember(tripId)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('editor')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InviteResponse | null>(null)
  const [resultEmail, setResultEmail] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setRole('editor')
    setError(null)
    setResult(null)
    setResultEmail(null)
    setCopied(false)
  }, [open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const normalized = email.trim().toLowerCase()
    if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid email address, or leave it blank to create a share link')
      return
    }

    try {
      const response = await invite.mutateAsync({ email: normalized || undefined, role })
      setResult(response)
      setResultEmail(normalized || null)
      if (response.emailSent) {
        toast.success('Invitation email sent')
      } else if (normalized) {
        toast.success('Invitation created — share the link below')
      } else {
        toast.success('Share link created')
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Could not create the invitation'))
    }
  }

  const copyLink = async () => {
    if (!result?.inviteLink) return
    try {
      await navigator.clipboard.writeText(result.inviteLink)
      setCopied(true)
      toast.success('Invite link copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select the link manually')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite or share this trip"
      description={`Bring someone into “${tripName}”. Add their email, or leave it blank to create a link you can share anywhere.`}
      size="sm"
      footer={
        result ? (
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={invite.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="invite-form"
              isLoading={invite.isPending}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Create invite
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-mint-50 p-4">
            <span className="rounded-full bg-mint-200 p-2 text-mint-600">
              {resultEmail ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </span>
            <div className="text-sm text-ink-soft">
              <p className="font-bold text-ink">
                {resultEmail ? 'Invitation ready' : 'Share link ready'}
              </p>
              <p className="mt-1">
                {resultEmail
                  ? result.emailSent
                    ? 'The email is on its way. You can also share the link directly.'
                    : 'Email delivery is not configured, so share this private link with your buddy.'
                  : `Anyone who signs in with this link will join the trip as ${role === 'editor' ? 'an editor' : 'a viewer'}.`}
              </p>
            </div>
          </div>

          <Field label="Invite link" htmlFor="invite-link">
            <div className="flex gap-2">
              <Input id="invite-link" readOnly value={result.inviteLink} className="text-xs" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => void copyLink()}
                aria-label="Copy invite link"
              >
                {copied ? <Check className="h-4 w-4 text-mint-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </Field>

          <p className="text-xs text-ink-muted">
            {resultEmail
              ? `The link expires in 7 days and can only be accepted by ${resultEmail}.`
              : 'The link expires in 7 days. You can cancel the invitation from the members list at any time.'}
          </p>
        </div>
      ) : (
        <form id="invite-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          {error ? (
            <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <Field label="Email address (optional)" htmlFor="invite-email">
            <div className="relative">
              <MailPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
              <Input
                id="invite-email"
                type="email"
                autoComplete="off"
                className="pl-10"
                placeholder="friend@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <p className="text-xs text-ink-muted">
              Leave blank to create a link you can share in any chat or group.
            </p>
          </Field>

          <Field label="Role" htmlFor="invite-role">
            <Select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as InviteRole)}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </Select>
            <p className="text-xs text-ink-muted">{ROLE_DESCRIPTIONS[role]}</p>
          </Field>
        </form>
      )}
    </Modal>
  )
}
