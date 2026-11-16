import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/utils/cn'
import { DragHandle, PlaceCard, PlaceListRow, type PlaceViewProps } from './place-views'

type SortableProps = PlaceViewProps & {
  disabled: boolean
}

function usePlaceSortable(id: string, disabled: boolean) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  return {
    setNodeRef,
    transform,
    transition,
    isDragging,
    dragHandle: (
      <DragHandle
        setActivatorNodeRef={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
        className={isDragging ? 'bg-cream' : undefined}
      />
    ),
  }
}

export function SortablePlaceRow({ disabled, ...props }: SortableProps) {
  const sortable = usePlaceSortable(props.item.id, disabled)

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn(sortable.isDragging && 'relative z-20 opacity-90 shadow-lift')}
    >
      <PlaceListRow {...props} dragHandle={disabled ? undefined : sortable.dragHandle} />
    </div>
  )
}

export function SortablePlaceCard({ disabled, ...props }: SortableProps) {
  const sortable = usePlaceSortable(props.item.id, disabled)

  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={cn('h-full', sortable.isDragging && 'relative z-20 opacity-90')}
    >
      <PlaceCard {...props} dragHandle={disabled ? undefined : sortable.dragHandle} />
    </div>
  )
}
