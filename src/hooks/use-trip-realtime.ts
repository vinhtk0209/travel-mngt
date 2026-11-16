import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

/**
 * Subscribes to trip-scoped Postgres changes and invalidates the matching
 * query-key subtree. Realtime is used as a signal; SQL remains the source of truth.
 */
export function useTripRealtime(tripId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return
    let isActive = true

    const invalidateTrip = () => {
      if (!isActive) return
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
      void queryClient.invalidateQueries({ queryKey: ['trips'] })
    }

    const invalidateItemTables = () => {
      if (!isActive) return
      void queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'items'] })
      void queryClient.invalidateQueries({ queryKey: ['trips'] })
    }

    const channel = supabase
      .channel(`trip-realtime:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_items', filter: `trip_id=eq.${tripId}` },
        invalidateTrip,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags', filter: `trip_id=eq.${tripId}` },
        invalidateTrip,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
        invalidateTrip,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_invitations',
          filter: `trip_id=eq.${tripId}`,
        },
        invalidateTrip,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        invalidateTrip,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_item_tags' },
        invalidateItemTables,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_item_images' },
        invalidateItemTables,
      )
      .subscribe()

    return () => {
      isActive = false
      void supabase.removeChannel(channel)
    }
  }, [tripId, queryClient])
}
