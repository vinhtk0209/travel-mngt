import { formatDistanceToNow } from 'date-fns'
import { SmilePlus } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { useI18n } from '@/i18n/i18n-context'
import { cn } from '@/utils/cn'
import { getDateFnsLocale } from '@/utils/date'
import {
  CHAT_REACTION_EMOJIS,
  findUserReaction,
  summarizeReactions,
  type TripMessage,
  type TripMessageAttachment,
  type TripMessageReaction,
} from '../utils'

type ChatMessageProps = {
  message: TripMessage
  attachment?: TripMessageAttachment
  attachmentUrl?: string
  senderName: string
  senderAvatarUrl?: string | null
  isSelf: boolean
  currentUserId: string | undefined
  reactions: TripMessageReaction[]
  canReact: boolean
  onReact: (input: { messageId: string; emoji: string; currentEmoji?: string }) => void
}

export function ChatMessage({
  message,
  attachment,
  attachmentUrl,
  senderName,
  senderAvatarUrl,
  isSelf,
  currentUserId,
  reactions,
  canReact,
  onReact,
}: ChatMessageProps) {
  const { t } = useI18n()
  const [pickerOpen, setPickerOpen] = useState(false)
  const myReaction = findUserReaction(reactions, currentUserId)
  const summary = summarizeReactions(reactions, currentUserId)

  const react = (emoji: string) => {
    onReact({ messageId: message.id, emoji, currentEmoji: myReaction })
    setPickerOpen(false)
  }

  return (
    <div
      data-chat-message={message.id}
      className={cn('group flex items-end gap-2', isSelf ? 'flex-row-reverse' : 'flex-row')}
    >
      <Avatar name={senderName} src={senderAvatarUrl} size="sm" />
      <div className={cn('flex max-w-[82%] flex-col gap-1', isSelf ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'overflow-hidden rounded-2xl',
            attachment
              ? 'p-1.5'
              : 'px-3.5 py-2',
            isSelf
              ? 'bg-coral-500 text-white'
              : 'border border-border/70 bg-surface text-ink',
          )}
        >
          {attachment && attachmentUrl ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl bg-ink/5"
              aria-label={attachment.file_name}
            >
              <img
                src={attachmentUrl}
                alt={attachment.file_name || t('chat.attachmentAlt')}
                loading="lazy"
                className="max-h-64 w-auto max-w-full object-cover"
              />
            </a>
          ) : null}

          <div className={attachment ? 'px-2 pb-1 pt-1.5' : ''}>
            <div
              className={cn(
                'flex items-baseline gap-2 text-[10px] font-bold',
                isSelf ? 'text-white/80' : 'text-ink-muted',
              )}
            >
              <span>{isSelf ? t('common.you') : senderName}</span>
              <time
                dateTime={message.created_at}
                title={new Date(message.created_at).toLocaleString()}
              >
                {formatDistanceToNow(new Date(message.created_at), {
                  addSuffix: true,
                  locale: getDateFnsLocale(),
                })}
              </time>
            </div>
            {message.content ? (
              <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed">
                {message.content}
              </p>
            ) : null}
          </div>
        </div>

        <div className={cn('flex flex-wrap items-center gap-1', isSelf ? 'justify-end' : '')}>
          {summary.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              onClick={() => react(reaction.emoji)}
              disabled={!canReact}
              aria-label={t('chat.addReaction', { emoji: reaction.emoji })}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-bold transition',
                reaction.reactedByMe
                  ? 'border-coral-300 bg-coral-50 text-coral-700'
                  : 'border-border/70 bg-white/85 text-ink-soft hover:border-coral-200',
                !canReact && 'cursor-default opacity-80',
              )}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}

          {canReact ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((value) => !value)}
                aria-label={t('chat.reactions')}
                aria-expanded={pickerOpen}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-white/70 text-ink-muted opacity-100 transition hover:border-coral-200 hover:text-coral-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
              {pickerOpen ? (
                <div
                  role="group"
                  aria-label={t('chat.reactions')}
                  className={cn(
                    'absolute bottom-8 z-10 flex items-center gap-0.5 rounded-full border border-border bg-surface p-1 shadow-lift',
                    isSelf ? 'right-0' : 'left-0',
                  )}
                >
                  {CHAT_REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => react(emoji)}
                      aria-label={t('chat.addReaction', { emoji })}
                      className={cn(
                        'rounded-full p-1 text-lg leading-none transition hover:scale-110 hover:bg-cream',
                        myReaction === emoji && 'bg-coral-50',
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
