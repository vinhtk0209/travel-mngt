import { AlertCircle, Bell, BellOff, Eye, ImagePlus, MessageCircle, Send, Smile, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveAvatarUrl } from '@/features/avatars/api'
import { useAvatarUrls } from '@/features/avatars/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TripMemberWithProfile } from '@/features/trip-members/types'
import { useSignedImageUrls } from '@/features/images/hooks'
import type { ChatBackground } from '@/lib/supabase/database.types'
import { getErrorMessage } from '@/utils/errors'
import { IMAGE_ACCEPT, validateImageFile } from '@/utils/image'
import { useI18n } from '@/i18n/i18n-context'
import { cn } from '@/utils/cn'
import { getChatBackgroundStyle } from '../background'
import {
  useSendTripMessage,
  useEditTripMessage,
  useMarkTripChatRead,
  useSetTripChatNotifications,
  useTripChatReads,
  useToggleTripMessageReaction,
  useTripChatRealtime,
  useTripMessageAttachments,
  useTripMessageReactions,
  useTripMessageMentions,
  useTripMessages,
} from '../hooks'
import type { TripMessageReaction } from '../utils'
import { ChatBackgroundPicker } from './chat-background-picker'
import { ChatMessage } from './chat-message'
import { useTripTyping } from '../typing'

type TripChatSectionProps = {
  tripId: string
  members: TripMemberWithProfile[]
  currentUserId: string | undefined
  canSend: boolean
  canCustomize: boolean
  chatBackground: ChatBackground
  chatBackgroundPath: string | null
}

const COMPOSER_EMOJIS = [
  '😀',
  '😂',
  '🥰',
  '😎',
  '🤔',
  '😭',
  '😍',
  '🎉',
  '👍',
  '❤️',
  '🔥',
  '✈️',
  '🌴',
  '🍜',
  '☕',
  '🏖️',
  '🗺️',
  '📸',
  '🎒',
  '🌞',
  '🍻',
  '🥳',
  '😴',
  '🙌',
]

