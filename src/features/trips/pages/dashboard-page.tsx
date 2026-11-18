import { Compass, Plus, Search, Sparkles, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/shared/app-shell'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { TripCardSkeleton } from '@/components/ui/skeleton'
import { TripAssistantDialog } from '@/features/assistant/components/trip-assistant-dialog'
import type { TripIdea } from '@/features/assistant/suggestions'
import { useProfile } from '@/features/auth/hooks'
import { useSignedImageUrls } from '@/features/images/hooks'
import { TripCard } from '../components/trip-card'
import { TripFormModal } from '../components/trip-form-modal'
import { useDashboardTrips } from '../hooks'
import type { TripFormValues } from '../schemas'

export function DashboardPage() {
  const { displayName } = useProfile()
  const tripsQuery = useDashboardTrips()
  const [createOpen, setCreateOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [createPrefill, setCreatePrefill] = useState<TripFormValues | null>(null)
  const [search, setSearch] = useState('')

  const data = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data])
  const coverPaths = useMemo(
    () => data.map((entry) => entry.trip.cover_image),
    [data],
  )
  const { urls: coverUrls } = useSignedImageUrls(coverPaths)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return data
    return data.filter(
      (entry) =>
        entry.trip.name.toLowerCase().includes(query) ||
        entry.trip.destination.toLowerCase().includes(query),
    )
  }, [data, search])

  const ownedTrips = filtered.filter((entry) => entry.isOwner)
  const sharedTrips = filtered.filter((entry) => !entry.isOwner)
  const firstName = displayName.split(' ')[0]

  const handlePlanIdea = (idea: TripIdea) => {
    setAssistantOpen(false)
    setCreatePrefill({
      name: idea.name,
      destination: idea.destination,
      description: idea.description,
      startDate: '',
      endDate: '',
    })
    setCreateOpen(true)
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Ready when you are"
        title={
          <>
            Hi {firstName}, where to next?
          </>
        }
        description="Keep every trip, tiny idea and shared plan in one happy place."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setAssistantOpen(true)}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Trip ideas
            </Button>
            <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Plan a trip
            </Button>
          </div>
        }
      />

      {data.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a trip…"
              className="pl-10"
              aria-label="Search trips"
            />
          </div>
          <p className="text-sm font-semibold text-ink-muted">
            {data.length} {data.length === 1 ? 'trip' : 'trips'} in your orbit
          </p>
        </div>
      ) : null}

      {tripsQuery.isLoading ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <TripCardSkeleton key={index} />
          ))}
        </div>
      ) : tripsQuery.isError ? (
        <div className="mt-6">
          <ErrorState
            title="Could not load your trips"
            message="Check your connection and try again. Your adventures are safe."
            onRetry={() => void tripsQuery.refetch()}
          />
        </div>
      ) : data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Compass}
            tone="coral"
            title="Your first adventure is waiting"
            description="Create a trip, invite your favourite people and start collecting places you cannot wait to visit."
            action={
              <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Create your first trip
              </Button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Search}
            tone="sky"
            title="No trips match that search"
            description="Try another name or destination."
            action={
              <Button variant="secondary" onClick={() => setSearch('')}>
                Clear search
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {ownedTrips.length > 0 ? (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-2xl bg-coral-100 p-2 text-coral-500">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-extrabold">My trips</h2>
                  <p className="text-xs text-ink-muted">Trips you own and shape</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ownedTrips.map((entry) => (
                  <TripCard
                    key={entry.trip.id}
                    data={entry}
                    coverUrl={entry.trip.cover_image ? coverUrls[entry.trip.cover_image] : undefined}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {sharedTrips.length > 0 ? (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-2xl bg-lavender-100 p-2 text-lavender-500">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-extrabold">Shared with you</h2>
                  <p className="text-xs text-ink-muted">Trips where you are a travel buddy</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sharedTrips.map((entry) => (
                  <TripCard
                    key={entry.trip.id}
                    data={entry}
                    coverUrl={entry.trip.cover_image ? coverUrls[entry.trip.cover_image] : undefined}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <TripFormModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setCreatePrefill(null)
        }}
        initialValues={createPrefill ?? undefined}
      />
      <TripAssistantDialog
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onPlanTrip={handlePlanIdea}
      />
    </AppShell>
  )
}
