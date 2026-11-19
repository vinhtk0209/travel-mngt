import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssistantMode } from '@/lib/supabase/database.types'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/features/auth/auth-context'
import { translate } from '@/i18n/translate'
import {
  askTripAssistant,
  fetchAssistantPreference,
  saveAssistantPreference,
  updateTripAssistantMode,
  type AssistantTurn,
} from './api'

export function useAssistantPreference(tripId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.tripAssistantPreference(tripId),
    queryFn: () => fetchAssistantPreference(tripId!, user!.id),
    enabled: Boolean(tripId && user),
    staleTime: 60_000,
  })
}

export function useSetAssistantPreference(tripId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mode: AssistantMode) => {
      if (!tripId || !user) throw new Error(translate('errors.authRequired'))
      return saveAssistantPreference(tripId, user.id, mode)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tripAssistantPreference(tripId),
      })
    },
  })
}

export function useSetTripAssistantMode(tripId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mode: AssistantMode) => {
      if (!tripId) throw new Error(translate('trips.errors.tripMissing'))
      return updateTripAssistantMode(tripId, mode)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
      void queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useAskTripAssistant(tripId: string | undefined) {
  return useMutation({
    mutationFn: (turns: AssistantTurn[]) => {
      if (!tripId) throw new Error(translate('trips.errors.tripMissing'))
      return askTripAssistant({ tripId, turns })
    },
  })
}
