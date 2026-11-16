import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CheckCircle2, Eye, MapPin, Plus, Search, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { PlaceSkeleton } from '@/components/ui/skeleton'
import { TagPill } from '@/components/ui/tag-pill'
import { ViewToggle, type ViewMode } from '@/components/shared/view-toggle'
import { ImageLightbox, type LightboxImage } from '@/features/images/components/image-lightbox'
import { useSignedImageUrls } from '@/features/images/hooks'
import { useTripTags } from '@/features/tags/hooks'
import { useDeletePlace, useReorderPlaces, useTogglePlace, useTripItems } from '../hooks'
import type { TripItemWithMeta } from '../api'
import { PlaceFormModal } from './place-form-modal'
import { SortablePlaceCard, SortablePlaceRow } from './sortable-places'

type StatusFilter = 'all' | 'todo' | 'completed'

type TripPlacesSectionProps = {
  tripId: string
  canEdit: boolean
}

export function TripPlacesSection({ tripId, canEdit }: TripPlacesSectionProps) {
  const itemsQuery = useTripItems(tripId)
  const tagsQuery = useTripTags(tripId)
  const togglePlace = useTogglePlace(tripId)
  const deletePlace = useDeletePlace(tripId)
  const reorderPlaces = useReorderPlaces(tripId)

  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TripItemWithMeta | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TripItemWithMeta | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null)

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data])
  const tags = tagsQuery.data ?? []

  const imagePaths = useMemo(
    () => items.flatMap((item) => item.images.map((image) => image.storage_path)),
    [items],
  )
  const { urls: imageUrls } = useSignedImageUrls(imagePaths)

  const completedCount = items.filter((item) => item.status === 'completed').length
  const percent = items.length > 0 ? (completedCount / items.length) * 100 : 0

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (tagFilter.length > 0 && !item.tags.some((tag) => tagFilter.includes(tag.id))) {
        return false
      }
      if (!query) return true
      return (
        item.name.toLowerCase().includes(query) ||
        (item.address ?? '').toLowerCase().includes(query) ||
        (item.notes ?? '').toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.name.toLowerCase().includes(query))
      )
    })
  }, [items, search, statusFilter, tagFilter])

  const isFiltering = search.trim().length > 0 || statusFilter !== 'all' || tagFilter.length > 0
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const openCreate = () => {
    setEditingItem(null)
    setFormOpen(true)
  }

  const openEdit = (item: TripItemWithMeta) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const openGallery = (item: TripItemWithMeta, index: number) => {
    const images = item.images
      .map((image) => ({
        url: imageUrls[image.storage_path],
        alt: item.name,
      }))
      .filter((image): image is LightboxImage => Boolean(image.url))

    if (images.length === 0) return
    setLightbox({ images, index: Math.min(index, images.length - 1) })
  }

  const handleToggle = async (item: TripItemWithMeta) => {
    if (!canEdit) return
    setTogglingId(item.id)
    try {
      await togglePlace.mutateAsync({
        itemId: item.id,
        status: item.status === 'completed' ? 'todo' : 'completed',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deletePlace.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (isFiltering) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    reorderPlaces.mutate(reordered.map((item) => item.id))
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTagFilter([])
  }

  const toggleTagFilter = (tagId: string) => {
    setTagFilter((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    )
  }

  const sortableDisabled = isFiltering || !canEdit || items.length < 2

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Places & plans</h2>
            <Badge variant="neutral">{items.length} places</Badge>
            {!canEdit ? (
              <Badge variant="sky" icon={<Eye className="h-3 w-3" />}>
                View only
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Every stop, snack and photo moment in one list.
          </p>
        </div>
        {canEdit ? (
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Add place
          </Button>
        ) : null}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-coral-500">
              Trip progress
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold">
              {completedCount}
              <span className="text-ink-muted"> / {items.length} completed</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && completedCount === items.length ? (
              <Sparkles className="h-5 w-5 text-mint-500" />
            ) : null}
            <span className="font-display text-3xl font-extrabold text-coral-500">
              {Math.round(percent)}%
            </span>
          </div>
        </div>
        <Progress value={percent} className="mt-3" label="Trip completion" />
      </div>

      <div className="surface-card space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search places, notes or tags…"
              className="pl-10"
              aria-label="Search places"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 p-1"
              role="group"
              aria-label="Filter by status"
            >
              {(
                [
                  { value: 'all', label: 'All' },
                  { value: 'todo', label: 'To do' },
                  { value: 'completed', label: 'Done' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === option.value
                      ? 'bg-coral-500 text-white'
                      : 'text-ink-soft hover:bg-coral-50'
                  }`}
                  aria-pressed={statusFilter === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <ViewToggle value={view} onChange={setView} />

            {isFiltering ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            ) : null}
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            <span className="mr-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
              Tags
            </span>
            {tags.map((tag) => {
              const selected = tagFilter.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTagFilter(tag.id)}
                  className={`rounded-full transition ${
                    selected ? 'ring-2 ring-ink/25' : 'opacity-65 hover:opacity-100'
                  }`}
                  aria-pressed={selected}
                >
                  <TagPill name={tag.name} color={tag.color} />
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {canEdit && !isFiltering && items.length > 1 ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-mint-500" /> Tip: drag the handle to reorder
          your days.
        </p>
      ) : null}
      {isFiltering ? (
        <p className="text-xs font-semibold text-ink-muted">
          Reordering is paused while filters are active.
        </p>
      ) : null}

      {itemsQuery.isLoading ? (
        <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
          {[0, 1, 2].map((index) => (
            <PlaceSkeleton key={index} />
          ))}
        </div>
      ) : itemsQuery.isError ? (
        <ErrorState
          title="Could not load places"
          message="Your plans are safe — we just could not fetch them. Try again in a moment."
          onRetry={() => void itemsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MapPin}
          tone="mint"
          title="No places yet"
          description="Add the first restaurant, viewpoint or lazy afternoon stop. Your trip starts taking shape here."
          action={
            canEdit ? (
              <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Add your first place
              </Button>
            ) : undefined
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Search}
          tone="sky"
          title="Nothing matches those filters"
          description="Try a different search or clear the filters to see every place again."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filteredItems.map((item) => item.id)}
            strategy={view === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
          >
            {view === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <SortablePlaceCard
                    key={item.id}
                    item={item}
                    imageUrls={imageUrls}
                    canEdit={canEdit}
                    isToggling={togglingId === item.id}
                    disabled={sortableDisabled}
                    onToggle={() => void handleToggle(item)}
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                    onOpenGallery={openGallery}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <SortablePlaceRow
                    key={item.id}
                    item={item}
                    imageUrls={imageUrls}
                    canEdit={canEdit}
                    isToggling={togglingId === item.id}
                    disabled={sortableDisabled}
                    onToggle={() => void handleToggle(item)}
                    onEdit={() => openEdit(item)}
                    onDelete={() => setDeleteTarget(item)}
                    onOpenGallery={openGallery}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}

      <PlaceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        tripId={tripId}
        item={editingItem}
        tags={tags}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        isLoading={deletePlace.isPending}
        title="Delete this place?"
        confirmLabel="Delete place"
        description={
          <>
            <strong>{deleteTarget?.name}</strong> and its photos will be removed from the trip. This
            cannot be undone.
          </>
        }
      />

      {lightbox ? (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((current) => (current ? { ...current, index } : current))}
        />
      ) : null}
    </section>
  )
}