export function TripChatSection({
  tripId,
  members,
  currentUserId,
  canSend,
  canCustomize,
  chatBackground,
  chatBackgroundPath,
}: TripChatSectionProps) {
  const { t } = useI18n()
  const messagesQuery = useTripMessages(tripId)
  const messages = messagesQuery.data ?? []
  const messageIds = useMemo(() => messages.map((message) => message.id), [messages])
  const attachmentsQuery = useTripMessageAttachments(tripId, messageIds)
  const reactionsQuery = useTripMessageReactions(tripId, messageIds)
  const mentionsQuery = useTripMessageMentions(tripId, messageIds)
  const sendMessage = useSendTripMessage(tripId, currentUserId)
  const editMessage = useEditTripMessage(tripId)
  const readsQuery = useTripChatReads(tripId)
  const markRead = useMarkTripChatRead(tripId, currentUserId)
  const notifications = useSetTripChatNotifications(tripId, currentUserId)
  const { typingIds, signalTyping, stopTyping } = useTripTyping(tripId, currentUserId)
  const toggleReaction = useToggleTripMessageReaction(tripId, currentUserId)
  useTripChatRealtime(tripId)

  const [draft, setDraft] = useState('')
  const [selectedMentions, setSelectedMentions] = useState<{ id: string; label: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMarkedRef = useRef('')

  const avatarUrls = useAvatarUrls(members.map((member) => member.profile?.avatar_url))
  const memberById = new Map(members.map((member) => [member.user_id, member]))
  const mentionCandidates = [{ id: 'all', label: 'all' }, ...members
    .filter((member) => member.user_id !== currentUserId)
    .map((member) => ({ id: member.user_id, label: member.profile?.display_name ?? t('common.traveler') }))]
  const myRead = (readsQuery.data ?? []).find((read) => read.user_id === currentUserId)
  const mentionMatch = draft.match(/(?:^|\s)@([^\s@]*)$/)
  const mentionOptions = mentionMatch
    ? mentionCandidates.filter((option) => option.label.toLowerCase().includes(mentionMatch[1].toLowerCase()))
    : []
  const attachmentByMessage = new Map(
    (attachmentsQuery.data ?? []).map((attachment) => [attachment.message_id, attachment]),
  )
  const reactionByMessage = new Map<string, TripMessageReaction[]>()
  for (const reaction of reactionsQuery.data ?? []) {
    const list = reactionByMessage.get(reaction.message_id)
    if (list) list.push(reaction)
    else reactionByMessage.set(reaction.message_id, [reaction])
  }

  const { urls: attachmentUrls } = useSignedImageUrls(
    (attachmentsQuery.data ?? []).map((attachment) => attachment.storage_path),
  )
  const { urls: backgroundUrls } = useSignedImageUrls([chatBackgroundPath])
  const backgroundStyle = getChatBackgroundStyle(
    chatBackground,
    chatBackgroundPath ? backgroundUrls[chatBackgroundPath] : undefined,
  )

  useEffect(() => {
    if (!file) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages.length, attachmentsQuery.data?.length])

  useEffect(() => {
    const root = listRef.current
    if (!root || !currentUserId || messages.length === 0) return
    const byId = new Map(messages.map((message) => [message.id, message]))
    const observer = new IntersectionObserver((entries) => {
      if (document.visibilityState !== 'visible') return
      const visible = entries.filter((entry) => entry.isIntersecting)
        .map((entry) => byId.get((entry.target as HTMLElement).dataset.chatMessage ?? ''))
        .filter((message): message is (typeof messages)[number] => Boolean(message))
      const newest = visible.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      if (newest && newest.created_at > lastMarkedRef.current) {
        lastMarkedRef.current = newest.created_at
        markRead.mutate(newest.created_at)
      }
    }, { root, threshold: 0.5 })
    root.querySelectorAll('[data-chat-message]').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [messages, currentUserId, markRead.mutate])

  const submit = async () => {
    const content = draft.trim()
    if ((!content && !file) || sendMessage.isPending) return
    setError(null)
    try {
      const mentionIds = selectedMentions.filter((item) => content.includes(`@${item.label}`))
        .flatMap((item) => item.id === 'all'
          ? members.filter((member) => member.user_id !== currentUserId).map((member) => member.user_id)
          : [item.id])
      await sendMessage.mutateAsync({ content, file, mentionIds })
      stopTyping()
      setDraft('')
      setSelectedMentions([])
      setFile(null)
      setEmojiOpen(false)
    } catch (sendError) {
      setError(getErrorMessage(sendError, t('chat.sendError')))
    }
  }

  const handleFile = (selected: File | undefined) => {
    if (!selected) return
    const invalid = validateImageFile(selected)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    setFile(selected)
  }

  const react = (input: { messageId: string; emoji: string; currentEmoji?: string }) => {
    setError(null)
    toggleReaction.mutate(input, {
      onError: (reactionError) => {
        setError(getErrorMessage(reactionError, t('chat.reactionError')))
      },
    })
  }

  const addEmoji = (emoji: string) => {
    setDraft((current) => `${current}${emoji}`)
    setEmojiOpen(false)
    textareaRef.current?.focus()
  }

  const selectMention = (option: { id: string; label: string }) => {
    setDraft((current) => current.replace(/@[^\s@]*$/, `@${option.label} `))
    setSelectedMentions((current) => [...current.filter((item) => item.id !== option.id), option])
    textareaRef.current?.focus()
  }

  const typingNames = typingIds.map((id) => memberById.get(id)?.profile?.display_name ?? t('common.traveler'))

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
        <div className="flex flex-wrap items-center gap-2">
          {canCustomize ? (
            <ChatBackgroundPicker
              tripId={tripId}
              currentPreset={chatBackground}
              currentPath={chatBackgroundPath}
              hasImage={Boolean(chatBackgroundPath)}
            />
          ) : null}
          {canSend ? (
            <button type="button" onClick={() => notifications.mutate(!(myRead?.notifications_enabled ?? true))}
              aria-label={t(myRead?.notifications_enabled === false ? 'chat.notificationsOff' : 'chat.notificationsOn')}
              title={t(myRead?.notifications_enabled === false ? 'chat.notificationsOff' : 'chat.notificationsOn')}
              className="rounded-full p-2 text-ink-muted hover:bg-cream">
              {myRead?.notifications_enabled === false ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </button>
          ) : null}
          <Badge
            variant="mint"
            icon={<span className="h-1.5 w-1.5 rounded-full bg-mint-500" />}
          >
            {t('chat.live')}
          </Badge>
        </div>
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
        data-testid="trip-chat-scroll"
        style={backgroundStyle}
        className={cn(
          'scrollbar-thin max-h-96 min-h-32 space-y-3 overflow-y-auto rounded-2xl border border-border/60 p-3 transition-colors',
          !backgroundStyle && 'bg-white/50',
        )}
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
            <p className="text-xs text-ink-muted">{t('chat.emptyBody')}</p>
          </div>
        ) : (
          messages.map((message) => {
            const sender = memberById.get(message.sender_id)
            const attachment = attachmentByMessage.get(message.id)
            return (
              <ChatMessage
                key={message.id}
                message={message}
                attachment={attachment}
                attachmentUrl={
                  attachment ? attachmentUrls[attachment.storage_path] : undefined
                }
                senderName={sender?.profile?.display_name ?? t('common.traveler')}
                senderAvatarUrl={resolveAvatarUrl(sender?.profile?.avatar_url, avatarUrls)}
                isSelf={message.sender_id === currentUserId}
                currentUserId={currentUserId}
                reactions={reactionByMessage.get(message.id) ?? []}
                canReact={canSend}
                readers={(readsQuery.data ?? []).filter((read) => read.user_id !== message.sender_id && read.last_read_at >= message.created_at)
                  .map((read) => memberById.get(read.user_id)?.profile?.display_name ?? t('common.traveler'))}
                mentionCandidates={mentionCandidates}
                mentionedUserIds={(mentionsQuery.data ?? []).filter((mention) => mention.message_id === message.id).map((mention) => mention.user_id)}
                onEdit={message.sender_id === currentUserId ? async ({ messageId, content, mentionIds }) => {
                  try { await editMessage.mutateAsync({ messageId, content, mentionIds }) }
                  catch (editError) { setError(getErrorMessage(editError, t('chat.sendError'))); throw editError }
                } : undefined}
                onReact={react}
              />
            )
          })
        )}
      </div>

      {typingNames.length > 0 ? <p role="status" className="mt-2 text-xs text-ink-muted">{t('chat.typing', { names: typingNames.join(', ') })}</p> : null}

      {canSend ? (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          {file ? (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-border/70 bg-cream/60 p-2">
              {filePreview ? (
                <img
                  src={filePreview}
                  alt={t('chat.attachmentPreview')}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white">
                  <ImagePlus className="h-5 w-5 text-ink-muted" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink">{file.name}</p>
                <p className="text-[11px] text-ink-muted">{t('chat.memeHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label={t('chat.removeAttachment')}
                className="rounded-full p-2 text-ink-muted transition hover:bg-white hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="relative flex items-end gap-2">
            {mentionOptions.length > 0 ? (
              <div role="listbox" aria-label={t('chat.mentionHint')} className="absolute bottom-full left-10 z-20 mb-2 max-h-44 w-56 overflow-y-auto rounded-2xl border border-border bg-surface p-1 shadow-lift">
                {mentionOptions.map((option) => <button key={option.id} type="button" role="option" aria-selected="false"
                  onClick={() => selectMention(option)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-cream">
                  @{option.label}{option.id === 'all' ? ` · ${t('chat.mentionEveryone')}` : ''}
                </button>)}
              </div>
            ) : null}
            <div className="relative">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setEmojiOpen((value) => !value)}
                aria-label={t('chat.emojiPicker')}
                aria-expanded={emojiOpen}
              >
                <Smile className="h-4 w-4" />
              </Button>
              {emojiOpen ? (
                <div
                  role="group"
                  aria-label={t('chat.emojiTitle')}
                  className="absolute bottom-12 left-0 z-10 grid w-56 grid-cols-6 gap-1 rounded-2xl border border-border bg-surface p-2 shadow-lift"
                >
                  {COMPOSER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="rounded-lg p-1 text-lg leading-none transition hover:bg-cream"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <textarea
              ref={textareaRef}
              aria-label={t('chat.messageLabel')}
              value={draft}
              onChange={(event) => { setDraft(event.target.value); signalTyping() }}
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

            <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-white/80 text-ink-soft transition hover:border-coral-200 hover:bg-coral-50 hover:text-coral-600">
              <ImagePlus className="h-4 w-4" />
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  event.target.value = ''
                  handleFile(selected)
                }}
                aria-label={t('chat.attachImage')}
                title={t('chat.attachImage')}
              />
            </label>

            <Button
              type="submit"
              size="icon"
              disabled={(!draft.trim() && !file) || sendMessage.isPending}
              isLoading={sendMessage.isPending}
              aria-label={t('chat.send')}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
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
