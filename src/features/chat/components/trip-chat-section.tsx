import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, Eye, MessageCircle, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { resolveAvatarUrl } from '@/features/avatars/api'
import { useAvatarUrls } from '@/features/avatars/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TripMemberWithProfile } from '@/features/trip-members/types'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import { getDateFnsLocale } from '@/utils/date'
import { cn } from '@/utils/cn'
import { useSendTripMessage, useTripChatRealtime, useTripMessages } from '../hooks'

type TripChatSectionProps = {
  tripId: string
  members: TripMemberWithProfile[]
  currentUserId: string | undefined
  canSend: boolean
}

export function TripChatSection({
  tripId,
  members,
  currentUserId,
  canSend,
}: TripChatSectionProps) {
  const { t } = useI18n()
  const messagesQuery = useTripMessages(tripId)
  const sendMessage = useSendTripMessage(tripId, currentUserId)
  useTripChatRealtime(tripId)

  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const messages = messagesQuery.data ?? []
  const avatarUrls = useAvatarUrls(members.map((member) => member.profile?.avatar_url))
  const memberById = new Map(members.map((member) => [member.user_id, member]))

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages.length])

  const submit = async () => {
    const content = draft.trim()
    if (!content || sendMessage.isPending) return
    setError(null)
    try {
      await sendMessage.mutateAsync(content)
      setDraft('')
    } catch (sendError) {
      setError(getErrorMessage(sendError, t('chat.sendError')))
    }
  }

  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-2xl bg-sky-100 p-2 text-sky-500">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold">{t('chat.title')}</h2>
            <p className="text-xs text-ink-muted">{t('chat.body')}</p>
          </div>
        </div>
        <Badge
          variant="mint"
          icon={<span className="h-1.5 w-1.5 rounded-full bg-mint-500" />}
        >
          {t('chat.live')}
        </Badge>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-3 flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div
        ref={listRef}
        className="scrollbar-thin max-h-80 min-h-32 space-y-3 overflow-y-auto rounded-2xl border border-border/60 bg-white/50 p-3"
      >
        {messagesQuery.isLoading ? (
          <div className="space-y-3 py-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-cream" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-extrabold text-ink">{t('chat.emptyTitle')}</p>
            <p className="text-xs text-ink-muted">
              {t('chat.emptyBody')}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const sender = memberById.get(message.sender_id)
            const isSelf = message.sender_id === currentUserId
            return (
              <div
                key={message.id}
                className={cn('flex items-end gap-2', isSelf ? 'flex-row-reverse' : 'flex-row')}
              >
                <Avatar
                  name={sender?.profile?.display_name ?? t('common.traveler')}
                  src={resolveAvatarUrl(sender?.profile?.avatar_url, avatarUrls)}
                  size="sm"
                />
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2',
                    isSelf
                      ? 'bg-coral-500 text-white'
                      : 'border border-border/70 bg-surface text-ink',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-baseline gap-2 text-[10px] font-bold',
                      isSelf ? 'text-white/80' : 'text-ink-muted',
                    )}
                  >
                    <span>{isSelf ? t('common.you') : (sender?.profile?.display_name ?? t('common.traveler'))}</span>
                    <time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: getDateFnsLocale() })}
                    </time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {canSend ? (
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <textarea
            aria-label={t('chat.messageLabel')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit()
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={t('chat.placeholder')}
            className="min-h-11 flex-1 resize-none rounded-2xl border border-border bg-white/80 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-coral-300 focus:ring-4 focus:ring-coral-100"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim() || sendMessage.isPending}
            isLoading={sendMessage.isPending}
            aria-label={t('chat.send')}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/70 bg-cream/60 px-3.5 py-2.5 text-xs font-semibold text-ink-muted">
          <Eye className="h-4 w-4 text-sky-500" />
          {t('chat.viewOnly')}
        </div>
      )}
    </section>
  )
}
