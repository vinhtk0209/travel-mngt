import { Plus, Tag as TagIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagPill } from '@/components/ui/tag-pill'
import { useCreateTag } from '../hooks'
import type { Tag } from '../api'
import { getErrorMessage } from '@/utils/errors'
import { pickTagColor } from '@/utils/tags'

type TagMultiSelectProps = {
  tripId: string
  tags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  canEdit: boolean
}

export function TagMultiSelect({
  tripId,
  tags,
  selectedIds,
  onChange,
  canEdit,
}: TagMultiSelectProps) {
  const createTag = useCreateTag(tripId)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')

  const toggle = (tagId: string) => {
    onChange(
      selectedIds.includes(tagId)
        ? selectedIds.filter((id) => id !== tagId)
        : [...selectedIds, tagId],
    )
  }

  const handleCreate = async () => {
    const cleanName = name.trim()
    if (!cleanName) return
    try {
      const tag = await createTag.mutateAsync({
        name: cleanName,
        color: pickTagColor(tags.length),
      })
      onChange([...selectedIds, tag.id])
      setName('')
      setIsCreating(false)
      toast.success('Tag created')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not create the tag'))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`rounded-full transition ${selected ? 'ring-2 ring-ink/20' : 'opacity-70 hover:opacity-100'}`}
              aria-pressed={selected}
            >
              <TagPill name={tag.name} color={tag.color} />
            </button>
          )
        })}

        {canEdit && !isCreating ? (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-coral-300 px-2.5 py-1 text-xs font-bold text-coral-600 hover:bg-coral-50"
          >
            <Plus className="h-3 w-3" /> New tag
          </button>
        ) : null}
      </div>

      {isCreating ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <TagIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-coral-400" />
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleCreate()
                }
              }}
              placeholder="Tag name"
              className="h-9 pl-8 text-sm"
              aria-label="New tag name"
            />
          </div>
          <Button
            type="button"
            size="sm"
            isLoading={createTag.isPending}
            disabled={!name.trim()}
            onClick={() => void handleCreate()}
          >
            Add
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  )
}
