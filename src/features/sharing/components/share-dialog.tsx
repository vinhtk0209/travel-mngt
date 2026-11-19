import { AlertCircle, Check, Copy, Link2, RefreshCw, ShieldOff, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { useTrip } from '@/features/trips/hooks'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import {
  useCreateTripShare,
  useDisableTripShare,
  useRegenerateTripShare,
  useSetTripShareRole,
} from '../hooks'
import type { ShareRole } from '../types'

type ShareDialogProps = {
  open: boolean
  onClose: () => void
  tripId: string
  tripName: string
}

const ROLE_KEYS: Record<ShareRole, 'role.editorCopy' | 'role.viewerCopy'> = {
  editor: 'role.editorCopy',
  viewer: 'role.viewerCopy',
}

export function ShareDialog({ open, onClose, tripId, tripName }: ShareDialogProps) {
  const { t } = useI18n()
  const tripQuery = useTrip(tripId)
  const trip = tripQuery.data
  const createShare = useCreateTripShare(tripId)
  const setRoleMutation = useSetTripShareRole(tripId)
  const regenerateShare = useRegenerateTripShare(tripId)
  const disableShare = useDisableTripShare(tripId)

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<ShareRole>('editor')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const linkInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setToken(trip?.share_token ?? null)
    setRole((trip?.share_role as ShareRole | undefined) ?? 'editor')
    setCopied(false)
    setError(null)
    setConfirmRegenerate(false)
    setConfirmDisable(false)
  }, [open, trip?.share_token, trip?.share_role])

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
    },
    [],
  )

  const link = token ? `${window.location.origin}/share/${token}` : null

  const handleCreate = () => {
    setError(null)
    createShare.mutate(role, {
      onSuccess: (share) => {
        setToken(share.token)
        setRole(share.role)
      },
      onError: (mutationError) => {
        setError(getErrorMessage(mutationError, t('sharing.createError')))
      },
    })
  }

  const handleRoleChange = (nextRole: ShareRole) => {
    if (nextRole === role) return
    const previous = role
    setRole(nextRole)
    setError(null)
    if (!token) return

    setRoleMutation.mutate(nextRole, {
      onError: (mutationError) => {
        setRole(previous)
        setError(getErrorMessage(mutationError, t('sharing.roleError')))
      },
    })
  }

  const handleCopy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2_000)
    } catch {
      linkInput.current?.select()
      setError(t('sharing.copyError'))
    }
  }

  const handleRegenerate = () => {
    setError(null)
    regenerateShare.mutate(undefined, {
      onSuccess: (newToken) => {
        setToken(newToken)
        setConfirmRegenerate(false)
        setCopied(false)
      },
      onError: (mutationError) => {
        setError(getErrorMessage(mutationError, t('sharing.newLinkError')))
        setConfirmRegenerate(false)
      },
    })
  }

  const handleDisable = () => {
    setError(null)
    disableShare.mutate(undefined, {
      onSuccess: () => {
        setToken(null)
        setConfirmDisable(false)
        setCopied(false)
      },
      onError: (mutationError) => {
        setError(getErrorMessage(mutationError, t('sharing.stopError')))
        setConfirmDisable(false)
      },
    })
  }

  const busy =
    createShare.isPending ||
    setRoleMutation.isPending ||
    regenerateShare.isPending ||
    disableShare.isPending

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t('sharing.title')}
        description={t('sharing.description', { name: tripName })}
        size="md"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-ink-muted">
              {t('sharing.ownerOnly')}
            </p>
            <Button variant="secondary" onClick={onClose}>
              {t('sharing.done')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/70 bg-cream/60 p-4">
            <label
              htmlFor="share-role"
              className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-ink-muted"
            >
              <Users className="h-3.5 w-3.5" /> {t('sharing.roleLabel')}
            </label>
            <Select
              id="share-role"
              value={role}
              disabled={busy}
              onChange={(event) => handleRoleChange(event.target.value as ShareRole)}
              className="mt-2"
            >
              <option value="editor">{t('role.editorOption')}</option>
              <option value="viewer">{t('role.viewerOption')}</option>
            </Select>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              {t('sharing.roleHelp', {
                editorCopy: t(ROLE_KEYS.editor),
                viewerCopy: t(ROLE_KEYS.viewer),
              })}
            </p>
          </div>

          {token && link ? (
            <div className="space-y-2">
              <label htmlFor="share-link" className="text-xs font-extrabold uppercase tracking-wide text-ink-muted">
                {t('sharing.linkLabel')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  ref={linkInput}
                  readOnly
                  value={link}
                  onFocus={(event) => event.target.select()}
                  className="font-mono text-xs"
                />
                <Button
                  variant="secondary"
                  onClick={() => void handleCopy()}
                  leftIcon={
                    copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />
                  }
                >
                  {copied ? t('sharing.copied') : t('sharing.copy')}
                </Button>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                {t('sharing.linkHelp', {
                  role: role === 'editor' ? t('sharing.anEditor') : t('sharing.aViewer'),
                })}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRegenerate(true)}
                  disabled={busy}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  {t('sharing.newLink')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => setConfirmDisable(true)}
                  disabled={busy}
                  leftIcon={<ShieldOff className="h-3.5 w-3.5" />}
                >
                  {t('sharing.stop')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white/60 p-5 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-coral-100 text-coral-500">
                <Link2 className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-extrabold text-ink">{t('sharing.offTitle')}</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
                {t('sharing.offBody')}
              </p>
              <Button
                className="mt-4"
                onClick={handleCreate}
                isLoading={createShare.isPending}
                leftIcon={<Link2 className="h-4 w-4" />}
              >
                {t('sharing.create')}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={handleRegenerate}
        isLoading={regenerateShare.isPending}
        title={t('sharing.regenerateTitle')}
        confirmLabel={t('sharing.regenerateButton')}
        description={t('sharing.regenerateBody')}
      />

      <ConfirmDialog
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        onConfirm={handleDisable}
        isLoading={disableShare.isPending}
        tone="danger"
        title={t('sharing.stopTitle')}
        confirmLabel={t('sharing.stop')}
        description={t('sharing.stopBody')}
      />
    </>
  )
}
