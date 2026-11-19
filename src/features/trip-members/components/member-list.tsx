import { Crown, ShieldCheck, UserMinus, Eye, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/avatar'
import { resolveAvatarUrl } from '@/features/avatars/api'
import { useAvatarUrls } from '@/features/avatars/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { TripRole } from '@/lib/supabase/database.types'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import { useRemoveMember, useTransferOwnership, useUpdateMemberRole } from '../hooks'
import type { TripMemberWithProfile } from '../types'

type MemberListProps = {
  tripId: string
  members: TripMemberWithProfile[]
  currentUserId: string | undefined
  isOwner: boolean
  isLoading?: boolean
}

const roleIcon = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye,
}

const roleVariant = {
  owner: 'butter',
  editor: 'mint',
  viewer: 'sky',
} as const

export function MemberList({
  tripId,
  members,
  currentUserId,
  isOwner,
  isLoading = false,
}: MemberListProps) {
  const { t } = useI18n()
  const updateRole = useUpdateMemberRole(tripId)
  const removeMember = useRemoveMember(tripId)
  const transferOwnership = useTransferOwnership(tripId)
  const avatarUrls = useAvatarUrls(members.map((member) => member.profile?.avatar_url))

  const [removing, setRemoving] = useState<TripMemberWithProfile | null>(null)
  const [transferring, setTransferring] = useState<TripMemberWithProfile | null>(null)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

  const handleRoleChange = async (member: TripMemberWithProfile, role: TripRole) => {
    setBusyMemberId(member.id)
    try {
      await updateRole.mutateAsync({ memberId: member.id, role })
      toast.success(t('members.roleUpdated'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('members.roleError')))
    } finally {
      setBusyMemberId(null)
    }
  }

  const handleRemove = async () => {
    if (!removing) return
    try {
      await removeMember.mutateAsync(removing.id)
      toast.success(t('members.removed'))
      setRemoving(null)
    } catch (error) {
      toast.error(getErrorMessage(error, t('members.removeError')))
    }
  }

  const handleTransfer = async () => {
    if (!transferring) return
    try {
      await transferOwnership.mutateAsync(transferring.user_id)
      toast.success(t('members.transferred'))
      setTransferring(null)
    } catch (error) {
      toast.error(getErrorMessage(error, t('members.transferError')))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl border border-border p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-2">
        {members.map((member) => {
          const name = member.profile?.display_name ?? t('common.traveler')
          const isSelf = member.user_id === currentUserId
          const Icon = roleIcon[member.role]
          const isBusy = busyMemberId === member.id

          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-white/60 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={name} src={resolveAvatarUrl(member.profile?.avatar_url, avatarUrls)} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-extrabold text-ink">
                    {name}
                    {isSelf ? (
                      <span className="rounded-full bg-cream px-1.5 py-0.5 text-[10px] font-bold text-ink-muted">
                        {t('common.you')}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {member.profile?.email ?? t('common.member')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:justify-end">
                {member.role === 'owner' || !isOwner || isSelf ? (
                  <Badge variant={roleVariant[member.role]} icon={<Icon className="h-3 w-3" />}>
                    {t(`role.${member.role}`)}
                  </Badge>
                ) : (
                  <Select
                    aria-label={t('members.roleFor', { name })}
                    value={member.role}
                    disabled={isBusy}
                    onChange={(event) =>
                      void handleRoleChange(member, event.target.value as TripRole)
                    }
                    className="h-9 w-28 rounded-full px-3 text-xs font-bold"
                  >
                    <option value="editor">{t('role.editor')}</option>
                    <option value="viewer">{t('role.viewer')}</option>
                  </Select>
                )}

                {isOwner && !isSelf && member.role !== 'owner' ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t('members.transferTitle')}
                      aria-label={t('members.makeOwner', { name })}
                      onClick={() => setTransferring(member)}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-rose-500 hover:bg-rose-50"
                      title={t('members.removeTitle')}
                      aria-label={t('members.removeLabel', { name })}
                      onClick={() => setRemoving(member)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => void handleRemove()}
        isLoading={removeMember.isPending}
        title={t('members.removeConfirmTitle')}
        confirmLabel={t('profile.remove')}
        description={
          <>
            {t('members.removeConfirmBody', {
              name: removing?.profile?.display_name ?? t('common.member'),
            })}
          </>
        }
      />

      <ConfirmDialog
        open={Boolean(transferring)}
        onClose={() => setTransferring(null)}
        onConfirm={() => void handleTransfer()}
        isLoading={transferOwnership.isPending}
        tone="primary"
        title={t('members.transferConfirmTitle')}
        confirmLabel={t('members.transferTitle')}
        description={
          <>
            {t('members.transferConfirmBody', {
              name: transferring?.profile?.display_name ?? t('common.member'),
            })}
          </>
        }
      />
    </>
  )
}
