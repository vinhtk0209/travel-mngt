import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchProfile, updateProfile } from './api'
import { useAuth } from './auth-context'
import { translate } from '@/i18n/translate'

export function useProfile() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.profile(user?.id),
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  })

  const fallbackName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    translate('common.traveler')

  return {
    ...query,
    displayName: query.data?.display_name ?? fallbackName,
    email: query.data?.email ?? user?.email ?? '',
  }
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (displayName: string) => {
      if (!user) throw new Error(translate('errors.authRequired'))
      return updateProfile(user.id, { display_name: displayName })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id) })
      void queryClient.invalidateQueries({ queryKey: ['trip'] })
      void queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
