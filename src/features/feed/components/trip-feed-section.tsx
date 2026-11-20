import { formatDistanceToNow } from 'date-fns'
import { ChevronDown, Heart, ImagePlus, Link2, MessageCircle, MoreHorizontal, Pin, Send, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { resolveAvatarUrl } from '@/features/avatars/api'
import { useAvatarUrls } from '@/features/avatars/hooks'
import { useSignedImageUrls } from '@/features/images/hooks'
import { useTripItems } from '@/features/trip-items/hooks'
import type { TripMemberWithProfile } from '@/features/trip-members/types'
import { useI18n } from '@/i18n/i18n-context'
import { getDateFnsLocale } from '@/utils/date'
import { getErrorMessage } from '@/utils/errors'
import { IMAGE_ACCEPT, validateImageFile } from '@/utils/image'
import { useFeedActions, useTripFeed } from '../hooks'
import type { FeedPost } from '../api'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'] as const

export function TripFeedSection({ tripId, members, userId, isOwner }: {
  tripId: string; members: TripMemberWithProfile[]; userId: string | undefined; isOwner: boolean
}) {
  const { t } = useI18n()
  const feed = useTripFeed(tripId)
  const actions = useFeedActions(tripId, userId)
  const places = useTripItems(tripId).data ?? []
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [tripItemId, setTripItemId] = useState('')
  const [error, setError] = useState('')
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [commentEditDraft, setCommentEditDraft] = useState('')
  const [menuPost, setMenuPost] = useState<string | null>(null)
  const [reactionPost, setReactionPost] = useState<string | null>(null)
  const paths = useMemo(() => (feed.data ?? []).flatMap((post) => post.images.map((image) => image.storage_path)), [feed.data])
  const { urls } = useSignedImageUrls(paths)
  const avatarUrls = useAvatarUrls(members.map((member) => member.profile?.avatar_url))
  const memberById = new Map(members.map((member) => [member.user_id, member]))
  const displayName = (id: string) => memberById.get(id)?.profile?.display_name ?? t('common.traveler')
  const avatar = (id: string) => resolveAvatarUrl(memberById.get(id)?.profile?.avatar_url, avatarUrls)
  const report = (cause: unknown) => setError(getErrorMessage(cause, t('feed.error')))

  const create = async () => {
    try {
      await actions.create.mutateAsync({ content, files, tripItemId: tripItemId || null })
      setContent(''); setFiles([]); setTripItemId(''); setError('')
    } catch (cause) { report(cause) }
  }
  const addFiles = (selected: FileList | null) => {
    if (!selected) return
    const next = [...files, ...Array.from(selected)]
    if (next.length > 10) { setError(t('feed.photoLimit')); return }
    const invalid = next.map(validateImageFile).find(Boolean)
    if (invalid) { setError(invalid); return }
    setFiles(next); setError('')
  }
  const submitComment = async (postId: string) => {
    const text = commentDraft[postId]?.trim()
    if (!text) return
    try {
      await actions.comment.mutateAsync({ postId, content: text, parentCommentId: replyTo })
      setCommentDraft((current) => ({ ...current, [postId]: '' })); setReplyTo(null); setError('')
    } catch (cause) { report(cause) }
  }
  const react = async (post: FeedPost, emoji: string) => {
    try {
      await actions.react.mutateAsync({ postId: post.id, emoji,
        current: post.reactions.find((reaction) => reaction.user_id === userId)?.emoji })
      setReactionPost(null)
    } catch (cause) { report(cause) }
  }

  return <section className="space-y-5">
    <div><h2 className="font-display text-2xl font-extrabold">{t('feed.title')}</h2>
      <p className="text-sm text-ink-soft">{t('feed.description')}</p></div>
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    <div className="surface-card space-y-3 p-5">
      <textarea aria-label={t('feed.write')} placeholder={t('feed.write')} value={content}
        onChange={(event) => setContent(event.target.value)} maxLength={5000} rows={3}
        className="w-full resize-y rounded-2xl border border-border bg-surface p-3 text-sm text-ink placeholder:text-ink-muted" />
      {files.length ? <div className="flex flex-wrap gap-2">{files.map((file, index) =>
        <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-cream px-3 py-1 text-xs text-ink">
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} aria-label={t('feed.removePhoto')}><X className="h-3 w-3" /></button>
        </span>)}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-ink-soft hover:bg-cream">
          <ImagePlus className="h-4 w-4" />{t('feed.photos')}
          <input type="file" accept={IMAGE_ACCEPT} multiple className="sr-only" aria-label={t('feed.photos')}
            onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
        </label>
        <label className="relative inline-flex min-w-0 max-w-56 items-center">
        <Link2 className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-ink-muted" />
        <select value={tripItemId} onChange={(event) => setTripItemId(event.target.value)}
          aria-label={t('feed.linkPlace')} className="min-w-0 max-w-56 appearance-none rounded-full border border-border bg-surface py-2 pl-8 pr-8 text-xs text-ink">
          <option value="">{t('feed.noPlace')}</option>
          {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-ink-muted" />
        </label>
        <Button size="sm" className="ml-auto" onClick={() => void create()}
          disabled={(!content.trim() && !files.length) || !userId} isLoading={actions.create.isPending}>
          <Send className="h-4 w-4" />{t('feed.publish')}
        </Button>
      </div>
    </div>
    {feed.isError ? <ErrorState title={t('feed.error')} message={t('feed.loadError')} onRetry={() => void feed.refetch()} /> : null}
    {feed.isLoading ? <p className="text-sm text-ink-muted">{t('feed.loading')}</p> : null}
    {feed.data?.length === 0 ? <p className="surface-card p-6 text-center text-sm text-ink-muted">{t('feed.empty')}</p> : null}
    {(feed.data ?? []).map((post) => <article key={post.id} className="surface-card p-5">
      <div className="flex items-start gap-3">
        <Avatar name={displayName(post.author_id)} src={avatar(post.author_id)} size="sm" />
        <div className="min-w-0 flex-1"><p className="font-bold text-ink">{displayName(post.author_id)}</p>
          <p className="text-xs text-ink-muted">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: getDateFnsLocale() })}
            {post.pinned ? ` · ${t('feed.pinned')}` : ''}</p></div>
        {(post.author_id === userId || isOwner) ? <div className="relative">
          <button type="button" aria-label={t('feed.options')} onClick={() => setMenuPost(menuPost === post.id ? null : post.id)}
            className="rounded-full p-2 text-ink-muted hover:bg-cream"><MoreHorizontal className="h-4 w-4" /></button>
          {menuPost === post.id ? <div className="absolute right-0 top-full z-10 w-40 rounded-xl border border-border bg-surface p-1 shadow-lift">
            {post.author_id === userId ? <button type="button" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => { setEditingPost(post.id); setEditContent(post.content); setMenuPost(null) }}>{t('feed.edit')}</button> : null}
            {isOwner ? <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-cream" onClick={() => { void actions.pin.mutateAsync({ postId: post.id, pinned: !post.pinned }).catch(report); setMenuPost(null) }}><Pin className="h-3 w-3" />{post.pinned ? t('feed.unpin') : t('feed.pin')}</button> : null}
            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50" onClick={() => { if (window.confirm(t('feed.deleteConfirm'))) void actions.remove.mutateAsync(post).catch(report); setMenuPost(null) }}><Trash2 className="h-3 w-3" />{t('feed.delete')}</button>
          </div> : null}
        </div> : null}
      </div>
      {editingPost === post.id ? <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void actions.update.mutateAsync({ postId: post.id, content: editContent, tripItemId: post.trip_item_id }).then(() => setEditingPost(null)).catch(report) }}>
        <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} maxLength={5000} aria-label={t('feed.edit')} className="w-full rounded-xl border border-border bg-surface p-2 text-sm text-ink" />
        <Button size="sm" type="submit">{t('common.save')}</Button> <Button size="sm" variant="ghost" onClick={() => setEditingPost(null)}>{t('common.cancel')}</Button>
      </form> : post.content ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{post.content}</p> : null}
      {post.trip_item_id ? <p className="mt-2 text-xs font-bold text-coral-600">📍 {places.find((place) => place.id === post.trip_item_id)?.name ?? t('feed.linkedPlace')}</p> : null}
      {post.images.length ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{post.images.map((image) => urls[image.storage_path] ?
        <a key={image.id} href={urls[image.storage_path]} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-cream">
          <img src={urls[image.storage_path]} alt={image.file_name} loading="lazy" className="aspect-square w-full object-cover" />
        </a> : null)}</div> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <div className="relative"><button type="button" onClick={() => setReactionPost(reactionPost === post.id ? null : post.id)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-ink-soft hover:bg-cream"><Heart className="h-4 w-4" />{t('feed.react')}</button>
          {reactionPost === post.id ? <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border border-border bg-surface p-1 shadow-lift">
            {REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => void react(post, emoji)} className="rounded-full p-1 text-lg hover:bg-cream" aria-label={emoji}>{emoji}</button>)}
          </div> : null}</div>
        {REACTIONS.map((emoji) => { const count = post.reactions.filter((reaction) => reaction.emoji === emoji).length
          return count ? <button key={emoji} type="button" onClick={() => void react(post, emoji)} className="rounded-full bg-cream px-2 py-1 text-xs text-ink">{emoji} {count}</button> : null })}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted"><MessageCircle className="h-4 w-4" />{post.comments.length}</span>
      </div>
      <div className="mt-3 space-y-2">{post.comments.filter((comment) => !comment.parent_comment_id).map((comment) =>
        <div key={comment.id}><CommentRow comment={comment} name={displayName(comment.author_id)} avatarUrl={avatar(comment.author_id)}
          canManage={comment.author_id === userId || isOwner} canEdit={comment.author_id === userId}
          editing={editingComment === comment.id} editDraft={commentEditDraft} onEditDraft={setCommentEditDraft}
          onStartEdit={() => { setEditingComment(comment.id); setCommentEditDraft(comment.content) }}
          onSave={() => void actions.editComment.mutateAsync({ commentId: comment.id, content: commentEditDraft }).then(() => setEditingComment(null)).catch(report)}
          onCancel={() => setEditingComment(null)} onDelete={() => void actions.removeComment.mutateAsync(comment.id).catch(report)}
          onReply={() => setReplyTo(comment.id)} />
          {post.comments.filter((reply) => reply.parent_comment_id === comment.id).map((reply) =>
            <div key={reply.id} className="ml-8 mt-2"><CommentRow comment={reply} name={displayName(reply.author_id)} avatarUrl={avatar(reply.author_id)}
              canManage={reply.author_id === userId || isOwner} canEdit={reply.author_id === userId}
              editing={editingComment === reply.id} editDraft={commentEditDraft} onEditDraft={setCommentEditDraft}
              onStartEdit={() => { setEditingComment(reply.id); setCommentEditDraft(reply.content) }}
              onSave={() => void actions.editComment.mutateAsync({ commentId: reply.id, content: commentEditDraft }).then(() => setEditingComment(null)).catch(report)}
              onCancel={() => setEditingComment(null)} onDelete={() => void actions.removeComment.mutateAsync(reply.id).catch(report)} />
            </div>)}
        </div>)}
      </div>
      {replyTo && post.comments.some((comment) => comment.id === replyTo) ? <p className="mt-2 text-xs text-ink-muted">{t('feed.replying')} <button type="button" onClick={() => setReplyTo(null)} className="underline">{t('common.cancel')}</button></p> : null}
      <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void submitComment(post.id) }}>
        <input value={commentDraft[post.id] ?? ''} onChange={(event) => setCommentDraft((current) => ({ ...current, [post.id]: event.target.value }))}
          maxLength={2000} aria-label={t('feed.comment')} placeholder={t('feed.comment')}
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink" />
        <Button size="icon" type="submit" disabled={!commentDraft[post.id]?.trim()} aria-label={t('feed.comment')}><Send className="h-4 w-4" /></Button>
      </form>
    </article>)}
  </section>
}

