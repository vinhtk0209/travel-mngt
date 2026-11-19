import { Check, Palette, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { TagPill } from '@/components/ui/tag-pill'
import {
  TAG_COLOR_PRESETS,
  getReadableTextColor,
  getTagColorStyle,
  normalizeHexColor,
  pickTagColor,
} from '@/utils/tags'
import { getErrorMessage } from '@/utils/errors'
import { cn } from '@/utils/cn'
import { useTheme } from '@/app/theme-provider'
import { useI18n } from '@/i18n/i18n-context'
import { useCreateTag, useDeleteTag, useUpdateTag } from '../hooks'
import type { Tag } from '../api'

type TagManagerProps = {
  tripId: string
  tags: Tag[]
  canEdit: boolean
}

export function TagManager({ tripId, tags, canEdit }: TagManagerProps) {
  const { t } = useI18n()
  const createTag = useCreateTag(tripId)
  const updateTag = useUpdateTag(tripId)
  const deleteTag = useDeleteTag(tripId)

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(() => pickTagColor(tags.length))
  const [editing, setEditing] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#FFD9C9')
  const [deleting, setDeleting] = useState<Tag | null>(null)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    try {
      await createTag.mutateAsync({ name, color: normalizeHexColor(newColor) })
      setNewName('')
      setNewColor(pickTagColor(tags.length + 1))
      toast.success(t('tags.created'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('tags.createError')))
    }
  }

  const startEditing = (tag: Tag) => {
    setEditing(tag)
    setEditName(tag.name)
    setEditColor(normalizeHexColor(tag.color))
  }

  const handleUpdate = async () => {
    if (!editing) return
    const name = editName.trim()
    if (!name) return
    try {
      await updateTag.mutateAsync({
        tagId: editing.id,
        name,
        color: normalizeHexColor(editColor),
      })
      setEditing(null)
      toast.success(t('tags.updated'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('tags.updateError')))
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTag.mutateAsync(deleting.id)
      setDeleting(null)
      toast.success(t('tags.deleted'))
    } catch (error) {
      toast.error(getErrorMessage(error, t('tags.deleteError')))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('tags.emptyManager')}</p>
        ) : (
          tags.map((tag) => (
            <span key={tag.id} className="group inline-flex items-center">
              <TagPill name={tag.name} color={tag.color} className="pr-1.5" />
              {canEdit ? (
                <span className="ml-1 inline-flex">
                  <button
                    type="button"
                    onClick={() => startEditing(tag)}
                    className="rounded-full p-1 text-ink-muted hover:bg-white hover:text-coral-600"
                    aria-label={t('places.editName', { name: tag.name })}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(tag)}
                    className="rounded-full p-1 text-ink-muted hover:bg-rose-50 hover:text-rose-500"
                    aria-label={t('places.deleteName', { name: tag.name })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ) : null}
            </span>
          ))
        )}
      </div>

      {editing ? (
        <div className="rounded-2xl border border-coral-200 bg-coral-50/50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-ink-soft">{t('tags.editing', { name: editing.name })}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                {t('tags.preview')}
              </span>
              <TagPill name={editName.trim() || t('tags.tagFallback')} color={editColor} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="h-9 flex-1"
              aria-label={t('tags.tagName')}
            />
            <ColorPicker
              value={editColor}
              onChange={setEditColor}
              label={t('tags.editColour')}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleUpdate()} isLoading={updateTag.isPending}>
                <Check className="h-3.5 w-3.5" /> {t('tags.save')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                <X className="h-3.5 w-3.5" /> {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <form
          onSubmit={(event) => void handleCreate(event)}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Palette className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={t('tags.newTagName')}
              className="pl-10"
              aria-label={t('tags.newTagName')}
            />
          </div>
          <ColorPicker value={newColor} onChange={setNewColor} label={t('tags.newColour')} />
          <Button
            type="submit"
            size="md"
            isLoading={createTag.isPending}
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={!newName.trim()}
          >
            {t('tags.add')}
          </Button>
        </form>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
        isLoading={deleteTag.isPending}
        title={t('places.deleteTagTitle')}
        confirmLabel={t('places.deleteTagButton')}
        description={<>{t('tags.deleteBody', { name: deleting?.name ?? '' })}</>}
      />
    </div>
  )
}

function ColorPicker({
  value,
  onChange,
  label = 'Tag colour',
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  const { t } = useI18n()
  const { resolved } = useTheme()
  const normalized = normalizeHexColor(value)
  const isPreset = TAG_COLOR_PRESETS.some((preset) => preset.value.toUpperCase() === normalized)

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {TAG_COLOR_PRESETS.map((preset) => {
        const selected = normalized === preset.value.toUpperCase()
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={cn(
              'relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 transition',
              selected
                ? 'scale-110 border-ink ring-2 ring-ink/30 ring-offset-2 ring-offset-cream'
                : 'border-white hover:scale-105',
            )}
            style={{ backgroundColor: preset.value }}
            aria-label={preset.label}
            aria-pressed={selected}
            title={preset.label}
          >
            {selected ? (
              <Check
                className="h-3.5 w-3.5"
                style={{ color: getReadableTextColor(preset.value) }}
                aria-hidden
              />
            ) : null}
          </button>
        )
      })}

      <label
        className="relative inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-ink/30 bg-surface"
        title={t('tags.customColour')}
        style={
          isPreset
            ? undefined
            : {
                backgroundColor: getTagColorStyle(normalized, resolved).backgroundColor,
                borderStyle: 'solid',
                borderColor: getTagColorStyle(normalized, resolved).borderColor,
              }
        }
      >
        <Palette
          className="pointer-events-none h-3.5 w-3.5"
          style={isPreset ? undefined : { color: getReadableTextColor(normalized) }}
          aria-hidden
        />
        <input
          type="color"
          value={normalized}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={`${label} ${t('tags.customColour')}`}
        />
      </label>
    </div>
  )
}
