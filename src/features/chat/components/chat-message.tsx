import { formatDistanceToNow } from 'date-fns'
import { Pencil, SmilePlus } from 'lucide-react'
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
  readers?: string[]
  mentionCandidates?: { id: string; label: string }[]
  mentionedUserIds?: string[]
  onEdit?: (input: { messageId: string; content: string; mentionIds: string[] }) => Promise<void>
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
  readers = [],
  mentionCandidates = [],
  mentionedUserIds = [],
  onEdit,
  onReact,
}: ChatMessageProps) {
  const { t } = useI18n()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(message.content)
  const [editMentions, setEditMentions] = useState<{ id: string; label: string }[]>([])
  const editMentionMatch = editDraft.match(/(?:^|\s)@([^\s@]*)$/)
  const editMentionOptions = editMentionMatch
    ? mentionCandidates.filter((candidate) => candidate.label.toLowerCase().includes(editMentionMatch[1].toLowerCase()))
    : []
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
            <div className={cn('text-[10px] font-bold', isSelf ? 'text-white/80' : 'text-ink-muted')}>
              <span>{isSelf ? t('common.you') : senderName}</span>
              <br />
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
            {editing ? (
              <form className="mt-1 flex flex-col gap-1" onSubmit={(event) => {
                event.preventDefault()
                if (!editDraft.trim()) return
                const mentionIds = editMentions.filter((item) => editDraft.includes(`@${item.label}`))
                  .flatMap((item) => item.id === 'all'
                    ? mentionCandidates.filter((candidate) => candidate.id !== 'all').map((candidate) => candidate.id)
                    : [item.id])
                if (onEdit) void onEdit({ messageId: message.id, content: editDraft, mentionIds: [...new Set(mentionIds)] })
                  .then(() => setEditing(false)).catch(() => undefined)
              }}>
                <textarea aria-label={t('chat.editMessage')} value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)} maxLength={2000}
                  className="min-h-16 rounded-lg border border-border bg-surface p-2 text-sm text-ink" />
                {editMentionOptions.length > 0 ? <div role="listbox" aria-label={t('chat.mentionHint')}
                  className="max-h-32 overflow-y-auto rounded-lg border border-border bg-surface p-1 text-ink">
                  {editMentionOptions.map((option) => <button key={option.id} type="button" role="option"
                    aria-selected="false" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-cream"
                    onClick={() => {
                      setEditDraft((current) => current.replace(/@[^\s@]*$/, `@${option.label} `))
                      setEditMentions((current) => [...current.filter((item) => item.id !== option.id), option])
                    }}>@{option.label}</button>)}
                </div> : null}
                <div className="flex gap-2 text-xs">
                  <button type="submit" className="font-bold underline">{t('common.save')}</button>
                  <button type="button" onClick={() => setEditing(false)} className="underline">{t('common.cancel')}</button>
                </div>
              </form>
            ) : message.content ? (
              <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed">
                {message.content}
              </p>
            ) : null}
            {message.edited_at ? <span className="text-[10px] opacity-70">{t('chat.edited')}</span> : null}
          </div>
        </div>

        <div className={cn('flex flex-wrap items-center gap-1', isSelf ? 'justify-end' : '')}>
          {isSelf && onEdit && message.content && Date.now() - new Date(message.created_at).getTime() < 15 * 60_000 ? (
            <button type="button" onClick={() => {
              setEditDraft(message.content)
              const everyone = mentionCandidates.filter((item) => item.id !== 'all')
              setEditMentions(message.content.includes('@all') && everyone.length > 0
                && everyone.every((item) => mentionedUserIds.includes(item.id))
                ? [{ id: 'all', label: 'all' }]
                : everyone.filter((item) => mentionedUserIds.includes(item.id)))
              setEditing(true)
            }}
              aria-label={t('chat.editMessage')} className="rounded-full p-1 text-ink-muted hover:text-coral-600">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
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
        {isSelf && readers.length > 0 ? (
          <p className="text-[10px] text-ink-muted">{t('chat.readBy', { names: readers.join(', ') })}</p>
        ) : null}
      </div>
    </div>
  )
}
