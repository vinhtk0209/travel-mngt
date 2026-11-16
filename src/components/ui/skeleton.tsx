import { cn } from '@/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-coral-100/60', className)} />
}

export function TripCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2.5 w-full" />
      </div>
    </div>
  )
}

export function PlaceSkeleton() {
  return (
    <div className="surface-card flex gap-4 p-4">
      <Skeleton className="h-20 w-20 shrink-0" />
      <div className="flex-1 space-y-3 py-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
