import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import {
  Check,
  ExternalLink,
  GripVertical,
  ImageIcon,
  MapPin,
  MapPinned,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { TagPill } from '@/components/ui/tag-pill'
import { resolveGoogleMapsUrl } from '@/services/google-maps'
import { cn } from '@/utils/cn'
import type { TripItemWithMeta } from '../api'

export type PlaceViewProps = {
  item: TripItemWithMeta
  imageUrls: Record<string, string>
  canEdit: boolean
  isToggling?: boolean
  dragHandle?: ReactNode
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onOpenGallery: (item: TripItemWithMeta, index: number) => void
}

function CompletionToggle({
  completed,
  disabled,
  isBusy,
  onToggle,
}: {
  completed: boolean
  disabled: boolean
  isBusy?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || isBusy}
      aria-label={completed ? 'Mark as not done' : 'Mark as completed'}
      aria-pressed={completed}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition',
        completed
          ? 'border-mint-400 bg-mint-400 text-white'
          : 'border-coral-200 bg-white text-transparent hover:border-mint-300',
        disabled ? 'cursor-default opacity-80' : 'cursor-pointer',
        isBusy && 'animate-pulse',
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  )
}

function PlaceActions({ item, canEdit, onEdit, onDelete }: Pick<PlaceViewProps, 'item' | 'canEdit' | 'onEdit' | 'onDelete'>) {
  const mapsUrl = resolveGoogleMapsUrl(item)

  return (
    <div className="flex items-center gap-1">
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full p-2 text-ink-muted transition hover:bg-mint-50 hover:text-mint-600"
          aria-label={`Open ${item.name} in Google Maps`}
          title="Open in Google Maps"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : null}
      {canEdit ? (
        <>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full p-2 text-ink-muted transition hover:bg-coral-50 hover:text-coral-600"
            aria-label={`Edit ${item.name}`}
            title="Edit place"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full p-2 text-ink-muted transition hover:bg-rose-50 hover:text-rose-500"
            aria-label={`Delete ${item.name}`}
            title="Delete place"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      ) : null}
    </div>
  )
}

function Tags({ item, className }: { item: TripItemWithMeta; className?: string }) {
  if (item.tags.length === 0) return null
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {item.tags.map((tag) => (
        <TagPill key={tag.id} name={tag.name} color={tag.color} />
      ))}
    </div>
  )
}

export function PlaceListRow({
  item,
  imageUrls,
  canEdit,
  isToggling,
  dragHandle,
  onToggle,
  onEdit,
  onDelete,
  onOpenGallery,
}: PlaceViewProps) {
  const completed = item.status === 'completed'
  const firstImage = item.images[0]
  const imageUrl = firstImage ? imageUrls[firstImage.storage_path] : undefined

  return (
    <div className="surface-card flex gap-3 p-3 transition hover:shadow-lift sm:items-center sm:gap-4 sm:p-4">
      {dragHandle}
      <CompletionToggle
        completed={completed}
        disabled={!canEdit}
        isBusy={isToggling}
        onToggle={onToggle}
      />

      <button
        type="button"
        onClick={() => onOpenGallery(item, 0)}
        disabled={item.images.length === 0}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl cover-fallback sm:h-20 sm:w-20"
        aria-label={item.images.length > 0 ? `Preview photos of ${item.name}` : undefined}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink/40">
            <ImageIcon className="h-5 w-5" />
          </span>
        )}
        {item.images.length > 1 ? (
          <span className="absolute bottom-1 right-1 rounded-full bg-ink/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            +{item.images.length - 1}
          </span>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              className={cn(
                'truncate font-bold leading-snug text-ink',
                completed && 'text-ink-muted line-through',
              )}
            >
              {item.name}
            </h3>
            {item.address ? (
              <p className="mt-0.5 flex items-start gap-1 text-xs text-ink-muted">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="line-clamp-2">{item.address}</span>
              </p>
            ) : null}
          </div>
          <div className="hidden sm:block">
            <PlaceActions item={item} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>

        <Tags item={item} className="mt-2" />

        {item.notes ? (
          <p className="mt-1.5 line-clamp-1 text-xs text-ink-muted">{item.notes}</p>
        ) : null}

        <div className="mt-1 flex items-center justify-between sm:hidden">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              completed ? 'bg-mint-100 text-mint-600' : 'bg-coral-100 text-coral-600',
            )}
          >
            {completed ? 'Completed' : 'To do'}
          </span>
          <PlaceActions item={item} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      <span
        className={cn(
          'hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide sm:inline-flex',
          completed ? 'bg-mint-100 text-mint-600' : 'bg-coral-100 text-coral-600',
        )}
      >
        {completed ? 'Done' : 'To do'}
      </span>
    </div>
  )
}

export function PlaceCard({
  item,
  imageUrls,
  canEdit,
  isToggling,
  dragHandle,
  onToggle,
  onEdit,
  onDelete,
  onOpenGallery,
}: PlaceViewProps) {
  const completed = item.status === 'completed'
  const firstImage = item.images[0]
  const imageUrl = firstImage ? imageUrls[firstImage.storage_path] : undefined

  return (
    <div className="surface-card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative h-36 w-full cover-fallback">
        <button
          type="button"
          onClick={() => onOpenGallery(item, 0)}
          disabled={item.images.length === 0}
          className="h-full w-full"
          aria-label={item.images.length > 0 ? `Preview photos of ${item.name}` : undefined}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-ink/35">
              <MapPinned className="h-8 w-8" />
            </span>
          )}
        </button>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <CompletionToggle
            completed={completed}
            disabled={!canEdit}
            isBusy={isToggling}
            onToggle={onToggle}
          />
          {dragHandle}
        </div>
        {item.images.length > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white">
            {item.images.length} photos
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3
            className={cn(
              'line-clamp-1 font-display text-lg font-extrabold leading-tight',
              completed && 'text-ink-muted line-through',
            )}
          >
            {item.name}
          </h3>
          <p className="mt-0.5 flex items-start gap-1 text-xs text-ink-muted">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{item.address || 'No address yet'}</span>
          </p>
        </div>

        <Tags item={item} />

        {item.notes ? (
          <p className="line-clamp-2 text-xs text-ink-muted">{item.notes}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
              completed ? 'bg-mint-100 text-mint-600' : 'bg-coral-100 text-coral-600',
            )}
          >
            {completed ? 'Completed' : 'To do'}
          </span>
          <PlaceActions item={item} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </div>
  )
}

export function DragHandle({
  setActivatorNodeRef,
  attributes,
  listeners,
  className,
}: {
  setActivatorNodeRef: (node: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  className?: string
}) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab touch-none rounded-full p-1.5 text-ink-muted transition hover:bg-cream hover:text-ink active:cursor-grabbing',
        className,
      )}
      aria-label="Drag to reorder"
      title="Drag to reorder"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
}
