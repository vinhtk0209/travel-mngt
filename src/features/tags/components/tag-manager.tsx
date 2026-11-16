import { Check, Palette, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { TagPill } from '@/components/ui/tag-pill'
import { TAG_COLOR_PRESETS, getTagColorStyle, pickTagColor } from '@/utils/tags'
import { getErrorMessage } from '@/utils/errors'
import { cn } from '@/utils/cn'
import { useCreateTag, useDeleteTag, useUpdateTag } from '../hooks'
import type { Tag } from '../api'

type TagManagerProps = {
  tripId: string
  tags: Tag[]
  canEdit: boolean
}

export function TagManager({ tripId, tags, canEdit }: TagManagerProps) {
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
      await createTag.mutateAsync({ name, color: newColor })
      setNewName('')
      setNewColor(pickTagColor(tags.length + 1))
      toast.success('Tag created')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not create the tag'))
    }
  }

  const startEditing = (tag: Tag) => {
    setEditing(tag)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const handleUpdate = async () => {
    if (!editing) return
    const name = editName.trim()
    if (!name) return
    try {
      await updateTag.mutateAsync({ tagId: editing.id, name, color: editColor })
      setEditing(null)
      toast.success('Tag updated')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the tag'))
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTag.mutateAsync(deleting.id)
      setDeleting(null)
      toast.success('Tag deleted')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not delete the tag'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-ink-muted">No tags yet. Add the first one below.</p>
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
                    aria-label={`Edit ${tag.name}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(tag)}
                    className="rounded-full p-1 text-ink-muted hover:bg-rose-50 hover:text-rose-500"
                    aria-label={`Delete ${tag.name}`}
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
          <p className="mb-2 text-xs font-bold text-ink-soft">Editing “{editing.name}”</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="h-9 flex-1"
              aria-label="Tag name"
            />
            <ColorPicker value={editColor} onChange={setEditColor} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleUpdate()} isLoading={updateTag.isPending}>
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <form onSubmit={(event) => void handleCreate(event)} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Palette className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New tag name"
              className="pl-10"
              aria-label="New tag name"
            />
          </div>
          <ColorPicker value={newColor} onChange={setNewColor} />
          <Button
            type="submit"
            size="md"
            isLoading={createTag.isPending}
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={!newName.trim()}
          >
            Add tag
          </Button>
        </form>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
        isLoading={deleteTag.isPending}
        title="Delete this tag?"
        confirmLabel="Delete tag"
        description={
          <>
            “{deleting?.name}” will be removed from every place in this trip. This cannot be undone.
          </>
        }
      />
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tag colour">
      {TAG_COLOR_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onChange(preset.value)}
          className={cn(
            'h-7 w-7 rounded-full border-2 transition',
            value.toUpperCase() === preset.value.toUpperCase()
              ? 'scale-110 border-ink/40'
              : 'border-white hover:scale-105',
          )}
          style={getTagColorStyle(preset.value)}
          aria-label={preset.label}
          aria-pressed={value.toUpperCase() === preset.value.toUpperCase()}
        />
      ))}
    </div>
  )
}