function CommentRow({ comment, name, avatarUrl, canManage, canEdit, editing, editDraft, onEditDraft,
  onStartEdit, onSave, onCancel, onDelete, onReply }: {
  comment: FeedPost['comments'][number]; name: string; avatarUrl?: string; canManage: boolean; canEdit: boolean
  editing: boolean; editDraft: string; onEditDraft: (value: string) => void
  onStartEdit: () => void; onSave: () => void; onCancel: () => void; onDelete: () => void; onReply?: () => void
}) {
  const { t } = useI18n()
  return <div className="flex items-start gap-2">
    <Avatar name={name} src={avatarUrl} size="sm" />
    <div className="min-w-0 flex-1 rounded-2xl bg-cream p-3">
      <p className="text-xs font-bold text-ink">{name} <span className="font-normal text-ink-muted">· {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: getDateFnsLocale() })}</span></p>
      {editing ? <><input value={editDraft} onChange={(event) => onEditDraft(event.target.value)} maxLength={2000} aria-label={t('feed.editComment')}
        className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm text-ink" />
        <button type="button" onClick={onSave} className="mr-2 text-xs font-bold underline">{t('common.save')}</button>
        <button type="button" onClick={onCancel} className="text-xs underline">{t('common.cancel')}</button></>
        : <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{comment.content}</p>}
      <div className="mt-1 flex gap-3 text-xs text-ink-muted">
        {onReply ? <button type="button" onClick={onReply}>{t('feed.reply')}</button> : null}
        {canEdit ? <button type="button" onClick={onStartEdit}>{t('feed.edit')}</button> : null}
        {canManage ? <button type="button" onClick={onDelete} className="text-rose-600">{t('feed.delete')}</button> : null}
      </div>
    </div>
  </div>
}
