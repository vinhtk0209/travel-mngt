import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/features/auth/auth-context'
import { translate } from '@/i18n/translate'
import {
  deleteAvatarObject,
  getSignedAvatarUrls,
  removeAvatar,
  uploadAvatar,
} from './api'

const SIGNED_URL_STALE_TIME = 50 * 60 * 1000

export function useAvatarUrls(paths: (string | null | undefined)[]) {
  const uniquePaths = useMemo(
    () =>
      Array.from(
        new Set(
          paths.filter(
            (path): path is string => Boolean(path) && !/^https?:\/\//i.test(path as string),
          ),
        ),
      ).sort(),
    [paths],
  )

  const query = useQuery({
    queryKey: queryKeys.avatarUrls(uniquePaths),
    queryFn: () => getSignedAvatarUrls(uniquePaths),
    enabled: uniquePaths.length > 0,
    staleTime: SIGNED_URL_STALE_TIME,
    gcTime: SIGNED_URL_STALE_TIME + 5 * 60 * 1000,
  })

  return query.data ?? {}
}

function useInvalidateAvatars() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id) })
    void queryClient.invalidateQueries({ queryKey: ['avatar-urls'] })
    void queryClient.invalidateQueries({ queryKey: ['trips'] })
    void queryClient.invalidateQueries({ queryKey: ['trip'] })
  }
}

export function useUploadAvatar() {
  const { user } = useAuth()
  const invalidate = useInvalidateAvatars()

  return useMutation({
    mutationFn: async (input: { file: File; previousPath?: string | null }) => {
      if (!user) throw new Error(translate('errors.authRequired'))
      const path = await uploadAvatar(user.id, input.file)
      if (input.previousPath && input.previousPath !== path) {
        void deleteAvatarObject(input.previousPath)
      }
      return path
    },
    onSuccess: () => invalidate(),
  })
}

export function useRemoveAvatar() {
  const { user } = useAuth()
  const invalidate = useInvalidateAvatars()

  return useMutation({
    mutationFn: (path: string | null | undefined) => {
      if (!user) throw new Error(translate('errors.authRequired'))
      return removeAvatar(user.id, path)
    },
    onSuccess: () => invalidate(),
  })
}
